-- 0031: Raise the uniform session rate — a full 60-minute session is now
-- worth 1,100 kcal (was 720). Re-prices every non-completed day of ACTIVE
-- plans and their composed blocks. Completed rows keep their history.
--
-- Pass 1 prices every block proportionally; pass 2 makes each day's final
-- block absorb any rounding drift so blocks sum EXACTLY to the day total.

UPDATE user_plan_days d
SET target_calories = 1100,
    updated_at = now()
FROM user_plans p
WHERE d.user_plan_id = p.id
  AND p.status = 'active'
  AND d.status IN ('available', 'locked', 'in_progress')
  AND d.target_calories <> 1100;

-- Pass 1: proportional price per block.
UPDATE user_plan_day_blocks b
SET calories = GREATEST(1, ROUND(b.duration_seconds * 1100.0 / 3600.0)::INT)
FROM user_plans p, user_plan_days d
WHERE d.id = b.user_plan_day_id
  AND p.id = d.user_plan_id
  AND p.status = 'active'
  AND d.status IN ('available', 'locked', 'in_progress');

-- Pass 2: final block closes the day exactly.
UPDATE user_plan_day_blocks b
SET calories = GREATEST(1, 1100 - COALESCE(s.earlier, 0))
FROM (
  SELECT d.id AS day_id,
         MAX(b.position) AS last_pos,
         SUM(b.calories) FILTER (WHERE b.position < mx.last) AS earlier
  FROM user_plan_days d
  JOIN user_plans p ON p.id = d.user_plan_id
  JOIN user_plan_day_blocks b ON b.user_plan_day_id = d.id
  CROSS JOIN LATERAL (
    SELECT MAX(b2.position) AS last FROM user_plan_day_blocks b2 WHERE b2.user_plan_day_id = d.id
  ) mx
  WHERE p.status = 'active'
    AND d.status IN ('available', 'locked', 'in_progress')
  GROUP BY d.id
) s
WHERE b.user_plan_day_id = s.day_id
  AND b.position = s.last_pos;
