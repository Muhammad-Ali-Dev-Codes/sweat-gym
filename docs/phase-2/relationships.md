# Phase 2 Database Relationships

All foreign key relationships in the Gym Member Fitness PWA database, grouped by domain.

---

## 1. Exercise Taxonomy

### exercise_focus_areas

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| exercise_focus_areas.exercise_id | exercises.id | CASCADE | 1:N (exercise → focus areas) | Deleting an exercise removes all its focus area associations; junction rows have no standalone value. |
| exercise_focus_areas.focus_area_id | focus_areas.id | CASCADE | 1:N (focus area → exercises) | Deleting a focus area removes all mappings; controlled vocabulary that should not leave orphaned references. |

### exercise_levels

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| exercise_levels.exercise_id | exercises.id | CASCADE | 1:N (exercise → levels) | Deleting an exercise removes its level associations; junction rows have no standalone value. |
| exercise_levels.level_id | levels.id | CASCADE | 1:N (level → exercises) | Deleting a level removes all mappings; reference data that should not leave orphaned junction rows. |

### exercise_equipment

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| exercise_equipment.exercise_id | exercises.id | CASCADE | 1:N (exercise → equipment) | Deleting an exercise removes its equipment associations; junction rows have no standalone value. |
| exercise_equipment.equipment_id | equipment.id | CASCADE | 1:N (equipment → exercises) | Deleting equipment removes all mappings; reference data that should not leave orphaned junction rows. |

### exercise_restriction_map

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| exercise_restriction_map.exercise_id | exercises.id | CASCADE | 1:N (exercise → restrictions) | Deleting an exercise removes its restriction tags; junction rows have no standalone value. |
| exercise_restriction_map.restriction_id | exercise_restrictions.id | CASCADE | 1:N (restriction → exercises) | Deleting a restriction removes all mappings; controlled vocabulary that should not leave orphaned references. |

### exercise_muscles

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| exercise_muscles.exercise_id | exercises.id | CASCADE | 1:N (exercise → muscles) | Deleting an exercise removes its muscle associations; junction rows have no standalone value. |
| exercise_muscles.muscle_id | muscles.id | CASCADE | 1:N (muscle → exercises) | Deleting a muscle removes all mappings; reference data that should not leave orphaned junction rows. |

---

## 2. Workout Composition

### workout_exercises

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| workout_exercises.workout_id | workouts.id | CASCADE | 1:N (workout → exercises) | Deleting a workout removes all its exercise prescriptions; exercises are child components with no meaning outside the workout. |
| workout_exercises.exercise_id | exercises.id | RESTRICT | 1:N (exercise → workout_exercises) | Prevents deleting an exercise that is referenced by any workout; exercises are shared library assets that workouts depend on. |

### workout_category_map

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| workout_category_map.workout_id | workouts.id | CASCADE | 1:N (workout → categories) | Deleting a workout removes all its category associations; junction rows have no standalone value. |
| workout_category_map.category_id | workout_categories.id | CASCADE | 1:N (category → workouts) | Deleting a category removes all mappings; controlled vocabulary that should not leave orphaned junction rows. |

### workout_focus_areas

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| workout_focus_areas.workout_id | workouts.id | CASCADE | 1:N (workout → focus areas) | Deleting a workout removes all its focus area tags; junction rows have no standalone value. |
| workout_focus_areas.focus_area_id | focus_areas.id | CASCADE | 1:N (focus area → workouts) | Deleting a focus area removes all mappings; controlled vocabulary that should not leave orphaned references. |

### workout_levels

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| workout_levels.workout_id | workouts.id | CASCADE | 1:N (workout → levels) | Deleting a workout removes all its level associations; junction rows have no standalone value. |
| workout_levels.level_id | levels.id | CASCADE | 1:N (level → workouts) | Deleting a level removes all mappings; reference data that should not leave orphaned junction rows. |

---

## 3. Plan Structure

### plan_templates

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| plan_templates.fitness_level_id | levels.id | RESTRICT | 1:N (level → plan_templates) | Prevents deleting a fitness level that has plan templates referencing it; level is a critical classification that plans depend on. |

### plan_template_days

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| plan_template_days.plan_template_id | plan_templates.id | CASCADE | 1:N (plan template → days) | Deleting a plan template removes all its day rows; days are child components with no meaning outside the template. |
| plan_template_days.workout_id | workouts.id | RESTRICT | 1:N (workout → plan_template_days) | Prevents deleting a workout that is assigned to any plan template day; workouts are shared assets that plans depend on. |

