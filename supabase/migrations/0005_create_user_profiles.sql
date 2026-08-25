-- Migration 0005: User Profiles & Personal Data
-- Links auth.users to application profiles, fitness data, and weight history.

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INT NOT NULL CHECK (age BETWEEN 10 AND 120),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profile linked to Supabase auth.users.';

CREATE INDEX idx_profiles_user_id ON profiles (user_id);

-- ============================================================
-- FITNESS PROFILES
-- ============================================================
CREATE TABLE fitness_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fitness_level TEXT NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  push_up_ability TEXT NOT NULL CHECK (push_up_ability IN ('unable', '0_5', '5_10', '10_20', '20_plus')),
  plank_ability TEXT NOT NULL CHECK (plank_ability IN ('unable', '0_30', '30_60', '60_120', '120_plus')),
  height_cm NUMERIC NOT NULL CHECK (height_cm > 0),
  target_weight_kg NUMERIC NOT NULL CHECK (target_weight_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE fitness_profiles IS 'Fitness assessment data collected during onboarding.';

CREATE INDEX idx_fitness_profiles_user_id ON fitness_profiles (user_id);

-- ============================================================
-- USER PHYSICAL RESTRICTIONS (many-to-many)
-- ============================================================
CREATE TABLE user_physical_restrictions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_id UUID NOT NULL REFERENCES physical_restrictions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, restriction_id)
);

COMMENT ON TABLE user_physical_restrictions IS 'User-selected physical restrictions from onboarding.';

-- ============================================================
-- WEIGHT ENTRIES
-- ============================================================
CREATE TABLE weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL CHECK (weight_kg > 0),
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE weight_entries IS 'Weight history. BMI derived from this + fitness_profiles.height_cm.';

CREATE INDEX idx_weight_entries_user_date ON weight_entries (user_id, recorded_at DESC);
