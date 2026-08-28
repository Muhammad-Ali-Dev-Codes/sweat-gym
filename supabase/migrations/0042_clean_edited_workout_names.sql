-- 0042: Edited plan workouts should use the normal workout display name.

UPDATE workouts
SET name = regexp_replace(name, '\s+\(Edited\)$', '')
WHERE owner_user_id IS NOT NULL
  AND slug LIKE 'edited-%'
  AND name ~ '\s+\(Edited\)$';

CREATE OR REPLACE FUNCTION save_user_plan_day_workout(
  p_plan_day_id UUID,
  p_exercises JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_row RECORD;
  source_workout RECORD;
  cloned_workout_id UUID;
  exercise_row JSONB;
  exercise_count INT;
  position INT := 0;
  total_seconds INT := 0;
BEGIN
  SELECT d.id, d.status, d.workout_id, p.user_id INTO day_row
  FROM user_plan_days d JOIN user_plans p ON p.id = d.user_plan_id
  WHERE d.id = p_plan_day_id AND p.user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan day not found'; END IF;
  IF day_row.status NOT IN ('locked', 'available', 'completed') THEN RAISE EXCEPTION 'This plan day cannot be edited while a workout is in progress'; END IF;
  IF jsonb_typeof(p_exercises) <> 'array' THEN RAISE EXCEPTION 'Exercises must be an array'; END IF;
  exercise_count := jsonb_array_length(p_exercises);
  IF exercise_count < 1 OR exercise_count > 50 THEN RAISE EXCEPTION 'Invalid exercise count'; END IF;
  SELECT name, description INTO source_workout FROM workouts WHERE id = day_row.workout_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source workout not found'; END IF;

  FOR exercise_row IN SELECT value FROM jsonb_array_elements(p_exercises) LOOP
    IF NOT EXISTS (SELECT 1 FROM exercises WHERE id = (exercise_row->>'exerciseId')::UUID AND is_active = true) THEN RAISE EXCEPTION 'Exercise is not available'; END IF;
    IF COALESCE((exercise_row->>'sets')::INT, 0) < 1 OR COALESCE((exercise_row->>'restSeconds')::INT, -1) < 0 OR ((exercise_row->>'reps') IS NOT NULL AND (exercise_row->>'reps')::INT < 1) OR ((exercise_row->>'durationSeconds') IS NOT NULL AND (exercise_row->>'durationSeconds')::INT < 1) THEN RAISE EXCEPTION 'Invalid exercise prescription'; END IF;
    total_seconds := total_seconds + COALESCE((exercise_row->>'durationSeconds')::INT, 60) * (exercise_row->>'sets')::INT + (exercise_row->>'restSeconds')::INT * GREATEST(0, (exercise_row->>'sets')::INT - 1);
  END LOOP;

  INSERT INTO workouts (name, slug, description, duration_seconds, estimated_calories, is_active, owner_user_id)
  VALUES (regexp_replace(source_workout.name, '\s+\(Edited\)$', ''), 'edited-' || replace(p_plan_day_id::TEXT, '-', '') || '-' || substr(gen_random_uuid()::TEXT, 1, 8), source_workout.description, GREATEST(60, total_seconds), GREATEST(1, round(total_seconds / 60.0 * 8)), true, auth.uid())
  RETURNING id INTO cloned_workout_id;

  FOR exercise_row IN SELECT value FROM jsonb_array_elements(p_exercises) LOOP
    position := position + 1;
    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
    VALUES (cloned_workout_id, (exercise_row->>'exerciseId')::UUID, position, (exercise_row->>'sets')::INT, NULLIF(exercise_row->>'reps', '')::INT, NULLIF(exercise_row->>'durationSeconds', '')::INT, (exercise_row->>'restSeconds')::INT);
  END LOOP;
  UPDATE user_plan_days SET workout_id = cloned_workout_id, updated_at = now() WHERE id = p_plan_day_id;
  RETURN cloned_workout_id;
END;
$$;

REVOKE ALL ON FUNCTION save_user_plan_day_workout(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_user_plan_day_workout(UUID, JSONB) TO authenticated;