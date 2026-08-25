-- Seed: Intermediate and Advanced plan templates
-- Uses the same 8 workouts but with higher targets.

DO $$
DECLARE
  inter_id UUID := gen_random_uuid();
  adv_id UUID := gen_random_uuid();
  inter_level UUID;
  adv_level UUID;
  w_ids UUID[];
  w_durations INT[];
  w_calories INT[];
  w_count INT;
  i INT;
  wid UUID;
  dur INT;
  cal INT;
  dur_mult NUMERIC;
  cal_mult NUMERIC;
BEGIN
  SELECT id INTO inter_level FROM levels WHERE slug = 'intermediate';
  SELECT id INTO adv_level FROM levels WHERE slug = 'advanced';

  SELECT array_agg(w.id ORDER BY w.name),
         array_agg(w.duration_seconds ORDER BY w.name),
         array_agg(w.estimated_calories ORDER BY w.name)
  INTO w_ids, w_durations, w_calories
  FROM workouts w
  WHERE w.id IN (
    SELECT we.workout_id FROM workout_exercises we GROUP BY we.workout_id
  );

  w_count := array_length(w_ids, 1);

  -- Intermediate: 1.25x duration, 1.3x calories
  dur_mult := 1.25;
  cal_mult := 1.3;

  INSERT INTO plan_templates (id, name, fitness_level_id, duration_days, is_active)
  VALUES (inter_id, '30-Day Intermediate Plan', inter_level, 30, true);

  FOR i IN 1..30 LOOP
    wid := w_ids[((i - 1) % w_count) + 1];
    dur := CEIL(w_durations[((i - 1) % w_count) + 1] * dur_mult);
    cal := CEIL(w_calories[((i - 1) % w_count) + 1] * cal_mult);

    INSERT INTO plan_template_days (plan_template_id, day_number, workout_id, target_duration_seconds, target_calories)
    VALUES (inter_id, i, wid, dur, cal);
  END LOOP;

  -- Advanced: 1.5x duration, 1.6x calories
  dur_mult := 1.5;
  cal_mult := 1.6;

  INSERT INTO plan_templates (id, name, fitness_level_id, duration_days, is_active)
  VALUES (adv_id, '30-Day Advanced Plan', adv_level, 30, true);

  FOR i IN 1..30 LOOP
    wid := w_ids[((i - 1) % w_count) + 1];
    dur := CEIL(w_durations[((i - 1) % w_count) + 1] * dur_mult);
    cal := CEIL(w_calories[((i - 1) % w_count) + 1] * cal_mult);

    INSERT INTO plan_template_days (plan_template_id, day_number, workout_id, target_duration_seconds, target_calories)
    VALUES (adv_id, i, wid, dur, cal);
  END LOOP;
END $$;
