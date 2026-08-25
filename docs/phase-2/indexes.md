# Database Indexes Reference

Gym Member Fitness PWA — Phase 2 Indexes

---

## exercises (0002)

### Primary Key Index
- **Index:** exercises_pkey (implicit)
- **Table:** exercises
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID. Used for all single-exercise fetches.

### idx_exercises_external_id
- **Table:** exercises
- **Columns:** external_source, external_exercise_id
- **Type:** B-tree
- **Purpose:** Lookup exercises by external provider ID (e.g. ExerciseDB). Supports deduplication during seed import and cross-referencing external data.

### idx_exercises_name
- **Table:** exercises
- **Columns:** name
- **Type:** B-tree
- **Purpose:** Full-text name search and autocomplete for exercise selection in workout builders.

### idx_exercises_active
- **Table:** exercises
- **Columns:** is_active
- **Type:** Partial (WHERE is_active = true)
- **Purpose:** Filters to only active exercises for all user-facing queries. Scans only the subset of non-archived exercises.

---

## exercise_focus_areas (0002)

### Primary Key Index
- **Index:** exercise_focus_areas_pkey (implicit)
- **Table:** exercise_focus_areas
- **Columns:** (exercise_id, focus_area_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports lookup of focus areas for a given exercise.

### idx_exercise_focus_areas_focus
- **Table:** exercise_focus_areas
- **Columns:** focus_area_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all exercises tagged with a given focus area. Supports Discover filtering by body region.

---

## exercise_levels (0002)

### Primary Key Index
- **Index:** exercise_levels_pkey (implicit)
- **Table:** exercise_levels
- **Columns:** (exercise_id, level_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports level lookup for a given exercise.

### idx_exercise_levels_level
- **Table:** exercise_levels
- **Columns:** level_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all exercises for a given fitness level. Supports level-based exercise filtering.

---

## exercise_equipment (0002)

### Primary Key Index
- **Index:** exercise_equipment_pkey (implicit)
- **Table:** exercise_equipment
- **Columns:** (exercise_id, equipment_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports equipment lookup for a given exercise.

### idx_exercise_equipment_equipment
- **Table:** exercise_equipment
- **Columns:** equipment_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all exercises requiring a specific piece of equipment. Supports Discover filtering by available equipment.

---

## exercise_restriction_map (0002)

### Primary Key Index
- **Index:** exercise_restriction_map_pkey (implicit)
- **Table:** exercise_restriction_map
- **Columns:** (exercise_id, restriction_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports restriction lookup for a given exercise.

### idx_exercise_restriction_map_restriction
- **Table:** exercise_restriction_map
- **Columns:** restriction_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all exercises tagged with a given restriction. Used to exclude unsafe exercises based on user physical restrictions.

---

## exercise_muscles (0002)

### Primary Key Index
- **Index:** exercise_muscles_pkey (implicit)
- **Table:** exercise_muscles
- **Columns:** (exercise_id, muscle_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports muscle lookup for a given exercise.

### idx_exercise_muscles_muscle
- **Table:** exercise_muscles
- **Columns:** muscle_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all exercises targeting a specific muscle. Supports muscle-based filtering and workout composition.

### idx_exercise_muscles_primary
- **Table:** exercise_muscles
- **Columns:** exercise_id
- **Type:** Partial (WHERE is_primary = true)
- **Purpose:** Fetch only primary target muscles for an exercise. Used in exercise detail display to highlight the main muscle group.

---

## workouts (0003)

### Primary Key Index
- **Index:** workouts_pkey (implicit)
- **Table:** workouts
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_workouts_slug
- **Table:** workouts
- **Columns:** slug
- **Type:** B-tree
- **Purpose:** Slug-based URL routing. Supports direct workout lookup by human-readable slug (e.g. `/workouts/morning-burn`).

### idx_workouts_active
- **Table:** workouts
- **Columns:** is_active
- **Type:** Partial (WHERE is_active = true)
- **Purpose:** Filters to only active workouts for Discover feed and plan day assignment. Scans only non-archived workouts.

---

## workout_exercises (0003)

### Primary Key Index
- **Index:** workout_exercises_pkey (implicit)
- **Table:** workout_exercises
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_workout_exercises_workout
- **Table:** workout_exercises
- **Columns:** workout_id
- **Type:** B-tree
- **Purpose:** Fetch all exercises in a given workout. Supports workout detail view and session creation.

### idx_workout_exercises_exercise
- **Table:** workout_exercises
- **Columns:** exercise_id
- **Type:** B-tree
- **Purpose:** Find all workouts containing a specific exercise. Supports exercise-to-workout reverse lookups.

---

## workout_category_map (0003)

### Primary Key Index
- **Index:** workout_category_map_pkey (implicit)
- **Table:** workout_category_map
- **Columns:** (workout_id, category_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports category lookup for a given workout.

### idx_workout_category_map_category
- **Table:** workout_category_map
- **Columns:** category_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all workouts in a given Discover category. Supports Discover browsing by category tab.

---

## workout_focus_areas (0003)

### Primary Key Index
- **Index:** workout_focus_areas_pkey (implicit)
- **Table:** workout_focus_areas
- **Columns:** (workout_id, focus_area_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports focus area lookup for a given workout.

### idx_workout_focus_areas_focus
- **Table:** workout_focus_areas
- **Columns:** focus_area_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all workouts targeting a given focus area. Supports filtering in Discover and recommendations.

---

## workout_levels (0003)

### Primary Key Index
- **Index:** workout_levels_pkey (implicit)
- **Table:** workout_levels
- **Columns:** (workout_id, level_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate mappings. Supports level lookup for a given workout.

### idx_workout_levels_level
- **Table:** workout_levels
- **Columns:** level_id
- **Type:** B-tree
- **Purpose:** Reverse lookup — find all workouts for a given fitness level. Supports level-appropriate workout recommendations.

---

## plan_templates (0004)

### Primary Key Index
- **Index:** plan_templates_pkey (implicit)
- **Table:** plan_templates
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_plan_templates_level
- **Table:** plan_templates
- **Columns:** fitness_level_id
- **Type:** B-tree
- **Purpose:** Find the plan template for a given fitness level. Supports onboarding plan assignment.

---

## plan_template_days (0004)

### Primary Key Index
- **Index:** plan_template_days_pkey (implicit)
- **Table:** plan_template_days
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_plan_template_days_template
- **Table:** plan_template_days
- **Columns:** plan_template_id
- **Type:** B-tree
- **Purpose:** Fetch all 30 days for a plan template. Supports plan overview and user plan creation.

### idx_plan_template_days_workout
- **Table:** plan_template_days
- **Columns:** workout_id
- **Type:** B-tree
- **Purpose:** Find which plan templates use a specific workout. Supports workout dependency checks before archival.

---

## profiles (0005)

### Primary Key Index
- **Index:** profiles_pkey (implicit)
- **Table:** profiles
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_profiles_user_id
- **Table:** profiles
- **Columns:** user_id
- **Type:** B-tree
- **Purpose:** Fetch profile by auth user ID. Supports all authenticated profile lookups (RLS policies also filter on this).

---

## fitness_profiles (0005)

### Primary Key Index
- **Index:** fitness_profiles_pkey (implicit)
- **Table:** fitness_profiles
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_fitness_profiles_user_id
- **Table:** fitness_profiles
- **Columns:** user_id
- **Type:** B-tree
- **Purpose:** Fetch fitness profile by auth user ID. Supports onboarding status checks and recommendation engine queries.

---

## user_physical_restrictions (0005)

### Primary Key Index
- **Index:** user_physical_restrictions_pkey (implicit)
- **Table:** user_physical_restrictions
- **Columns:** (user_id, restriction_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate restriction assignments. Supports fast lookup of all restrictions for a given user.

---

## weight_entries (0005)

### Primary Key Index
- **Index:** weight_entries_pkey (implicit)
- **Table:** weight_entries
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_weight_entries_user_date
- **Table:** weight_entries
- **Columns:** user_id, recorded_at DESC
- **Type:** B-tree
- **Purpose:** Fetch weight history for a user ordered by most recent first. Supports the weight chart/graph in the Profile tab.

---

## user_plans (0006)

### Primary Key Index
- **Index:** user_plans_pkey (implicit)
- **Table:** user_plans
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_user_plans_user_id
- **Table:** user_plans
- **Columns:** user_id
- **Type:** B-tree
- **Purpose:** Fetch all plans for a user. Supports plan history view.

### idx_user_plans_user_status
- **Table:** user_plans
- **Columns:** (user_id, status)
- **Type:** B-tree
- **Purpose:** Fetch the active plan for a user. Supports the common query pattern of finding the current in-progress plan.

---

## user_plan_days (0006)

### Primary Key Index
- **Index:** user_plan_days_pkey (implicit)
- **Table:** user_plan_days
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_user_plan_days_plan
- **Table:** user_plan_days
- **Columns:** user_plan_id
- **Type:** B-tree
- **Purpose:** Fetch all 30 day rows for a user plan. Supports plan progress view.

### idx_user_plan_days_plan_day
- **Table:** user_plan_days
- **Columns:** (user_plan_id, day_number)
- **Type:** B-tree
- **Purpose:** Fetch a specific day within a plan. Supports day detail view and the complete_plan_day function's next-day unlock logic.

### idx_user_plan_days_status
- **Table:** user_plan_days
- **Columns:** (user_plan_id, status)
- **Type:** B-tree
- **Purpose:** Find the current in-progress or available day in a plan. Supports the "what should I do next" query.

---

## workout_sessions (0007)

### Primary Key Index
- **Index:** workout_sessions_pkey (implicit)
- **Table:** workout_sessions
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_workout_sessions_user_date
- **Table:** workout_sessions
- **Columns:** (user_id, completed_at DESC)
- **Type:** B-tree
- **Purpose:** Fetch session history for a user ordered by most recent. Supports the activity/history feed.

### idx_workout_sessions_user_source
- **Table:** workout_sessions
- **Columns:** (user_id, source, completed_at DESC)
- **Type:** B-tree
- **Purpose:** Fetch session history filtered by source (plan vs discover). Supports separate "Plan History" and "Discover History" views.

### idx_workout_sessions_plan_day
- **Table:** workout_sessions
- **Columns:** user_plan_day_id
- **Type:** B-tree
- **Purpose:** Find the session linked to a specific plan day. Supports the complete_plan_day function's session update and prevents duplicate completions.

### idx_workout_sessions_operation
- **Table:** workout_sessions
- **Columns:** client_operation_id
- **Type:** B-tree
- **Purpose:** Idempotency check during offline sync. Supports fast lookup to detect duplicate operation submissions.

---

## workout_exercise_sessions (0007)

### Primary Key Index
- **Index:** workout_exercise_sessions_pkey (implicit)
- **Table:** workout_exercise_sessions
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_exercise_sessions_session
- **Table:** workout_exercise_sessions
- **Columns:** workout_session_id
- **Type:** B-tree
- **Purpose:** Fetch all exercise records for a workout session. Supports the in-progress workout view and session summary.

### idx_exercise_sessions_status
- **Table:** workout_exercise_sessions
- **Columns:** (workout_session_id, status)
- **Type:** B-tree
- **Purpose:** Find pending or in-progress exercises within a session. Supports the "what's next" logic during an active workout.

---

## favorite_workouts (0008)

### Primary Key Index
- **Index:** favorite_workouts_pkey (implicit)
- **Table:** favorite_workouts
- **Columns:** (user_id, workout_id)
- **Type:** B-tree, unique composite
- **Purpose:** Prevents duplicate favorites. Fast toggle check (is this workout already favorited?).

### idx_favorite_workouts_workout
- **Table:** favorite_workouts
- **Columns:** workout_id
- **Type:** B-tree
- **Purpose:** Find all users who favorited a workout. Supports "popular workouts" ranking.

---

## push_subscriptions (0008)

### Primary Key Index
- **Index:** push_subscriptions_pkey (implicit)
- **Table:** push_subscriptions
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_push_subscriptions_user
- **Table:** push_subscriptions
- **Columns:** user_id
- **Type:** Partial (WHERE revoked_at IS NULL)
- **Purpose:** Fetch active (non-revoked) push subscriptions for a user. Supports notification delivery — only active subscriptions are sent to.

---

## notification_preferences (0008)

### Primary Key Index
- **Index:** notification_preferences_pkey (implicit)
- **Table:** notification_preferences
- **Columns:** user_id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by auth user ID. Enforces one preferences row per user.

---

## sync_operations (0009)

### Primary Key Index
- **Index:** sync_operations_pkey (implicit)
- **Table:** sync_operations
- **Columns:** id
- **Type:** B-tree, unique
- **Purpose:** Primary key lookup by UUID.

### idx_sync_operations_user_status
- **Table:** sync_operations
- **Columns:** (user_id, status)
- **Type:** B-tree
- **Purpose:** Fetch pending operations for a user during sync reconciliation. Supports the offline-to-online sync processing queue.

### idx_sync_operations_operation_id
- **Table:** sync_operations
- **Columns:** operation_id
- **Type:** B-tree
- **Purpose:** Idempotency check. Client-generated operation IDs are checked for duplicates before processing.

### idx_sync_operations_created
- **Table:** sync_operations
- **Columns:** created_at ASC
- **Type:** B-tree
- **Purpose:** Process operations in chronological order. Supports FIFO processing of the sync queue.
