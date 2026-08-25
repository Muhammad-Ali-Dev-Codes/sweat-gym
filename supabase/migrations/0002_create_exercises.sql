-- Migration 0002: Exercise Tables
-- Master exercise library with media, taxonomy relationships, and safety tags.

-- ============================================================
-- EXERCISES
-- ============================================================
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source TEXT,
  external_exercise_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT[],
  animation_url TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  media_source TEXT DEFAULT 'exercisedb',
  exercise_mode TEXT NOT NULL CHECK (exercise_mode IN ('reps', 'duration', 'both')),
  is_low_impact BOOLEAN NOT NULL DEFAULT false,
  requires_jumping BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_source, external_exercise_id)
);

COMMENT ON TABLE exercises IS 'Master reusable exercise library. Media fields are replaceable.';

CREATE INDEX idx_exercises_external_id ON exercises (external_source, external_exercise_id);
CREATE INDEX idx_exercises_name ON exercises (name);
CREATE INDEX idx_exercises_active ON exercises (is_active) WHERE is_active = true;

-- ============================================================
-- EXERCISE ↔ FOCUS AREAS (many-to-many)
-- ============================================================
CREATE TABLE exercise_focus_areas (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  focus_area_id UUID NOT NULL REFERENCES focus_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, focus_area_id)
);

CREATE INDEX idx_exercise_focus_areas_focus ON exercise_focus_areas (focus_area_id);

-- ============================================================
-- EXERCISE ↔ LEVELS (many-to-many)
-- ============================================================
CREATE TABLE exercise_levels (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, level_id)
);

CREATE INDEX idx_exercise_levels_level ON exercise_levels (level_id);

-- ============================================================
-- EXERCISE ↔ EQUIPMENT (many-to-many)
-- ============================================================
CREATE TABLE exercise_equipment (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, equipment_id)
);

CREATE INDEX idx_exercise_equipment_equipment ON exercise_equipment (equipment_id);

-- ============================================================
-- EXERCISE ↔ EXERCISE RESTRICTIONS (many-to-many)
-- ============================================================
CREATE TABLE exercise_restriction_map (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  restriction_id UUID NOT NULL REFERENCES exercise_restrictions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, restriction_id)
);

CREATE INDEX idx_exercise_restriction_map_restriction ON exercise_restriction_map (restriction_id);

-- ============================================================
-- EXERCISE ↔ MUSCLES (many-to-many with primary flag)
-- ============================================================
CREATE TABLE exercise_muscles (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id UUID NOT NULL REFERENCES muscles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, muscle_id)
);

COMMENT ON TABLE exercise_muscles IS 'Preserves ExerciseDB muscle data. is_primary distinguishes target vs secondary muscles.';

CREATE INDEX idx_exercise_muscles_muscle ON exercise_muscles (muscle_id);
CREATE INDEX idx_exercise_muscles_primary ON exercise_muscles (exercise_id) WHERE is_primary = true;
