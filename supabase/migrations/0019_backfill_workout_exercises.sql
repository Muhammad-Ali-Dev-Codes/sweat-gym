-- 0019: Backfill missing exercise links for seeded workouts.
--
-- seed.sql wraps each workout in `IF NOT EXISTS`, so if a workout row was
-- created before its exercise inserts ran (e.g. by plan generation), the
-- links were silently skipped — leaving workouts that render empty and
-- show no animations in Discover.
-- Idempotent: only inserts links that don't already exist.

INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
SELECT w.id, e.id, v.ord, v.sets, v.reps, v.dur, v.rest
FROM workouts w
CROSS JOIN (VALUES
  (1::int, 'Bodyweight Squat'::text, 3::int, 12::int, NULL::int, 60::int),
  (2, 'Push-Up', 3, 10, NULL, 60),
  (3, 'Plank', 3, NULL, 45, 60)
) AS v(ord, name, sets, reps, dur, rest)
JOIN exercises e ON e.name = v.name
WHERE w.slug = 'full_body_beginner'
  AND NOT EXISTS (
    SELECT 1 FROM workout_exercises we
    WHERE we.workout_id = w.id AND we.exercise_id = e.id
  );

-- Same treatment for any other seeded workout left with zero exercises.
INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds)
SELECT w.id, e.id, v.ord, v.sets, v.reps, v.dur, v.rest
FROM workouts w
CROSS JOIN (VALUES
  (1::int, 'Jumping Jacks'::text, 3::int, NULL::int, 60::int, 30::int),
  (2, 'Lunges', 3, 15, NULL, 30)
) AS v(ord, name, sets, reps, dur, rest)
JOIN exercises e ON e.name = v.name
WHERE w.slug = 'cardio_blast'
  AND NOT EXISTS (
    SELECT 1 FROM workout_exercises we
    WHERE we.workout_id = w.id AND we.exercise_id = e.id
  );
