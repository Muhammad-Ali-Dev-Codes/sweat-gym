-- ============================================================
-- TRUE HIIT / CARDIO AMRAP WORKOUTS
-- Timed work blocks + short rests; kcal per level rule
-- (beginner 300 / intermediate 400 / advanced 500).
-- Idempotent: safe to re-run.
-- ============================================================

-- AMRAP Ignition - 11:35, 300 kcal, beginner
INSERT INTO workouts (name, slug, description, duration_seconds, estimated_calories)
VALUES ('AMRAP Ignition', 'amrap-ignition', 'Beginner-friendly AMRAP circuit. Move through squats, push-ups and crawls at your pace, chasing rounds against the clock.', 695, 300)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workout_levels (workout_id, level_id)
SELECT w.id, l.id FROM workouts w, levels l WHERE w.slug='amrap-ignition' AND l.slug='beginner'
ON CONFLICT DO NOTHING;

INSERT INTO workout_category_map (workout_id, category_id)
SELECT m.workout_id, c.id FROM workout_categories c JOIN (SELECT id AS workout_id FROM workouts WHERE slug='amrap-ignition') m ON true
WHERE c.slug IN ('fat_burning', 'picks_for_you')
ON CONFLICT DO NOTHING;

INSERT INTO workout_focus_areas (workout_id, focus_area_id)
SELECT m.workout_id, f.id FROM focus_areas f JOIN (SELECT id AS workout_id FROM workouts WHERE slug='amrap-ignition') m ON true
WHERE f.slug IN ('full_body')
ON CONFLICT DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 1, 3, 30, 15 FROM workouts w, exercises e
WHERE w.slug='amrap-ignition' AND e.name='Jumping Jacks'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 2, 3, 40, 15 FROM workouts w, exercises e
WHERE w.slug='amrap-ignition' AND e.name='Bodyweight Squat'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 3, 2, 30, 20 FROM workouts w, exercises e
WHERE w.slug='amrap-ignition' AND e.name='Push-Up'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 4, 2, 30, 20 FROM workouts w, exercises e
WHERE w.slug='amrap-ignition' AND e.name='Bear Crawl'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 5, 2, 40, 15 FROM workouts w, exercises e
WHERE w.slug='amrap-ignition' AND e.name='Bicycle Crunch'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 6, 1, 30, 10 FROM workouts w, exercises e
WHERE w.slug='amrap-ignition' AND e.name='Flutter Kick'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 7, 1, 45, 0 FROM workouts w, exercises e
WHERE w.slug='amrap-ignition' AND e.name='Plank'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

-- Fat Burn Express - 13:30, 300 kcal, beginner
INSERT INTO workouts (name, slug, description, duration_seconds, estimated_calories)
VALUES ('Fat Burn Express', 'fat-burn-express', 'A no-jumping fat-burner. Steady timed intervals of shuffles, swings and bridges keep the heart rate up without the impact.', 810, 300)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workout_levels (workout_id, level_id)
SELECT w.id, l.id FROM workouts w, levels l WHERE w.slug='fat-burn-express' AND l.slug='beginner'
ON CONFLICT DO NOTHING;

INSERT INTO workout_category_map (workout_id, category_id)
SELECT m.workout_id, c.id FROM workout_categories c JOIN (SELECT id AS workout_id FROM workouts WHERE slug='fat-burn-express') m ON true
WHERE c.slug IN ('fat_burning')
ON CONFLICT DO NOTHING;

INSERT INTO workout_focus_areas (workout_id, focus_area_id)
SELECT m.workout_id, f.id FROM focus_areas f JOIN (SELECT id AS workout_id FROM workouts WHERE slug='fat-burn-express') m ON true
WHERE f.slug IN ('full_body', 'butt_legs')
ON CONFLICT DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 1, 3, 40, 15 FROM workouts w, exercises e
WHERE w.slug='fat-burn-express' AND e.name='Lateral Shuffle'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 2, 3, 40, 20 FROM workouts w, exercises e
WHERE w.slug='fat-burn-express' AND e.name='Kettlebell Swing'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 3, 2, 40, 15 FROM workouts w, exercises e
WHERE w.slug='fat-burn-express' AND e.name='Step Up'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 4, 2, 30, 20 FROM workouts w, exercises e
WHERE w.slug='fat-burn-express' AND e.name='Mountain Climber'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 5, 2, 40, 15 FROM workouts w, exercises e
WHERE w.slug='fat-burn-express' AND e.name='Glute Bridge'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 6, 2, 30, 20 FROM workouts w, exercises e
WHERE w.slug='fat-burn-express' AND e.name='Bear Crawl'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 7, 1, 45, 0 FROM workouts w, exercises e
WHERE w.slug='fat-burn-express' AND e.name='Wall Sit'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

