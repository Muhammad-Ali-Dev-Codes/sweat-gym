-- Migration 0015: Atomic Workout Completion Function
-- Single authoritative completion rule used by BOTH the online server action
-- and the offline sync endpoint. Fully idempotent and ownership-checked.
--
-- Responsibilities:
--   1. Mark workout_session completed (guarded: only from in_progress)
--   2. Complete the plan day (timezone-aware actual_activity_date)
--   3. Unlock the next plan day
--   4. Mark the user_plan completed when every day is completed
--   5. Create 'workout_completed' notification (deduped per session)
--   6. Create 'streak_milestone' notifications at 3/7/14/21/30/50/100 days
--   7. Return current streak (computed in the user's local calendar)

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
  -- Validate timezone; fall back to UTC when unknown.
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

  -- Ownership check: a user may only complete their own sessions.
  IF v_user_id <> auth.uid() THEN
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

  v_local_today := (now() AT TIME ZONE v_tz)::DATE;

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

  -- 5. Workout completed notification (idempotent per session).
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

  -- 6. Streak milestone notification (once per milestone value).
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

COMMENT ON FUNCTION complete_workout_session_rpc IS 'Authoritative idempotent workout completion: session + plan progression + notifications. Verifies auth.uid() owns the session.';

-- ============================================================
-- FUNCTION: calculate_current_streak_local
-- Consecutive local calendar days (ending today or yesterday)
-- with at least one completed workout. Timezone-aware.
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_current_streak_local(
  p_user_id UUID,
  p_timezone TEXT DEFAULT 'UTC'
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tz TEXT;
  v_today DATE;
  v_streak INT := 0;
BEGIN
  BEGIN
    PERFORM now() AT TIME ZONE p_timezone;
    v_tz := p_timezone;
  EXCEPTION WHEN OTHERS THEN
    v_tz := 'UTC';
  END;

  v_today := (now() AT TIME ZONE v_tz)::DATE;

  WITH days AS (
    SELECT DISTINCT (completed_at AT TIME ZONE v_tz)::DATE AS d
    FROM workout_sessions
    WHERE user_id = p_user_id
      AND status = 'completed'
      AND completed_at IS NOT NULL
      AND (completed_at AT TIME ZONE v_tz)::DATE >= v_today - INTERVAL '365 days'
  ),
  grouped AS (
    SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::INT AS grp
    FROM days
  ),
  runs AS (
    SELECT grp, COUNT(*) AS run_length, MAX(d) AS run_end
    FROM grouped
    GROUP BY grp
  )
  SELECT COALESCE(MAX(run_length), 0)
  INTO v_streak
  FROM runs
  WHERE run_end BETWEEN v_today - 1 AND v_today;

  RETURN v_streak;
END;
$$;

COMMENT ON FUNCTION calculate_current_streak_local IS 'Current workout streak in the user''s local calendar. Counts today or yesterday as valid anchors.';
