-- 0028: Repair plan-day targets that were forked from stale template values.
--
-- Root cause: plan_template_days.target_duration_seconds / target_calories
-- drifted from the workouts they reference (e.g. 750s target on a 600s
-- workout). Plan generation used those stale targets as the duration/calorie
-- baseline, so users saw shrunken days like "10 min / 110 kcal" for a
-- 30 min / 330 kcal workout.
--
-- Generation code now baselines every day row on the scheduled workout
-- itself. This migration syncs the templates and repairs live day rows.

-- 1) Sync template-day targets to their actual workouts.
UPDATE plan_template_days t
SET target_duration_seconds = w.duration_seconds,
    target_calories = w.estimated_calories,
    updated_at = now()
FROM workouts w
WHERE t.workout_id = w.id
  AND (
    t.target_duration_seconds <> w.duration_seconds
    OR t.target_calories <> w.estimated_calories
  );

-- 2) Repair non-completed day rows of ACTIVE plans to the true workout
--    length/burn. Completed rows keep their historical planned values.
UPDATE user_plan_days d
SET target_duration_seconds = w.duration_seconds,
    target_calories = GREATEST(10, w.estimated_calories),
    updated_at = now()
FROM workouts w, user_plans p
WHERE d.workout_id = w.id
  AND d.user_plan_id = p.id
  AND p.status = 'active'
  AND d.status IN ('available', 'locked', 'in_progress')
  AND (
    d.target_duration_seconds <> w.duration_seconds
    OR d.target_calories <> GREATEST(10, w.estimated_calories)
  );