-- Sweat Sprint AMRAP - 15:00, 400 kcal, intermediate
INSERT INTO workouts (name, slug, description, duration_seconds, estimated_calories)
VALUES ('Sweat Sprint AMRAP', 'sweat-sprint-amrap', 'Eight-station AMRAP sprint: jacks, thrusters, climbers and core work on the clock. Max rounds, minimal rest.', 900, 400)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workout_levels (workout_id, level_id)
SELECT w.id, l.id FROM workouts w, levels l WHERE w.slug='sweat-sprint-amrap' AND l.slug='intermediate'
ON CONFLICT DO NOTHING;

INSERT INTO workout_category_map (workout_id, category_id)
SELECT m.workout_id, c.id FROM workout_categories c JOIN (SELECT id AS workout_id FROM workouts WHERE slug='sweat-sprint-amrap') m ON true
WHERE c.slug IN ('fat_burning')
ON CONFLICT DO NOTHING;

INSERT INTO workout_focus_areas (workout_id, focus_area_id)
SELECT m.workout_id, f.id FROM focus_areas f JOIN (SELECT id AS workout_id FROM workouts WHERE slug='sweat-sprint-amrap') m ON true
WHERE f.slug IN ('full_body')
ON CONFLICT DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 1, 3, 45, 15 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='Jumping Jacks'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 2, 2, 40, 20 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='Push-Up'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 3, 2, 45, 15 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='Lateral Shuffle'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 4, 2, 40, 20 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='Dumbbell Thruster'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 5, 2, 40, 15 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='Mountain Climber'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 6, 2, 30, 15 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='V-Up'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 7, 2, 45, 20 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='Kettlebell Swing'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 8, 1, 30, 0 FROM workouts w, exercises e
WHERE w.slug='sweat-sprint-amrap' AND e.name='Hollow Body Hold'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

-- Metcon Mayhem - 17:45, 400 kcal, intermediate
INSERT INTO workouts (name, slug, description, duration_seconds, estimated_calories)
VALUES ('Metcon Mayhem', 'metcon-mayhem', 'Metabolic-conditioning chaos. Swings, thrusters and renegade rows strung together in timed blocks that torch calories.', 1065, 400)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workout_levels (workout_id, level_id)
SELECT w.id, l.id FROM workouts w, levels l WHERE w.slug='metcon-mayhem' AND l.slug='intermediate'
ON CONFLICT DO NOTHING;

INSERT INTO workout_category_map (workout_id, category_id)
SELECT m.workout_id, c.id FROM workout_categories c JOIN (SELECT id AS workout_id FROM workouts WHERE slug='metcon-mayhem') m ON true
WHERE c.slug IN ('fat_burning')
ON CONFLICT DO NOTHING;

INSERT INTO workout_focus_areas (workout_id, focus_area_id)
SELECT m.workout_id, f.id FROM focus_areas f JOIN (SELECT id AS workout_id FROM workouts WHERE slug='metcon-mayhem') m ON true
WHERE f.slug IN ('full_body')
ON CONFLICT DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 1, 4, 45, 15 FROM workouts w, exercises e
WHERE w.slug='metcon-mayhem' AND e.name='Kettlebell Swing'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 2, 3, 40, 20 FROM workouts w, exercises e
WHERE w.slug='metcon-mayhem' AND e.name='Dumbbell Thruster'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 3, 3, 40, 15 FROM workouts w, exercises e
WHERE w.slug='metcon-mayhem' AND e.name='Mountain Climber'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 4, 3, 40, 20 FROM workouts w, exercises e
WHERE w.slug='metcon-mayhem' AND e.name='Renegade Row'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 5, 2, 45, 15 FROM workouts w, exercises e
WHERE w.slug='metcon-mayhem' AND e.name='Jumping Jacks'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 6, 2, 40, 20 FROM workouts w, exercises e
WHERE w.slug='metcon-mayhem' AND e.name='Man Maker'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 7, 1, 60, 0 FROM workouts w, exercises e
WHERE w.slug='metcon-mayhem' AND e.name='Plank'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

