-- ============================================================
-- HIIT WORKOUT DURATION REPAIR
-- Align declared duration_seconds with actual player playback:
-- rest runs between sets only (no trailing rest), so
-- total = SUM(sets * work_s + (sets - 1) * rest_s).
-- ============================================================

UPDATE workouts SET duration_seconds = 600  WHERE slug = 'amrap-ignition';      -- 10:00
UPDATE workouts SET duration_seconds = 705  WHERE slug = 'fat-burn-express';    -- 11:45
UPDATE workouts SET duration_seconds = 780  WHERE slug = 'sweat-sprint-amrap';  -- 13:00
UPDATE workouts SET duration_seconds = 960  WHERE slug = 'metcon-mayhem';       -- 16:00
UPDATE workouts SET duration_seconds = 1020 WHERE slug = 'hiit-inferno';        -- 17:00
UPDATE workouts SET duration_seconds = 910  WHERE slug = 'tabata-torch';        -- 15:10
