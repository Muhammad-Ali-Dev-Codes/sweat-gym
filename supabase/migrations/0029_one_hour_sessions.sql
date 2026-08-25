-- 0029: Fixed one-hour daily sessions with a uniform burn rate.
--
-- Product rule change: every plan day is now a 60-minute session
-- (3,600 s) and calories follow the uniform rate of 1 kcal per 5 s
-- (= 720 kcal/day). Generation code enforces this for all new plans;
-- this migration converts non-completed day rows of ACTIVE plans so
-- existing users see the new session shape immediately.
--
-- Completed rows keep their historical planned values.

UPDATE user_plan_days d
SET target_duration_seconds = 3600,
    target_calories = 720,
    updated_at = now()
FROM user_plans p
WHERE d.user_plan_id = p.id
  AND p.status = 'active'
  AND d.status IN ('available', 'locked', 'in_progress')
  AND (d.target_duration_seconds <> 3600 OR d.target_calories <> 720);
