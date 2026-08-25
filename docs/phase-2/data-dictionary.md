# Phase 2 Data Dictionary

Column-level reference for all 32 tables in the Gym Member Fitness PWA database.

---

## Reference Tables

### levels

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique level identifier |
| name | TEXT | NO | - | - | Human-readable level name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe level identifier |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### focus_areas

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique focus area identifier |
| name | TEXT | NO | - | - | Human-readable focus area name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe focus area identifier |
| description | TEXT | YES | - | - | Focus area description |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### workout_categories

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique category identifier |
| name | TEXT | NO | - | - | Human-readable category name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe category identifier |
| description | TEXT | YES | - | - | Category description |
| display_order | INT | NO | 0 | - | Display ordering for category list |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### equipment

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique equipment identifier |
| name | TEXT | NO | - | - | Human-readable equipment name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe equipment identifier |
| description | TEXT | YES | - | - | Equipment description |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### physical_restrictions

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique restriction identifier |
| name | TEXT | NO | - | - | Human-readable restriction name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe restriction identifier |
| description | TEXT | YES | - | - | Restriction description |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### exercise_restrictions

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique restriction identifier |
| name | TEXT | NO | - | - | Human-readable restriction name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe restriction identifier |
| description | TEXT | YES | - | - | Restriction description |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### muscles

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique muscle identifier |
| name | TEXT | NO | - | - | Human-readable muscle name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe muscle identifier |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

---

## Exercise Tables

### exercises

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique exercise identifier |
| external_source | TEXT | YES | - | - | Data source (e.g., exercisedb) |
| external_exercise_id | TEXT | YES | - | - | ID from external source |
| name | TEXT | NO | - | - | Exercise display name |
| description | TEXT | YES | - | - | Exercise description |
| instructions | TEXT[] | YES | - | - | Step-by-step instruction array |
| animation_url | TEXT | YES | - | - | URL to exercise animation |
| thumbnail_url | TEXT | YES | - | - | URL to exercise thumbnail |
| video_url | TEXT | YES | - | - | URL to exercise video |
| media_source | TEXT | YES | 'exercisedb' | - | Source of media assets |
| exercise_mode | TEXT | NO | - | CHECK (IN ('reps', 'duration', 'both')) | Exercise execution mode |
| is_low_impact | BOOLEAN | NO | false | - | Whether exercise is low impact |
| requires_jumping | BOOLEAN | NO | false | - | Whether exercise requires jumping |
| is_active | BOOLEAN | NO | true | - | Soft-delete flag |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

### exercise_focus_areas

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| exercise_id | UUID | NO | - | PRIMARY KEY, FK → exercises(id) | Exercise reference |
| focus_area_id | UUID | NO | - | PRIMARY KEY, FK → focus_areas(id) | Focus area reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### exercise_levels

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| exercise_id | UUID | NO | - | PRIMARY KEY, FK → exercises(id) | Exercise reference |
| level_id | UUID | NO | - | PRIMARY KEY, FK → levels(id) | Level reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### exercise_equipment

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| exercise_id | UUID | NO | - | PRIMARY KEY, FK → exercises(id) | Exercise reference |
| equipment_id | UUID | NO | - | PRIMARY KEY, FK → equipment(id) | Equipment reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### exercise_restriction_map

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| exercise_id | UUID | NO | - | PRIMARY KEY, FK → exercises(id) | Exercise reference |
| restriction_id | UUID | NO | - | PRIMARY KEY, FK → exercise_restrictions(id) | Restriction reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### exercise_muscles

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| exercise_id | UUID | NO | - | PRIMARY KEY, FK → exercises(id) | Exercise reference |
| muscle_id | UUID | NO | - | PRIMARY KEY, FK → muscles(id) | Muscle reference |
| is_primary | BOOLEAN | NO | false | - | Whether muscle is primary target |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

---

## Workout Tables

### workouts

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique workout identifier |
| name | TEXT | NO | - | - | Workout display name |
| slug | TEXT | NO | - | UNIQUE NOT NULL | URL-safe workout identifier |
| description | TEXT | YES | - | - | Workout description |
| duration_seconds | INT | NO | - | CHECK (> 0) | Target workout duration |
| estimated_calories | INT | NO | - | CHECK (> 0) | Estimated calorie burn |
| is_active | BOOLEAN | NO | true | - | Soft-delete flag |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

