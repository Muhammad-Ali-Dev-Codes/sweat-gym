-- Migration 0006: User Plans
-- User-specific plan assignments with day-level progression tracking.

-- ============================================================
-- USER PLANS
-- ============================================================
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_plans IS 'A user''s assigned plan instance, forked from a plan_template.';

CREATE INDEX idx_user_plans_user_id ON user_plans (user_id);
CREATE INDEX idx_user_plans_user_status ON user_plans (user_id, status);

-- ============================================================
-- USER PLAN DAYS
-- ============================================================
CREATE TABLE user_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plan_id UUID NOT NULL REFERENCES user_plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE RESTRICT,
  target_duration_seconds INT NOT NULL CHECK (target_duration_seconds > 0),
  target_calories INT NOT NULL CHECK (target_calories > 0),
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_plan_id, day_number)
);

COMMENT ON TABLE user_plan_days IS 'Per-day state for a user plan. actual_activity_date is the real calendar date, distinct from day_number.';

CREATE INDEX idx_user_plan_days_plan ON user_plan_days (user_plan_id);
CREATE INDEX idx_user_plan_days_plan_day ON user_plan_days (user_plan_id, day_number);
CREATE INDEX idx_user_plan_days_status ON user_plan_days (user_plan_id, status);
