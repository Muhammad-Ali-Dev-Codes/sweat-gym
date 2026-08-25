-- Migration 0020 (Phase 11): Security & data-integrity hardening
--
-- Fixes found in the Phase 11 audit:
--
-- QA-C1 (CRITICAL): migration 0018 re-created complete_workout_session_rpc
--   with the weak guard `IF v_user_id <> auth.uid()`. When the caller is
--   anonymous, auth.uid() is NULL and `NULL <> uuid` evaluates to NULL,
--   which plpgsql treats as false -- so the ownership check silently PASSED
--   for anonymous callers. Migration 0017 had already fixed this with an
--   explicit anonymous check plus IS DISTINCT FROM; 0020 re-applies that
--   hardening while preserving 0018's preference-aware notifications and
--   plan milestones.
--
-- QA-C2 (CRITICAL): legacy function complete_plan_day (migration 0010) is
--   SECURITY DEFINER with NO ownership check and no REVOKE anywhere.
--   Any caller could complete any user's plan day and unlock its successor
--   by supplying arbitrary UUIDs. It is superseded by
--   complete_workout_session_rpc and unreferenced by application code --
--   dropped here along with the other unused legacy helpers
--   calculate_current_streak (UTC-based, superseded by
--   calculate_current_streak_local) and calculate_bmi (BMI is derived
--   client-side; no caller exists).
--
-- QA-H6 (HIGH): user_plans had no uniqueness guarantee for the single
--   active plan per user; concurrent plan generation could insert two
--   'active' rows, after which .single() readers silently degrade to
--   "no plan". Deduplicated defensively, then enforced with a partial
--   unique index.
--
-- QA-M1 (MEDIUM): workout_sessions allowed multiple simultaneous
--   in_progress sessions per (user, workout); startWorkout's
--   check-then-insert race could strand duplicate open sessions.
--   Deduplicated defensively, then enforced with a partial unique index.

-- ============================================================
-- 1. Re-harden complete_workout_session_rpc (QA-C1)
-- ============================================================
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
  -- pass this check. (QA-C1 regression fix.)
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

COMMENT ON FUNCTION complete_workout_session_rpc IS 'Authoritative idempotent workout completion. Fails closed for anonymous callers (IS DISTINCT FROM ownership guard). Preference-aware notifications + plan milestones.';

-- Defense in depth: the completion RPC is only meaningful for authenticated
-- callers; remove the default PUBLIC/anon execute grant path.
REVOKE EXECUTE ON FUNCTION complete_workout_session_rpc(UUID, INT, INT, TEXT) FROM anon;

-- ============================================================
-- 2. Drop unsafe / unused legacy functions (QA-C2)
-- ============================================================
DROP FUNCTION IF EXISTS complete_plan_day(UUID, UUID);
DROP FUNCTION IF EXISTS calculate_current_streak(UUID);
DROP FUNCTION IF EXISTS calculate_bmi(NUMERIC, NUMERIC);

-- ============================================================
-- 3. One active plan per user (QA-H6)
-- ============================================================
-- Defensive cleanup first: if duplicates already exist, keep the newest
-- active plan and archive the rest so the index below cannot fail.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM user_plans
  WHERE status = 'active'
)
UPDATE user_plans p
SET status = 'archived', updated_at = now()
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_plans_one_active_per_user
  ON user_plans (user_id)
  WHERE status = 'active';

-- ============================================================
-- 4. One in-progress session per (user, workout) (QA-M1)
-- ============================================================
-- Defensive cleanup: keep the newest in_progress session per pair, close
-- older stragglers as abandoned so the index below cannot fail.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, workout_id
           ORDER BY started_at DESC, id DESC
         ) AS rn
  FROM workout_sessions
  WHERE status = 'in_progress'
)
UPDATE workout_sessions s
SET status = 'abandoned', updated_at = now()
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_workout_sessions_one_in_progress
  ON workout_sessions (user_id, workout_id)
  WHERE status = 'in_progress';
