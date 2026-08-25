-- Migration 0001: Reference Tables
-- Creates all controlled vocabulary / lookup tables used across the domain.
-- Each table uses UUID PK, stable slug, human-readable name, and timestamps.

-- ============================================================
-- LEVELS
-- ============================================================
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE levels IS 'Fitness levels: beginner, intermediate, advanced.';

-- ============================================================
-- FOCUS AREAS
-- ============================================================
CREATE TABLE focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE focus_areas IS 'Body focus areas for exercise/workout categorization.';

-- ============================================================
-- WORKOUT CATEGORIES (Discover categories)
-- ============================================================
CREATE TABLE workout_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workout_categories IS 'Discover workout categories (Picks for You, Stretching, Fat Burning, Strength & Tone).';

-- ============================================================
-- EQUIPMENT
-- ============================================================
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE equipment IS 'Exercise equipment types (none, dumbbells, bench, mat, etc.).';

-- ============================================================
-- PHYSICAL RESTRICTIONS (user-selected)
-- ============================================================
CREATE TABLE physical_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE physical_restrictions IS 'User-selectable physical restriction types (low_impact, no_jumping).';

-- ============================================================
-- EXERCISE RESTRICTIONS (exercise-side safety tags)
-- ============================================================
CREATE TABLE exercise_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE exercise_restrictions IS 'Safety restriction tags applied to exercises (no_jumping, low_impact, knee_sensitive, etc.).';

-- ============================================================
-- MUSCLES
-- ============================================================
CREATE TABLE muscles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE muscles IS 'Muscle groups from ExerciseDB for granular filtering. Preserved for future use.';