### workout_exercises

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique record identifier |
| workout_id | UUID | NO | - | FK → workouts(id) | Parent workout reference |
| exercise_id | UUID | NO | - | FK → exercises(id) | Exercise reference |
| exercise_order | INT | NO | - | CHECK (> 0), UNIQUE(workout_id, exercise_order) | Exercise position in workout |
| sets | INT | NO | - | CHECK (> 0) | Number of sets to perform |
| reps | INT | YES | - | CHECK (> 0) | Reps per set (nullable for duration exercises) |
| duration_seconds | INT | YES | - | CHECK (> 0) | Duration per set (nullable for rep exercises) |
| rest_seconds | INT | NO | 0 | CHECK (>= 0) | Rest time between sets |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### workout_category_map

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| workout_id | UUID | NO | - | PRIMARY KEY, FK → workouts(id) | Workout reference |
| category_id | UUID | NO | - | PRIMARY KEY, FK → workout_categories(id) | Category reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### workout_focus_areas

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| workout_id | UUID | NO | - | PRIMARY KEY, FK → workouts(id) | Workout reference |
| focus_area_id | UUID | NO | - | PRIMARY KEY, FK → focus_areas(id) | Focus area reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### workout_levels

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| workout_id | UUID | NO | - | PRIMARY KEY, FK → workouts(id) | Workout reference |
| level_id | UUID | NO | - | PRIMARY KEY, FK → levels(id) | Level reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

---

## Plan Template Tables

### plan_templates

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique plan template identifier |
| name | TEXT | NO | - | - | Plan template display name |
| fitness_level_id | UUID | NO | - | FK → levels(id) | Associated fitness level |
| duration_days | INT | NO | 30 | CHECK (= 30) | Plan duration in days |
| is_active | BOOLEAN | NO | true | - | Soft-delete flag |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

### plan_template_days

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique day identifier |
| plan_template_id | UUID | NO | - | FK → plan_templates(id) | Parent plan template reference |
| day_number | INT | NO | - | CHECK (BETWEEN 1 AND 30), UNIQUE(plan_template_id, day_number) | Day position in plan |
| workout_id | UUID | NO | - | FK → workouts(id) | Workout assigned to this day |
| target_duration_seconds | INT | NO | - | CHECK (> 0) | Target duration for the day |
| target_calories | INT | NO | - | CHECK (> 0) | Target calories for the day |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

---

## User Profile Tables

### profiles

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique profile identifier |
| user_id | UUID | NO | - | UNIQUE, FK → auth.users(id) | Supabase auth user reference |
| full_name | TEXT | NO | - | - | User's full name |
| age | INT | NO | - | CHECK (BETWEEN 10 AND 120) | User's age |
| timezone | TEXT | NO | 'UTC' | - | User's timezone |
| onboarding_completed | BOOLEAN | NO | false | - | Whether onboarding is complete |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

### fitness_profiles

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique fitness profile identifier |
| user_id | UUID | NO | - | UNIQUE, FK → auth.users(id) | Supabase auth user reference |
| fitness_level | TEXT | NO | - | CHECK (IN ('beginner', 'intermediate', 'advanced')) | User's fitness level |
| push_up_ability | TEXT | NO | - | CHECK (IN ('unable', '0_5', '5_10', '10_20', '20_plus')) | Push-up ability category |
| plank_ability | TEXT | NO | - | CHECK (IN ('unable', '0_30', '30_60', '60_120', '120_plus')) | Plank hold ability category |
| height_cm | NUMERIC | NO | - | CHECK (> 0) | User's height in centimeters |
| target_weight_kg | NUMERIC | NO | - | CHECK (> 0) | User's target weight in kilograms |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

### user_physical_restrictions

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| user_id | UUID | NO | - | PRIMARY KEY, FK → auth.users(id) | Supabase auth user reference |
| restriction_id | UUID | NO | - | PRIMARY KEY, FK → physical_restrictions(id) | Physical restriction reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### weight_entries

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique entry identifier |
| user_id | UUID | NO | - | FK → auth.users(id) | Supabase auth user reference |
| weight_kg | NUMERIC | NO | - | CHECK (> 0) | Weight in kilograms |
| recorded_at | TIMESTAMPTZ | NO | - | - | When weight was recorded |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

---

## User Plan Tables

### user_plans

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique user plan identifier |
| user_id | UUID | NO | - | FK → auth.users(id) | Supabase auth user reference |
| plan_template_id | UUID | NO | - | FK → plan_templates(id) | Source plan template reference |
| started_at | TIMESTAMPTZ | NO | now() | - | When user started the plan |
| status | TEXT | NO | 'active' | CHECK (IN ('active', 'completed', 'archived')) | Plan lifecycle status |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

