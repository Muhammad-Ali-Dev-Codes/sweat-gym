-- TITAN supports 30 / 60 / 90-day plans (§2). The 30-day template is tiled
-- by application code into 60/90-day user plans, so user_plan_days rows can
-- carry day_number up to 90. plan_template_days keeps its 1..30 constraint
-- (templates stay 30 days by design and are cycled, not extended).

ALTER TABLE user_plan_days
  DROP CONSTRAINT user_plan_days_day_number_check;

ALTER TABLE user_plan_days
  ADD CONSTRAINT user_plan_days_day_number_check
  CHECK (day_number BETWEEN 1 AND 90);

COMMENT ON CONSTRAINT user_plan_days_day_number_check ON user_plan_days IS
  'Plan length: 30 / 60 / 90 supported days (tiled from 30-day templates).';
