-- Migration 0016: Seed Workout Category Map
-- The workout_category_map table was empty, so goal-based personalization had
-- no signal. Maps each seeded workout to coherent categories (many-to-many).

INSERT INTO workout_category_map (workout_id, category_id)
SELECT w.id, c.id
FROM workouts w
JOIN workout_categories c ON TRUE
WHERE (w.name ILIKE '%warm up%' AND c.slug = 'stretching_and_warmup')
   OR (w.name ILIKE '%lose%fat%' AND c.slug = 'fat_burning')
   OR (
        w.name IN ('Beginner Abs Workout', 'Butt & Legs Sculpt', 'Dumbbell Arm Toning', 'Quick Chest Building')
        AND c.slug = 'strength_and_tone'
      )
   OR (
        w.name IN ('Beginner Full Body Blast', 'Full Body Beginner')
        AND c.slug IN ('fat_burning', 'strength_and_tone')
      )
ON CONFLICT DO NOTHING;