---

## 4. User Ownership

### profiles

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| profiles.user_id | auth.users.id | CASCADE | 1:1 (user → profile) | Deleting a Supabase auth user cascades to remove their profile; profile has no meaning without the owning user. |

### fitness_profiles

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| fitness_profiles.user_id | auth.users.id | CASCADE | 1:1 (user → fitness profile) | Deleting a Supabase auth user cascades to remove their fitness profile; personal assessment data has no meaning without the owning user. |

### user_physical_restrictions

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| user_physical_restrictions.user_id | auth.users.id | CASCADE | 1:N (user → restrictions) | Deleting a user removes all their selected restrictions; user-specific data has no value without the owner. |
| user_physical_restrictions.restriction_id | physical_restrictions.id | CASCADE | 1:N (restriction → users) | Deleting a physical restriction type removes all user selections; controlled vocabulary that should not leave orphaned references. |

### weight_entries

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| weight_entries.user_id | auth.users.id | CASCADE | 1:N (user → weight entries) | Deleting a user removes all their weight history; personal tracking data has no value without the owner. |

### user_plans

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| user_plans.user_id | auth.users.id | CASCADE | 1:N (user → plans) | Deleting a user removes all their plan assignments; user-specific data has no value without the owner. |
| user_plans.plan_template_id | plan_templates.id | RESTRICT | 1:N (template → user plans) | Prevents deleting a plan template that has active user plan instances; templates are shared assets that user plans depend on. |

### workout_sessions

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| workout_sessions.user_id | auth.users.id | CASCADE | 1:N (user → sessions) | Deleting a user removes all their workout session history; personal activity data has no value without the owner. |
| workout_sessions.workout_id | workouts.id | RESTRICT | 1:N (workout → sessions) | Prevents deleting a workout that has session records; workout is a shared library asset that historical data depends on. |
| workout_sessions.user_plan_day_id | user_plan_days.id | SET NULL | 1:1 (plan day → session) | Preserves the session record when a plan day is deleted; SET NULL allows session history to survive plan cleanup while unlinking the association. |

### favorite_workouts

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| favorite_workouts.user_id | auth.users.id | CASCADE | 1:N (user → favorites) | Deleting a user removes all their favorites; user-specific data has no value without the owner. |
| favorite_workouts.workout_id | workouts.id | CASCADE | 1:N (workout → favorites) | Deleting a workout removes it from all users' favorites; junction rows have no standalone value. |

### push_subscriptions

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| push_subscriptions.user_id | auth.users.id | CASCADE | 1:N (user → subscriptions) | Deleting a user removes all their push subscriptions; subscription data has no value without the owner. |

### notification_preferences

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| notification_preferences.user_id | auth.users.id | CASCADE | 1:1 (user → preferences) | Deleting a user removes their notification preferences; user-specific settings have no value without the owner. |

### sync_operations

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| sync_operations.user_id | auth.users.id | CASCADE | 1:N (user → operations) | Deleting a user removes their sync queue; operation records have no value without the owning user. |

---

## 5. Plan Progression

### user_plan_days

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| user_plan_days.user_plan_id | user_plans.id | CASCADE | 1:N (user plan → days) | Deleting a user plan removes all its day rows; days are child components with no meaning outside the plan instance. |
| user_plan_days.workout_id | workouts.id | RESTRICT | 1:N (workout → user_plan_days) | Prevents deleting a workout that is assigned to any user plan day; workouts are shared assets that user plans depend on. |

---

## 6. Session Detail

### workout_exercise_sessions

| Source | Target | ON DELETE | Cardinality | Business Reason |
|--------|--------|-----------|-------------|-----------------|
| workout_exercise_sessions.workout_session_id | workout_sessions.id | CASCADE | 1:N (session → exercise sessions) | Deleting a workout session removes all its per-exercise tracking rows; exercise sessions are child components with no meaning outside the parent session. |
| workout_exercise_sessions.workout_exercise_id | workout_exercises.id | RESTRICT | 1:N (workout exercise → exercise sessions) | Prevents deleting a workout exercise prescription that has session records; exercise prescriptions are shared assets that historical data depends on. |
