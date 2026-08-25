-- 0032: Level-based catalog calories for Discover/explore.
-- Beginner = 300 kcal · Intermediate = 400 kcal · Advanced = 500 kcal.
-- These are the catalog DISPLAY values; plan-day targets and session
-- burns keep using the uniform 60 min = 1,100 kcal session rate.

UPDATE workouts w
SET estimated_calories = CASE l.slug
      WHEN 'beginner' THEN 300
      WHEN 'intermediate' THEN 400
      WHEN 'advanced' THEN 500
      ELSE w.estimated_calories
    END,
    updated_at = now()
FROM workout_levels wl
JOIN levels l ON l.id = wl.level_id
WHERE wl.workout_id = w.id
  AND l.slug IN ('beginner', 'intermediate', 'advanced')
  AND w.estimated_calories <> CASE l.slug
      WHEN 'beginner' THEN 300
      WHEN 'intermediate' THEN 400
      WHEN 'advanced' THEN 500
      ELSE w.estimated_calories
    END;