-- HIIT Inferno - 18:40, 500 kcal, advanced
INSERT INTO workouts (name, slug, description, duration_seconds, estimated_calories)
VALUES ('HIIT Inferno', 'hiit-inferno', 'All-out high-intensity intervals. Burpees, sprawls and jump rope in relentless work blocks - the hardest cardio we ship.', 1120, 500)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workout_levels (workout_id, level_id)
SELECT w.id, l.id FROM workouts w, levels l WHERE w.slug='hiit-inferno' AND l.slug='advanced'
ON CONFLICT DO NOTHING;

INSERT INTO workout_category_map (workout_id, category_id)
SELECT m.workout_id, c.id FROM workout_categories c JOIN (SELECT id AS workout_id FROM workouts WHERE slug='hiit-inferno') m ON true
WHERE c.slug IN ('fat_burning')
ON CONFLICT DO NOTHING;

INSERT INTO workout_focus_areas (workout_id, focus_area_id)
SELECT m.workout_id, f.id FROM focus_areas f JOIN (SELECT id AS workout_id FROM workouts WHERE slug='hiit-inferno') m ON true
WHERE f.slug IN ('full_body')
ON CONFLICT DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 1, 4, 40, 15 FROM workouts w, exercises e
WHERE w.slug='hiit-inferno' AND e.name='Burpee'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 2, 3, 40, 15 FROM workouts w, exercises e
WHERE w.slug='hiit-inferno' AND e.name='Sprawl'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 3, 3, 45, 10 FROM workouts w, exercises e
WHERE w.slug='hiit-inferno' AND e.name='High Knees'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 4, 3, 60, 20 FROM workouts w, exercises e
WHERE w.slug='hiit-inferno' AND e.name='Jump Rope'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 5, 2, 40, 15 FROM workouts w, exercises e
WHERE w.slug='hiit-inferno' AND e.name='Mountain Climber'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 6, 2, 45, 10 FROM workouts w, exercises e
WHERE w.slug='hiit-inferno' AND e.name='Jumping Jacks'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 7, 2, 40, 15 FROM workouts w, exercises e
WHERE w.slug='hiit-inferno' AND e.name='Man Maker'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

-- Tabata Torch - 16:00, 500 kcal, advanced
INSERT INTO workouts (name, slug, description, duration_seconds, estimated_calories)
VALUES ('Tabata Torch', 'tabata-torch', 'True Tabata protocol: 20 seconds all-out, 10 seconds rest, round after round across five brutal stations.', 960, 500)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workout_levels (workout_id, level_id)
SELECT w.id, l.id FROM workouts w, levels l WHERE w.slug='tabata-torch' AND l.slug='advanced'
ON CONFLICT DO NOTHING;

INSERT INTO workout_category_map (workout_id, category_id)
SELECT m.workout_id, c.id FROM workout_categories c JOIN (SELECT id AS workout_id FROM workouts WHERE slug='tabata-torch') m ON true
WHERE c.slug IN ('fat_burning')
ON CONFLICT DO NOTHING;

INSERT INTO workout_focus_areas (workout_id, focus_area_id)
SELECT m.workout_id, f.id FROM focus_areas f JOIN (SELECT id AS workout_id FROM workouts WHERE slug='tabata-torch') m ON true
WHERE f.slug IN ('full_body')
ON CONFLICT DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 1, 8, 20, 10 FROM workouts w, exercises e
WHERE w.slug='tabata-torch' AND e.name='Jumping Jacks'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 2, 8, 20, 10 FROM workouts w, exercises e
WHERE w.slug='tabata-torch' AND e.name='Burpee'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 3, 6, 20, 10 FROM workouts w, exercises e
WHERE w.slug='tabata-torch' AND e.name='Mountain Climber'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 4, 6, 20, 10 FROM workouts w, exercises e
WHERE w.slug='tabata-torch' AND e.name='High Knees'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, duration_seconds, rest_seconds)
SELECT w.id, e.id, 5, 4, 20, 10 FROM workouts w, exercises e
WHERE w.slug='tabata-torch' AND e.name='Sprawl'
ON CONFLICT (workout_id, exercise_order) DO NOTHING;

