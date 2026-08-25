-- Migration 0017: Harden completion RPC ownership guard
-- v_user_id <> auth.uid() evaluates to NULL when the caller is anonymous
-- (auth.uid() is NULL), which silently PASSES plpgsql's IF check.
-- IS DISTINCT FROM makes anonymous and foreign callers both fail closed.

CREATE OR REPLACE FUNCTION complete_workout_session_rpc(
  p_session_id UUID,
  p_duration_seconds INT,
  p_estimated_calories INT,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_prev_status TEXT;
  v_plan_day_id UUID;
  v_tz TEXT;
  v_local_today DATE;
  v_day_number INT;
  v_user_plan_id UUID;
  v_plan_day_completed BOOLEAN := FALSE;
  v_next_day_unlocked BOOLEAN := FALSE;
  v_plan_completed BOOLEAN := FALSE;
  v_streak INT := 0;
BEGIN
  -- Fail closed: anonymous callers have auth.uid() = NULL; they must never
  -- pass this check. IS DISTINCT FROM handles the NULL case correctly.
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  BEGIN
    IF p_timezone IS NULL OR length(trim(p_timezone)) = 0 THEN
      RAISE EXCEPTION 'empty timezone';
    END IF;
    PERFORM now() AT TIME ZONE p_timezone;
    v_tz := p_timezone;
  EXCEPTION WHEN OTHERS THEN
    v_tz := 'UTC';
  END;

  SELECT user_id, status, user_plan_day_id
  INTO v_user_id, v_prev_status, v_plan_day_id
  FROM workout_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'session_not_found');
  END IF;

  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  IF v_prev_status = 'completed' THEN
    RETURN json_build_object(
      'already_completed', TRUE,
      'plan_day_completed', FALSE,
      'next_day_unlocked', FALSE,
      'plan_completed', FALSE,
      'current_streak', calculate_current_streak_local(v_user_id, v_tz)
    );
  END IF;

  v_local_today := (now() AT TIME ZONE v_tz)::DATE;

  UPDATE workout_sessions
  SET status = 'completed',
      completed_at = now(),
      duration_seconds = GREATEST(COALESCE(p_duration_seconds, 0), 1),
      estimated_calories = GREATEST(COALESCE(p_estimated_calories, 0), 0),
      updated_at = now()
  WHERE id = p_session_id;

  IF v_plan_day_id IS NOT NULL THEN
    UPDATE user_plan_days
    SET status = 'completed',
        completed_at = now(),
        actual_activity_date = v_local_today,
        updated_at = now()
    WHERE id = v_plan_day_id
      AND status <> 'completed';

    IF FOUND THEN
      v_plan_day_completed := TRUE;
    END IF;

    SELECT day_number, user_plan_id
    INTO v_day_number, v_user_plan_id
    FROM user_plan_days
    WHERE id = v_plan_day_id;

    IF v_user_plan_id IS NOT NULL THEN
      UPDATE user_plan_days
      SET status = 'available',
          unlocked_at = now(),
          updated_at = now()
      WHERE user_plan_id = v_user_plan_id
        AND day_number = v_day_number + 1
        AND status = 'locked';

      IF FOUND THEN
        v_next_day_unlocked := TRUE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM user_plan_days
        WHERE user_plan_id = v_user_plan_id
          AND status <> 'completed'
      ) THEN
        UPDATE user_plans
        SET status = 'completed', updated_at = now()
        WHERE id = v_user_plan_id;
        v_plan_completed := TRUE;
      END IF;
    END IF;
  END IF;

  v_streak := calculate_current_streak_local(v_user_id, v_tz);

  INSERT INTO notifications (user_id, type, title, body, dedupe_key)
  VALUES (
    v_user_id,
    'workout_completed',
    'Workout complete',
    format(
      '%s minutes and %s kcal logged. Keep the momentum going.',
      GREATEST(COALESCE(p_duration_seconds, 0) / 60, 1),
      COALESCE(p_estimated_calories, 0)
    ),
    'workout_completed:' || p_session_id::TEXT
  )
  ON CONFLICT (user_id, type, dedupe_key) DO NOTHING;

  IF v_streak IN (3, 7, 14, 21, 30, 50, 100) THEN
    INSERT INTO notifications (user_id, type, title, body, dedupe_key)
    VALUES (
      v_user_id,
      'streak_milestone',
      v_streak || '-day streak',
      format('You trained %s days in a row. Consistency is paying off.', v_streak),
      'streak_milestone:' || v_streak::TEXT
    )
    ON CONFLICT (user_id, type, dedupe_key) DO NOTHING;
  END IF;

  RETURN json_build_object(
    'already_completed', FALSE,
    'plan_day_completed', v_plan_day_completed,
    'next_day_unlocked', v_next_day_unlocked,
    'plan_completed', v_plan_completed,
    'current_streak', v_streak
  );
END;
$$;

COMMENT ON FUNCTION complete_workout_session_rpc IS 'Authoritative idempotent workout completion. Fails closed for anonymous callers (IS DISTINCT FROM ownership guard).';
