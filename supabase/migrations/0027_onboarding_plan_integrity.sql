-- Migration 0027: Onboarding integrity + exact 3-plan enforcement
--
-- Product rules (TITAN):
--   * onboarding completion is persistent state, independent of plan existence
--   * exactly three plans exist: 4 kg/30 d · 8 kg/60 d · 12 kg/90 d
--   * a user has at most ONE active plan (idempotent creation)
--   * user_plans carry their own duration + loss metrics so every screen
--     (Dashboard / Plan / Reports / Workout) reads the same numbers.

-- ============================================================
-- 1. PROFILES: explicit completion timestamp
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.onboarding_completed_at IS
  'When onboarding was fully completed (profile + fitness data + active plan persisted).';

-- ============================================================
-- 2. USER PLANS: duration + planned-loss metrics
--    (single source for Dashboard / Plan / Reports displays)
-- ============================================================
ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS plan_duration_days INT NOT NULL DEFAULT 30
    CHECK (plan_duration_days IN (30, 60, 90)),
  ADD COLUMN IF NOT EXISTS planned_loss_kg NUMERIC NOT NULL DEFAULT 0
    CHECK (planned_loss_kg >= 0 AND planned_loss_kg <= 12),
  ADD COLUMN IF NOT EXISTS starting_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC;

COMMENT ON COLUMN user_plans.plan_duration_days IS
  'Exact plan length: one of the three supported tiers (30/60/90 days).';
COMMENT ON COLUMN user_plans.planned_loss_kg IS
  'Planned weight loss tier in kg: 0 (fitness goal), 4, 8, or 12. Hard max 12 kg.';
COMMENT ON COLUMN user_plans.starting_weight_kg IS
  'Weight recorded when the plan was created.';
COMMENT ON COLUMN user_plans.target_weight_kg IS
  'Target weight implied by the selected tier.';

-- Backfill duration from the actual number of day rows (legacy plans).
UPDATE user_plans p
SET plan_duration_days = CASE
  WHEN c.day_count >= 90 THEN 90
  WHEN c.day_count >= 60 THEN 60
  ELSE 30
END
FROM (
  SELECT user_plan_id, COUNT(*)::INT AS day_count
  FROM user_plan_days
  GROUP BY user_plan_id
) c
WHERE c.user_plan_id = p.id;

-- Backfill weights from the fitness profile where missing.
UPDATE user_plans p
SET starting_weight_kg = fp.start_weight,
    target_weight_kg = LEAST(fp.target_weight_kg, COALESCE(fp.start_weight, fp.target_weight_kg))
FROM (
  SELECT fp.user_id,
         fp.target_weight_kg,
         (SELECT we.weight_kg FROM weight_entries we
          WHERE we.user_id = fp.user_id
          ORDER BY we.recorded_at DESC
          LIMIT 1) AS start_weight
  FROM fitness_profiles fp
) fp
WHERE fp.user_id = p.user_id
  AND p.target_weight_kg IS NULL;

-- Clamp legacy targets to the hard 12 kg boundary.
UPDATE user_plans
SET planned_loss_kg = LEAST(
  GREATEST(COALESCE(starting_weight_kg - target_weight_kg, 0), 0), 12
)
WHERE planned_loss_kg = 0;

-- ============================================================
-- 3. AT MOST ONE ACTIVE PLAN PER USER (idempotency §28)
--    Deduplicate first: keep the newest active plan, archive strays.
-- ============================================================
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY started_at DESC, created_at DESC
         ) AS rn,
         user_id
  FROM user_plans
  WHERE status = 'active'
)
UPDATE user_plans
SET status = 'archived', updated_at = now()
FROM ranked
WHERE user_plans.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_plans_single_active
  ON user_plans (user_id)
  WHERE status = 'active';

-- ============================================================
-- 4. LEGACY REPAIR: users whose onboarding actually finished but whose
--    completion flag never landed (partial historic failures). Anyone with a
--    fitness profile completed onboarding — without it the profile cannot
--    exist. This un-sticks the login → onboarding → login loop.
-- ============================================================
UPDATE profiles pr
SET onboarding_completed = TRUE,
    onboarding_completed_at = COALESCE(pr.onboarding_completed_at, fp.created_at),
    updated_at = now()
FROM fitness_profiles fp
WHERE fp.user_id = pr.user_id
  AND pr.onboarding_completed = FALSE;