### user_plan_days

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique day identifier |
| user_plan_id | UUID | NO | - | FK → user_plans(id) | Parent user plan reference |
| day_number | INT | NO | - | CHECK (BETWEEN 1 AND 30), UNIQUE(user_plan_id, day_number) | Day position in plan |
| workout_id | UUID | NO | - | FK → workouts(id) | Workout assigned to this day |
| target_duration_seconds | INT | NO | - | CHECK (> 0) | Target duration for the day |
| target_calories | INT | NO | - | CHECK (> 0) | Target calories for the day |
| status | TEXT | NO | 'locked' | CHECK (IN ('locked', 'available', 'in_progress', 'completed')) | Day progress status |
| unlocked_at | TIMESTAMPTZ | YES | - | - | When day became available |
| completed_at | TIMESTAMPTZ | YES | - | - | When day was completed |
| actual_activity_date | DATE | YES | - | - | Real calendar date of activity |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

---

## Session Tables

### workout_sessions

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique session identifier |
| user_id | UUID | NO | - | FK → auth.users(id) | Supabase auth user reference |
| workout_id | UUID | NO | - | FK → workouts(id) | Workout performed |
| source | TEXT | NO | - | CHECK (IN ('plan', 'discover')) | Origin of workout (plan or discover) |
| user_plan_day_id | UUID | YES | - | FK → user_plan_days(id) | Linked plan day (null for discover) |
| started_at | TIMESTAMPTZ | NO | - | - | When session started |
| completed_at | TIMESTAMPTZ | YES | - | - | When session completed |
| duration_seconds | INT | YES | - | CHECK (> 0) | Actual session duration |
| estimated_calories | INT | YES | - | CHECK (> 0) | Estimated calories burned |
| status | TEXT | NO | 'in_progress' | CHECK (IN ('in_progress', 'completed', 'abandoned', 'interrupted')) | Session lifecycle status |
| client_operation_id | TEXT | NO | - | UNIQUE NOT NULL | Client-generated idempotency key |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

### workout_exercise_sessions

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique exercise session identifier |
| workout_session_id | UUID | NO | - | FK → workout_sessions(id) | Parent workout session reference |
| workout_exercise_id | UUID | NO | - | FK → workout_exercises(id) | Exercise prescription reference |
| status | TEXT | NO | 'pending' | CHECK (IN ('pending', 'in_progress', 'completed', 'skipped')) | Exercise completion status |
| completed_sets | INT | YES | 0 | CHECK (>= 0) | Number of sets completed |
| actual_reps | INT | YES | - | CHECK (> 0) | Actual reps performed |
| actual_duration_seconds | INT | YES | - | CHECK (> 0) | Actual duration performed |
| started_at | TIMESTAMPTZ | YES | - | - | When exercise started |
| completed_at | TIMESTAMPTZ | YES | - | - | When exercise completed |
| skipped_at | TIMESTAMPTZ | YES | - | - | When exercise was skipped |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

---

## Favorites & Notification Tables

### favorite_workouts

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| user_id | UUID | NO | - | PRIMARY KEY, FK → auth.users(id) | Supabase auth user reference |
| workout_id | UUID | NO | - | PRIMARY KEY, FK → workouts(id) | Workout reference |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |

### push_subscriptions

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique subscription identifier |
| user_id | UUID | NO | - | FK → auth.users(id) | Supabase auth user reference |
| endpoint | TEXT | NO | - | UNIQUE(user_id, endpoint) | Push service endpoint URL |
| p256dh | TEXT | NO | - | - | Push subscription encryption key |
| auth | TEXT | NO | - | - | Push subscription auth secret |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |
| revoked_at | TIMESTAMPTZ | YES | - | - | Soft-delete timestamp |

### notification_preferences

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| user_id | UUID | NO | - | PRIMARY KEY, FK → auth.users(id) | Supabase auth user reference |
| workout_reminders | BOOLEAN | NO | true | - | Opt-in for workout reminders |
| streak_reminders | BOOLEAN | NO | true | - | Opt-in for streak reminders |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NO | now() | - | Last update timestamp |

---

## Sync Operations Table

### sync_operations

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY | Unique operation identifier |
| user_id | UUID | NO | - | FK → auth.users(id) | Supabase auth user reference |
| operation_id | TEXT | NO | - | UNIQUE NOT NULL | Client-generated idempotency key |
| operation_type | TEXT | NO | - | CHECK (IN ('create', 'update', 'delete')) | Type of operation |
| table_name | TEXT | NO | - | - | Target table name |
| record_id | TEXT | NO | - | - | Target record identifier |
| payload | JSONB | YES | - | - | Full record payload for reconciliation |
| status | TEXT | NO | 'pending' | CHECK (IN ('pending', 'processing', 'completed', 'failed')) | Processing status |
| processed_at | TIMESTAMPTZ | YES | - | - | When operation was processed |
| error_message | TEXT | YES | - | - | Error details if processing failed |
| created_at | TIMESTAMPTZ | NO | now() | - | Row creation timestamp |
