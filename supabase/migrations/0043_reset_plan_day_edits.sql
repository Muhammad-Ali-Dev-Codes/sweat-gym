-- 0043: Reset a user's plan-day workout back to the original default.
-- The edit RPC (0040) clones the catalog workout and repoints user_plan_days.
-- The original default is preserved immutably in user_plan_day_blocks position 1,
-- so a reset can safely restore it without touching other users or catalog data.

CREATE OR REPLACE FUNCTION reset_plan_day_workout(
  p_plan_day_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  original_workout_id UUID;
  day_row RECORD;
  blocks_count INT;
BEGIN
  SELECT d.id, d.status, p.user_id
  INTO day_row
  FROM user_plan_days d
  JOIN user_plans p ON p.id = d.user_plan_id
  WHERE d.id = p_plan_day_id
    AND p.user_id = auth.uid();

  IF NOT FOUND THEN RAISE EXCEPTION 'Plan day not found'; END IF;
  IF day_row.status NOT IN ('locked', 'available') THEN
    RAISE EXCEPTION 'Only unopened plan days can be reset';
  END IF;

  SELECT count(*) INTO blocks_count
  FROM user_plan_day_blocks
  WHERE user_plan_day_id = p_plan_day_id;

  IF blocks_count = 0 THEN
    RAISE EXCEPTION 'No original workout recorded for this plan day';
  END IF;

  SELECT b.workout_id INTO original_workout_id
  FROM user_plan_day_blocks b
  WHERE b.user_plan_day_id = p_plan_day_id
  ORDER BY b.position
  LIMIT 1;

  IF original_workout_id IS NULL THEN
    RAISE EXCEPTION 'Original workout not found';
  END IF;

  UPDATE user_plan_days
  SET workout_id = original_workout_id, updated_at = now()
  WHERE id = p_plan_day_id;

  RETURN original_workout_id;
END;
$$;

REVOKE ALL ON FUNCTION reset_plan_day_workout(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_plan_day_workout(UUID) TO authenticated;
