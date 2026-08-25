-- Migration 0004: Plan Templates
-- The three 30-day base plans (Beginner, Intermediate, Advanced).
-- Each plan has exactly 30 day rows mapping to workouts.

-- ============================================================
-- PLAN TEMPLATES
-- ============================================================
CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fitness_level_id UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
  duration_days INT NOT NULL DEFAULT 30 CHECK (duration_days = 30),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE plan_templates IS 'Base 30-day plan templates. One per fitness level.';

CREATE INDEX idx_plan_templates_level ON plan_templates (fitness_level_id);

-- ============================================================
-- PLAN TEMPLATE DAYS
-- ============================================================
CREATE TABLE plan_template_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE RESTRICT,
  target_duration_seconds INT NOT NULL CHECK (target_duration_seconds > 0),
  target_calories INT NOT NULL CHECK (target_calories > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_template_id, day_number)
);

COMMENT ON TABLE plan_template_days IS 'One row per day in a 30-day plan template. Each maps to exactly one workout.';

CREATE INDEX idx_plan_template_days_template ON plan_template_days (plan_template_id);
CREATE INDEX idx_plan_template_days_workout ON plan_template_days (workout_id);
