-- Seed: Plan Template + 30 Days
-- Uses only workouts that have exercises (excludes Full Body Beginner which has 0 exercises).

DO $$
DECLARE
  tmpl_id UUID := gen_random_uuid();
  lvl_id UUID;
  w_ids UUID[];
  w_durations INT[];
  w_calories INT[];
  w_count INT;
  i INT;
  wid UUID;
  dur INT;
  cal INT;
BEGIN
  SELECT id INTO lvl_id FROM levels WHERE slug = 'beginner';

  SELECT array_agg(w.id ORDER BY w.name),
         array_agg(w.duration_seconds ORDER BY w.name),
         array_agg(w.estimated_calories ORDER BY w.name)
  INTO w_ids, w_durations, w_calories
  FROM workouts w
  WHERE w.id IN (
    SELECT we.workout_id FROM workout_exercises we GROUP BY we.workout_id
  );

  w_count := array_length(w_ids, 1);

  INSERT INTO plan_templates (id, name, fitness_level_id, duration_days, is_active)
  VALUES (tmpl_id, '30-Day Beginner Plan', lvl_id, 30, true);

  FOR i IN 1..30 LOOP
    wid := w_ids[((i - 1) % w_count) + 1];
    dur := w_durations[((i - 1) % w_count) + 1];
    cal := w_calories[((i - 1) % w_count) + 1];

    INSERT INTO plan_template_days (plan_template_id, day_number, workout_id, target_duration_seconds, target_calories)
    VALUES (tmpl_id, i, wid, dur, cal);
  END LOOP;
END $$;
