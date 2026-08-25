-- TITAN weight-loss product rules:
-- Supported plan durations (30 / 60 / 90 days) chosen during onboarding.
-- The planned-loss cap ((days / 30) x 4 kg) is validated in application code
-- (src/lib/weight-loss.ts) because the current weight lives in weight_entries
-- and cannot participate in a same-table CHECK constraint.

ALTER TABLE fitness_profiles
  ADD COLUMN plan_duration_days INT NOT NULL DEFAULT 30
  CHECK (plan_duration_days IN (30, 60, 90));

COMMENT ON COLUMN fitness_profiles.plan_duration_days IS
  'Supported plan durations: 30 / 60 / 90 days. Maximum planned loss: (days/30) x 4 kg.';
