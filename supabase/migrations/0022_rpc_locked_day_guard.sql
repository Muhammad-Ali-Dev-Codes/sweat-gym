-- Migration 0022 (Phase 11): Reject completions bound to locked plan days
--
-- Closes the final plan-skip vector surfaced by the Phase 11 audit: the
-- completion RPC advanced ANY non-completed plan day referenced by a
-- session, including days still in 'locked' status. No legitimate flow can
-- create an in-progress session for a locked day:
--   - startWorkout unlocks/heals the day (or rejects) BEFORE creating a
--     session,
--   - the offline /api/sync endpoint now validates that the referenced day
--     exists for the caller and is not locked before persisting anything.
-- Therefore a locked-day completion attempt is always hostile or corrupt,
-- and must fail closed.

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
  -- Notification preferences default to enabled; a missing row keeps them.
  v_allow_progress BOOLEAN := TRUE;
  v_allow_streaks BOOLEAN := TRUE;
  v_completed INT := 0;
  v_total INT := 0;
  v_percent INT;
BEGIN
  -- Fail closed: anonymous callers have auth.uid() = NULL; they must never
  -- pass this check.
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

  -- Ownership check. IS DISTINCT FROM also fails closed when either side
  -- is NULL (defense in depth alongside the anonymous check above).
  IF v_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('error', 'forbidden');
  END IF;

  -- Idempotent: already-completed sessions return the current state.
  IF v_prev_status = 'completed' THEN
    RETURN json_build_object(
      'already_completed', TRUE,
      'plan_day_completed', FALSE,
      'next_day_unlocked', FALSE,
      'plan_completed', FALSE,
      'current_streak', calculate_current_streak_local(v_user_id, v_tz)
    );
  END IF;

  -- Plan-sequence guard: a session may never advance a LOCKED plan day.
  -- Legitimate flows cannot reach this state (startWorkout gates day
  -- availability before session creation; /api/sync re-validates at
  -- delivery time), so failing closed here blocks crafted skip-ahead
  -- payloads without affecting real workouts.
  IF v_plan_day_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM user_plan_days
      WHERE id = v_plan_day_id AND status = 'locked'
    ) THEN
      RETURN json_build_object('error', 'plan_day_locked');
    END IF;
  END IF;

  v_local_today := (now() AT TIME ZONE v_tz)::DATE;

  -- Preferences (no row found => variables keep their TRUE defaults).
  SELECT COALESCE(progress_updates, TRUE), COALESCE(streak_reminders, TRUE)
  INTO v_allow_progress, v_allow_streaks
  FROM notification_preferences
  WHERE user_id = v_user_id;

  -- 1. Complete the session.
  UPDATE workout_sessions
  SET status = 'completed',
      completed_at = now(),
      duration_seconds = GREATEST(COALESCE(p_duration_seconds, 0), 1),
      estimated_calories = GREATEST(COALESCE(p_estimated_calories, 0), 0),
      updated_at = now()
  WHERE id = p_session_id;

  -- 2–4. Plan progression.
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

      SELECT COUNT(*) FILTER (WHERE status = 'completed'),
             COUNT(*)
      INTO v_completed, v_total
      FROM user_plan_days
      WHERE user_plan_id = v_user_plan_id;

      IF v_total > 0 AND v_completed >= v_total THEN
        UPDATE user_plans
        SET status = 'completed', updated_at = now()
        WHERE id = v_user_plan_id;
        v_plan_completed := TRUE;
      END IF;

      -- Plan milestone notification at 25 / 50 / 75 % (deduped per plan+value).
      IF v_allow_progress AND v_total > 0 THEN
        v_percent := FLOOR((v_completed::NUMERIC / v_total) * 100)::INT;
        IF v_percent IN (25, 50, 75) THEN
          INSERT INTO notifications (user_id, type, title, body, link, dedupe_key)
          VALUES (
            v_user_id,
            'plan_progress',
            'Plan ' || v_percent || '% complete',
            format(
              'You have finished %s of %s days. %s days stand between you and the finish line.',
              v_completed, v_total, v_total - v_completed
            ),
            '/plan',
            'plan_progress:' || v_user_plan_id::TEXT || ':' || v_percent::TEXT
          )
          ON CONFLICT (user_id, type, dedupe_key) DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  v_streak := calculate_current_streak_local(v_user_id, v_tz);

  -- 5. Workout completed notification (idempotent per session).
  IF v_allow_progress THEN
    INSERT INTO notifications (user_id, type, title, body, link, dedupe_key)
    VALUES (
      v_user_id,
      'workout_completed',
      'Workout complete',
      format(
        '%s minutes and %s kcal logged. Keep the momentum going.',
        GREATEST(COALESCE(p_duration_seconds, 0) / 60, 1),
        COALESCE(p_estimated_calories, 0)
      ),
      '/reports',
      'workout_completed:' || p_session_id::TEXT
    )
    ON CONFLICT (user_id, type, dedupe_key) DO NOTHING;
  END IF;

  -- 6. Streak milestone notification (once per milestone value).
  IF v_streak IN (3, 7, 14, 21, 30, 50, 100) AND v_allow_streaks THEN
    INSERT INTO notifications (user_id, type, title, body, link, dedupe_key)
    VALUES (
      v_user_id,
      'streak_milestone',
      v_streak || '-day streak',
      format('You trained %s days in a row. Consistency is paying off.', v_streak),
      '/reports',
      'streak_milestone:' || v_streak::TEXT
    )
    ON CONFLICT (user_id, type, dedupe_key) DO NOTHING;
  END IF;

  -- 7. Plan completed celebration (deduped per plan).
  IF v_plan_completed AND v_allow_progress AND v_user_plan_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link, dedupe_key)
    VALUES (
      v_user_id,
      'plan_progress',
      'Plan crushed!',
      'Every day of your training plan is complete. Time to pick your next challenge.',
      '/plan',
      'plan_progress:' || v_user_plan_id::TEXT || ':100'
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

COMMENT ON FUNCTION complete_workout_session_rpc IS 'Authoritative idempotent workout completion. Fails closed for anonymous callers, foreign owners, and sessions bound to locked plan days.';
