-- ============================================================
-- SEED DATA (Idempotent)
-- ============================================================
-- This file is the canonical seed script. Safe to re-run.
-- Reference data is in migration 0012. This file adds
-- workout templates and plan templates for development/testing.

-- ============================================================
-- Ensure reference data exists (mirror of migration 0012)
-- ============================================================
INSERT INTO levels (name, slug) VALUES
  ('Beginner', 'beginner'),
  ('Intermediate', 'intermediate'),
  ('Advanced', 'advanced')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO focus_areas (name, slug, description) VALUES
  ('Full Body', 'full_body', 'Exercises targeting multiple muscle groups'),
  ('Abs', 'abs', 'Core and abdominal exercises'),
  ('Arm', 'arm', 'Biceps, triceps, and forearm exercises'),
  ('Chest', 'chest', 'Pectoral exercises'),
  ('Butt & Legs', 'butt_legs', 'Glutes, quadriceps, hamstrings, and calves')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workout_categories (name, slug, description, display_order) VALUES
  ('Picks for You', 'picks_for_you', 'Recommended workouts based on your profile', 1),
  ('Stretching & Warmup', 'stretching_and_warmup', 'Flexibility and warm-up routines', 2),
  ('Fat Burning', 'fat_burning', 'High-intensity cardio workouts', 3),
  ('Strength & Tone', 'strength_and_tone', 'Resistance training for muscle definition', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO equipment (name, slug, description) VALUES
  ('None', 'none', 'No equipment required'),
  ('Dumbbells', 'dumbbells', 'Adjustable or fixed dumbbells'),
  ('Resistance Band', 'resistance_band', 'Elastic resistance bands'),
  ('Bench', 'bench', 'Weight bench or exercise bench'),
  ('Mat', 'mat', 'Yoga or exercise mat')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO physical_restrictions (name, slug, description) VALUES
  ('Low Impact', 'low_impact', 'Avoid high-impact jumping movements'),
  ('No Jumping', 'no_jumping', 'Avoid jumping exercises')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercise_restrictions (name, slug, description) VALUES
  ('No Jumping', 'no_jumping', 'Exercise involves no jumping'),
  ('Low Impact', 'low_impact', 'Exercise is low impact, suitable for sensitive joints'),
  ('Knee Sensitive', 'knee_sensitive', 'Avoid if user has knee issues'),
  ('Back Sensitive', 'back_sensitive', 'Avoid if user has back issues'),
  ('No Crunch', 'no_crunch', 'Does not involve crunch-style movements')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO muscles (name, slug) VALUES
  ('Biceps', 'biceps'),
  ('Triceps', 'triceps'),
  ('Deltoids', 'deltoids'),
  ('Chest', 'chest'),
  ('Latissimus Dorsi', 'latissimus_dorsi'),
  ('Trapezius', 'trapezius'),
  ('Abdominals', 'abdominals'),
  ('Obliques', 'obliques'),
  ('Glutes', 'glutes'),
  ('Quadriceps', 'quadriceps'),
  ('Hamstrings', 'hamstrings'),
  ('Calves', 'calves'),
  ('Forearms', 'forearms'),
  ('Hip Flexors', 'hip_flexors'),
  ('Adductors', 'adductors'),
  ('Abductors', 'abductors')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED EXERCISES (Development/testing only)
-- Real data comes from ExerciseDB import.
-- ============================================================
INSERT INTO exercises (name, description, exercise_mode, is_low_impact, requires_jumping, instructions) VALUES
  ('Bodyweight Squat', 'Standard squat using body weight', 'reps', true, false, ARRAY['Stand with feet shoulder-width apart', 'Lower hips back and down as if sitting in a chair', 'Keep chest up and knees over toes', 'Push through heels to return to standing']),
  ('Push-Up', 'Classic chest and arm exercise', 'reps', true, false, ARRAY['Start in plank position with hands shoulder-width apart', 'Lower body until chest nearly touches floor', 'Push back up to starting position', 'Keep core engaged throughout']),
  ('Lunges', 'Alternating forward lunges', 'reps', true, false, ARRAY['Stand with feet hip-width apart', 'Step forward with one leg', 'Lower hips until both knees are bent at 90 degrees', 'Push back to starting position and switch legs']),
  ('Plank', 'Core stability hold', 'duration', true, false, ARRAY['Start in forearm plank position', 'Keep body in a straight line from head to heels', 'Engage core and hold position', 'Breathe steadily']),
  ('Jumping Jacks', 'Cardio warm-up exercise', 'duration', false, true, ARRAY['Stand with feet together and arms at sides', 'Jump while spreading feet and raising arms overhead', 'Jump back to starting position', 'Repeat at a steady pace'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED WORKOUTS
-- ============================================================
-- We use a DO block to only insert if the workouts don't already exist.
DO $$
BEGIN
  -- Workout 1: Full Body Beginner
  IF NOT EXISTS (SELECT 1 FROM workouts WHERE slug = 'full_body_beginner') THEN
    INSERT INTO workouts (id, name, slug, description, duration_seconds, estimated_calories)
    VALUES (gen_random_uuid(), 'Full Body Beginner', 'full_body_beginner', 'A gentle full body workout for beginners', 1200, 150);

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
    SELECT w.id, e.id, 1, 3, 12, NULL, 60
    FROM workouts w, exercises e WHERE w.slug = 'full_body_beginner' AND e.name = 'Bodyweight Squat';

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
    SELECT w.id, e.id, 2, 3, 10, NULL, 60
    FROM workouts w, exercises e WHERE w.slug = 'full_body_beginner' AND e.name = 'Push-Up';

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
    SELECT w.id, e.id, 3, 3, NULL, 45, 60
    FROM workouts w, exercises e WHERE w.slug = 'full_body_beginner' AND e.name = 'Plank';
  END IF;

  -- Workout 2: Cardio Blast
  IF NOT EXISTS (SELECT 1 FROM workouts WHERE slug = 'cardio_blast') THEN
    INSERT INTO workouts (id, name, slug, description, duration_seconds, estimated_calories)
    VALUES (gen_random_uuid(), 'Cardio Blast', 'cardio_blast', 'High-energy cardio session', 900, 200);

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
    SELECT w.id, e.id, 1, 3, NULL, 60, 30
    FROM workouts w, exercises e WHERE w.slug = 'cardio_blast' AND e.name = 'Jumping Jacks';

    INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
    SELECT w.id, e.id, 2, 3, 15, NULL, 30
    FROM workouts w, exercises e WHERE w.slug = 'cardio_blast' AND e.name = 'Lunges';
  END IF;
END $$;

-- ============================================================
-- SEED PLAN TEMPLATES
-- ============================================================
DO $$
DECLARE
  v_beginner_id UUID;
  v_intermediate_id UUID;
  v_advanced_id UUID;
  v_day INT;
  v_workout_id UUID;
BEGIN
  -- Get level IDs
  SELECT id INTO v_beginner_id FROM levels WHERE slug = 'beginner';
  SELECT id INTO v_intermediate_id FROM levels WHERE slug = 'intermediate';
  SELECT id INTO v_advanced_id FROM levels WHERE slug = 'advanced';

  -- Get workout IDs
  SELECT id INTO v_workout_id FROM workouts WHERE slug = 'full_body_beginner';

  -- Beginner plan (30 days)
  IF NOT EXISTS (SELECT 1 FROM plan_templates WHERE fitness_level_id = v_beginner_id) THEN
    INSERT INTO plan_templates (id, name, fitness_level_id, duration_days)
    VALUES (gen_random_uuid(), 'Beginner 30-Day Plan', v_beginner_id, 30)
    RETURNING id INTO v_beginner_id;

    FOR v_day IN 1..30 LOOP
      INSERT INTO plan_template_days (plan_template_id, day_number, workout_id, target_duration_seconds, target_calories)
      VALUES (v_beginner_id, v_day, v_workout_id, 1200, 150);
    END LOOP;
  END IF;

  -- Intermediate plan (30 days)
  IF NOT EXISTS (SELECT 1 FROM plan_templates WHERE fitness_level_id = v_intermediate_id) THEN
    INSERT INTO plan_templates (id, name, fitness_level_id, duration_days)
    VALUES (gen_random_uuid(), 'Intermediate 30-Day Plan', v_intermediate_id, 30)
    RETURNING id INTO v_intermediate_id;

    FOR v_day IN 1..30 LOOP
      INSERT INTO plan_template_days (plan_template_id, day_number, workout_id, target_duration_seconds, target_calories)
      VALUES (v_intermediate_id, v_day, v_workout_id, 1500, 200);
    END LOOP;
  END IF;

  -- Advanced plan (30 days)
  IF NOT EXISTS (SELECT 1 FROM plan_templates WHERE fitness_level_id = v_advanced_id) THEN
    INSERT INTO plan_templates (id, name, fitness_level_id, duration_days)
    VALUES (gen_random_uuid(), 'Advanced 30-Day Plan', v_advanced_id, 30)
    RETURNING id INTO v_advanced_id;

    FOR v_day IN 1..30 LOOP
      INSERT INTO plan_template_days (plan_template_id, day_number, workout_id, target_duration_seconds, target_calories)
      VALUES (v_advanced_id, v_day, v_workout_id, 1800, 250);
    END LOOP;
  END IF;
END $$;
