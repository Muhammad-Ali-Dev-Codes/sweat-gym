-- Migration 0012: Seed Reference Data
-- Idempotent INSERTs for all controlled vocabulary.
-- Uses ON CONFLICT DO NOTHING for safe re-runs.

-- ============================================================
-- LEVELS
-- ============================================================
INSERT INTO levels (name, slug) VALUES
  ('Beginner', 'beginner'),
  ('Intermediate', 'intermediate'),
  ('Advanced', 'advanced')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FOCUS AREAS
-- ============================================================
INSERT INTO focus_areas (name, slug, description) VALUES
  ('Full Body', 'full_body', 'Exercises targeting multiple muscle groups'),
  ('Abs', 'abs', 'Core and abdominal exercises'),
  ('Arm', 'arm', 'Biceps, triceps, and forearm exercises'),
  ('Chest', 'chest', 'Pectoral exercises'),
  ('Butt & Legs', 'butt_legs', 'Glutes, quadriceps, hamstrings, and calves')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- WORKOUT CATEGORIES (Discover)
-- ============================================================
INSERT INTO workout_categories (name, slug, description, display_order) VALUES
  ('Picks for You', 'picks_for_you', 'Recommended workouts based on your profile', 1),
  ('Stretching & Warmup', 'stretching_and_warmup', 'Flexibility and warm-up routines', 2),
  ('Fat Burning', 'fat_burning', 'High-intensity cardio workouts', 3),
  ('Strength & Tone', 'strength_and_tone', 'Resistance training for muscle definition', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- EQUIPMENT
-- ============================================================
INSERT INTO equipment (name, slug, description) VALUES
  ('None', 'none', 'No equipment required'),
  ('Dumbbells', 'dumbbells', 'Adjustable or fixed dumbbells'),
  ('Resistance Band', 'resistance_band', 'Elastic resistance bands'),
  ('Bench', 'bench', 'Weight bench or exercise bench'),
  ('Mat', 'mat', 'Yoga or exercise mat')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PHYSICAL RESTRICTIONS (user-selectable)
-- ============================================================
INSERT INTO physical_restrictions (name, slug, description) VALUES
  ('Low Impact', 'low_impact', 'Avoid high-impact jumping movements'),
  ('No Jumping', 'no_jumping', 'Avoid jumping exercises')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- EXERCISE RESTRICTIONS (exercise safety tags)
-- ============================================================
INSERT INTO exercise_restrictions (name, slug, description) VALUES
  ('No Jumping', 'no_jumping', 'Exercise involves no jumping'),
  ('Low Impact', 'low_impact', 'Exercise is low impact, suitable for sensitive joints'),
  ('Knee Sensitive', 'knee_sensitive', 'Avoid if user has knee issues'),
  ('Back Sensitive', 'back_sensitive', 'Avoid if user has back issues'),
  ('No Crunch', 'no_crunch', 'Does not involve crunch-style movements')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MUSCLES (from ExerciseDB taxonomy)
-- ============================================================
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
