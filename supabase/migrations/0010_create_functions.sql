-- Migration 0010: Database Functions
-- Atomic business logic functions for plan progression, streaks, and BMI.

-- ============================================================
-- FUNCTION: complete_plan_day
-- Marks a workout session + plan day as completed atomically.
-- Unlocks the next plan day if within bounds.
-- Idempotent: checks current status before mutating.
-- ============================================================
CREATE OR REPLACE FUNCTION complete_plan_day(
  p_user_plan_day_id UUID,
  p_session_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_user_plan_id UUID;
  v_day_number INT;
  v_next_day_number INT;
BEGIN
  -- Get current plan day status
  SELECT status, user_plan_id, day_number
  INTO v_current_status, v_user_plan_id, v_day_number
  FROM user_plan_days
  WHERE id = p_user_plan_day_id;

  -- Idempotent: bail if already completed
  IF v_current_status = 'completed' THEN
    RETURN;
  END IF;

  -- Mark session as completed
  UPDATE workout_sessions
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_session_id;

  -- Mark plan day as completed
  UPDATE user_plan_days
  SET status = 'completed',
      completed_at = now(),
      actual_activity_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_user_plan_day_id;

  -- Unlock next day (if within 30-day plan)
  v_next_day_number := v_day_number + 1;

  IF v_next_day_number <= 30 THEN
    UPDATE user_plan_days
    SET status = 'available',
        unlocked_at = now(),
        updated_at = now()
    WHERE user_plan_id = v_user_plan_id
      AND day_number = v_next_day_number
      AND status = 'locked';
  END IF;
END;
$$;

COMMENT ON FUNCTION complete_plan_day IS 'Atomically completes a plan day session and unlocks the next day. Idempotent.';

-- ============================================================
-- FUNCTION: calculate_current_streak
-- Counts consecutive days (including today) with at least one
-- completed workout session (plan or discover source).
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_current_streak(
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_streak INT := 0;
  v_check_date DATE := CURRENT_DATE;
  v_has_session BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM workout_sessions
      WHERE user_id = p_user_id
        AND status = 'completed'
        AND (CURRENT_DATE + ((completed_at AT TIME ZONE 'UTC')::DATE - CURRENT_DATE)) = v_check_date
    ) INTO v_has_session;

    EXIT WHEN NOT v_has_session;

    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;

  RETURN v_streak;
END;
$$;

COMMENT ON FUNCTION calculate_current_streak IS 'Counts consecutive workout days ending today. Uses completed_at converted to user-date.';

-- ============================================================
-- FUNCTION: calculate_bmi
-- Simple BMI calculation: weight_kg / (height_m)^2
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_bmi(
  p_weight_kg NUMERIC,
  p_height_cm NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN ROUND(p_weight_kg / POWER(p_height_cm / 100.0, 2), 1);
END;
$$;

COMMENT ON FUNCTION calculate_bmi IS 'Returns BMI rounded to 1 decimal place.';
