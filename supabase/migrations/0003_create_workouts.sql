-- Migration 0003: Workout Tables
-- Fixed workout collections composed of exercises with per-exercise prescriptions.

-- ============================================================
-- WORKOUTS
-- ============================================================
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
  estimated_calories INT NOT NULL CHECK (estimated_calories > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workouts IS 'Fixed workout collections. Reusable across plans and Discover.';

CREATE INDEX idx_workouts_slug ON workouts (slug);
CREATE INDEX idx_workouts_active ON workouts (is_active) WHERE is_active = true;

-- ============================================================
-- WORKOUT EXERCISES (ordered exercise list with prescriptions)
-- ============================================================
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  exercise_order INT NOT NULL CHECK (exercise_order > 0),
  sets INT NOT NULL CHECK (sets > 0),
  reps INT CHECK (reps > 0),
  duration_seconds INT CHECK (duration_seconds > 0),
  rest_seconds INT NOT NULL DEFAULT 0 CHECK (rest_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workout_id, exercise_order)
);

COMMENT ON TABLE workout_exercises IS 'Exercises within a workout. Sets/reps/duration are non-nullable in application logic (CHECK enforced at app level for complex conditions).';

CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises (exercise_id);

-- ============================================================
-- WORKOUT ↔ CATEGORIES (many-to-many)
-- ============================================================
CREATE TABLE workout_category_map (
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES workout_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workout_id, category_id)
);

CREATE INDEX idx_workout_category_map_category ON workout_category_map (category_id);

-- ============================================================
-- WORKOUT ↔ FOCUS AREAS (many-to-many)
-- ============================================================
CREATE TABLE workout_focus_areas (
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  focus_area_id UUID NOT NULL REFERENCES focus_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workout_id, focus_area_id)
);

CREATE INDEX idx_workout_focus_areas_focus ON workout_focus_areas (focus_area_id);

-- ============================================================
-- WORKOUT ↔ LEVELS (many-to-many)
-- ============================================================
CREATE TABLE workout_levels (
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workout_id, level_id)
);

CREATE INDEX idx_workout_levels_level ON workout_levels (level_id);
