# Database Schema Specification

> **Supabase / PostgreSQL** — 32 tables across 9 migrations
> All timestamps use `TIMESTAMPTZ DEFAULT now()` unless noted otherwise.

---

## Migration 0001 — Reference Tables

### `levels`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `focus_areas`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `description` | TEXT | | YES | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `workout_categories`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `description` | TEXT | | YES | |
| `display_order` | INT | | NOT NULL | `0` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `equipment`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `description` | TEXT | | YES | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `physical_restrictions`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `description` | TEXT | | YES | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `exercise_restrictions`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `description` | TEXT | | YES | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `muscles`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

## Migration 0002 — Exercise Tables

### `exercises`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `external_source` | TEXT | | YES | |
| `external_exercise_id` | TEXT | | YES | |
| `name` | TEXT | | NOT NULL | |
| `description` | TEXT | | YES | |
| `instructions` | TEXT[] | | YES | |
| `animation_url` | TEXT | | YES | |
| `thumbnail_url` | TEXT | | YES | |
| `video_url` | TEXT | | YES | |
| `media_source` | TEXT | | NOT NULL | `'exercisedb'` |
| `exercise_mode` | TEXT | CHECK(`'reps'`, `'duration'`, `'both'`) | NOT NULL | |
| `is_low_impact` | BOOLEAN | | NOT NULL | `false` |
| `requires_jumping` | BOOLEAN | | NOT NULL | `false` |
| `is_active` | BOOLEAN | | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Unique Constraints:**
- `(external_source, external_exercise_id)`

---

### `exercise_focus_areas`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `exercise_id` | UUID | FK → `exercises(id)` ON DELETE CASCADE | NOT NULL | |
| `focus_area_id` | UUID | FK → `focus_areas(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(exercise_id, focus_area_id)`

---

### `exercise_levels`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `exercise_id` | UUID | FK → `exercises(id)` ON DELETE CASCADE | NOT NULL | |
| `level_id` | UUID | FK → `levels(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(exercise_id, level_id)`

---

### `exercise_equipment`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `exercise_id` | UUID | FK → `exercises(id)` ON DELETE CASCADE | NOT NULL | |
| `equipment_id` | UUID | FK → `equipment(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(exercise_id, equipment_id)`

---

### `exercise_restriction_map`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `exercise_id` | UUID | FK → `exercises(id)` ON DELETE CASCADE | NOT NULL | |
| `restriction_id` | UUID | FK → `exercise_restrictions(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(exercise_id, restriction_id)`

---

### `exercise_muscles`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `exercise_id` | UUID | FK → `exercises(id)` ON DELETE CASCADE | NOT NULL | |
| `muscle_id` | UUID | FK → `muscles(id)` ON DELETE CASCADE | NOT NULL | |
| `is_primary` | BOOLEAN | | NOT NULL | `false` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(exercise_id, muscle_id)`

---

## Migration 0003 — Workout Tables

### `workouts`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `slug` | TEXT | UNIQUE | NOT NULL | |
| `description` | TEXT | | YES | |
| `duration_seconds` | INT | CHECK(> 0) | NOT NULL | |
| `estimated_calories` | INT | CHECK(> 0) | NOT NULL | |
| `is_active` | BOOLEAN | | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `workout_exercises`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE CASCADE | NOT NULL | |
| `exercise_id` | UUID | FK → `exercises(id)` ON DELETE RESTRICT | NOT NULL | |
| `exercise_order` | INT | CHECK(> 0) | NOT NULL | |
| `sets` | INT | CHECK(> 0) | NOT NULL | |
| `reps` | INT | CHECK(> 0) | YES | |
| `duration_seconds` | INT | CHECK(> 0) | YES | |
| `rest_seconds` | INT | CHECK(>= 0) | NOT NULL | `0` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Unique Constraints:**
- `(workout_id, exercise_order)`

---

### `workout_category_map`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE CASCADE | NOT NULL | |
| `category_id` | UUID | FK → `workout_categories(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(workout_id, category_id)`

---

### `workout_focus_areas`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE CASCADE | NOT NULL | |
| `focus_area_id` | UUID | FK → `focus_areas(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(workout_id, focus_area_id)`

---

### `workout_levels`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE CASCADE | NOT NULL | |
| `level_id` | UUID | FK → `levels(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(workout_id, level_id)`

---

## Migration 0004 — Plan Templates

### `plan_templates`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `name` | TEXT | | NOT NULL | |
| `fitness_level_id` | UUID | FK → `levels(id)` ON DELETE RESTRICT | NOT NULL | |
| `duration_days` | INT | CHECK(= 30) | NOT NULL | `30` |
| `is_active` | BOOLEAN | | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `plan_template_days`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `plan_template_id` | UUID | FK → `plan_templates(id)` ON DELETE CASCADE | NOT NULL | |
| `day_number` | INT | CHECK(1–30) | NOT NULL | |
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE RESTRICT | NOT NULL | |
| `target_duration_seconds` | INT | CHECK(> 0) | NOT NULL | |
| `target_calories` | INT | CHECK(> 0) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Unique Constraints:**
- `(plan_template_id, day_number)`

---

## Migration 0005 — User Profiles

### `profiles`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE, UNIQUE | NOT NULL | |
| `full_name` | TEXT | | NOT NULL | |
| `age` | INT | CHECK(10–120) | NOT NULL | |
| `timezone` | TEXT | | NOT NULL | `'UTC'` |
| `onboarding_completed` | BOOLEAN | | NOT NULL | `false` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `fitness_profiles`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE, UNIQUE | NOT NULL | |
| `fitness_level` | TEXT | CHECK(`'beginner'`, `'intermediate'`, `'advanced'`) | NOT NULL | |
| `push_up_ability` | TEXT | CHECK(`'unable'`, `'0_5'`, `'5_10'`, `'10_20'`, `'20_plus'`) | NOT NULL | |
| `plank_ability` | TEXT | CHECK(`'unable'`, `'0_30'`, `'30_60'`, `'60_120'`, `'120_plus'`) | NOT NULL | |
| `height_cm` | NUMERIC | CHECK(> 0) | NOT NULL | |
| `target_weight_kg` | NUMERIC | CHECK(> 0) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `user_physical_restrictions`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | NOT NULL | |
| `restriction_id` | UUID | FK → `physical_restrictions(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(user_id, restriction_id)`

---

### `weight_entries`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | NOT NULL | |
| `weight_kg` | NUMERIC | CHECK(> 0) | NOT NULL | |
| `recorded_at` | TIMESTAMPTZ | | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

## Migration 0006 — User Plans

### `user_plans`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | NOT NULL | |
| `plan_template_id` | UUID | FK → `plan_templates(id)` ON DELETE RESTRICT | NOT NULL | |
| `started_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `status` | TEXT | CHECK(`'active'`, `'completed'`, `'archived'`) | NOT NULL | `'active'` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `user_plan_days`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_plan_id` | UUID | FK → `user_plans(id)` ON DELETE CASCADE | NOT NULL | |
| `day_number` | INT | CHECK(1–30) | NOT NULL | |
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE RESTRICT | NOT NULL | |
| `target_duration_seconds` | INT | CHECK(> 0) | NOT NULL | |
| `target_calories` | INT | CHECK(> 0) | NOT NULL | |
| `status` | TEXT | CHECK(`'locked'`, `'available'`, `'in_progress'`, `'completed'`) | NOT NULL | `'locked'` |
| `unlocked_at` | TIMESTAMPTZ | | YES | |
| `completed_at` | TIMESTAMPTZ | | YES | |
| `actual_activity_date` | DATE | | YES | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Unique Constraints:**
- `(user_plan_id, day_number)`

---

## Migration 0007 — Sessions

### `workout_sessions`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | NOT NULL | |
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE RESTRICT | NOT NULL | |
| `source` | TEXT | CHECK(`'plan'`, `'discover'`) | NOT NULL | |
| `user_plan_day_id` | UUID | FK → `user_plan_days(id)` ON DELETE SET NULL | YES | |
| `started_at` | TIMESTAMPTZ | | NOT NULL | |
| `completed_at` | TIMESTAMPTZ | | YES | |
| `duration_seconds` | INT | CHECK(> 0) | YES | |
| `estimated_calories` | INT | CHECK(> 0) | YES | |
| `status` | TEXT | CHECK(`'in_progress'`, `'completed'`, `'abandoned'`, `'interrupted'`) | NOT NULL | `'in_progress'` |
| `client_operation_id` | TEXT | UNIQUE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

### `workout_exercise_sessions`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `workout_session_id` | UUID | FK → `workout_sessions(id)` ON DELETE CASCADE | NOT NULL | |
| `workout_exercise_id` | UUID | FK → `workout_exercises(id)` ON DELETE RESTRICT | NOT NULL | |
| `status` | TEXT | CHECK(`'pending'`, `'in_progress'`, `'completed'`, `'skipped'`) | NOT NULL | `'pending'` |
| `completed_sets` | INT | CHECK(>= 0) | NOT NULL | `0` |
| `actual_reps` | INT | CHECK(> 0) | YES | |
| `actual_duration_seconds` | INT | CHECK(> 0) | YES | |
| `started_at` | TIMESTAMPTZ | | YES | |
| `completed_at` | TIMESTAMPTZ | | YES | |
| `skipped_at` | TIMESTAMPTZ | | YES | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

## Migration 0008 — Favorites & Notifications

### `favorite_workouts`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | NOT NULL | |
| `workout_id` | UUID | FK → `workouts(id)` ON DELETE CASCADE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

**Primary Key:** `(user_id, workout_id)`

---

### `push_subscriptions`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | NOT NULL | |
| `endpoint` | TEXT | | NOT NULL | |
| `p256dh` | TEXT | | NOT NULL | |
| `auth` | TEXT | | NOT NULL | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `revoked_at` | TIMESTAMPTZ | | YES | |

**Unique Constraints:**
- `(user_id, endpoint)`

---

### `notification_preferences`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE, PRIMARY KEY | NOT NULL | |
| `workout_reminders` | BOOLEAN | | NOT NULL | `true` |
| `streak_reminders` | BOOLEAN | | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

## Migration 0009 — Sync

### `sync_operations`

| Column | Type | Constraints | Nullable | Default |
|--------|------|-------------|----------|---------|
| `id` | UUID | PRIMARY KEY | NOT NULL | `gen_random_uuid()` |
| `user_id` | UUID | FK → `auth.users(id)` ON DELETE CASCADE | NOT NULL | |
| `operation_id` | TEXT | UNIQUE | NOT NULL | |
| `operation_type` | TEXT | CHECK(`'create'`, `'update'`, `'delete'`) | NOT NULL | |
| `table_name` | TEXT | | NOT NULL | |
| `record_id` | TEXT | | NOT NULL | |
| `payload` | JSONB | | YES | |
| `status` | TEXT | CHECK(`'pending'`, `'processing'`, `'completed'`, `'failed'`) | NOT NULL | `'pending'` |
| `processed_at` | TIMESTAMPTZ | | YES | |
| `error_message` | TEXT | | YES | |
| `created_at` | TIMESTAMPTZ | | NOT NULL | `now()` |

---

## Foreign Key Summary

| Source Table | Source Column | Target Table | Target Column | ON DELETE |
|--------------|---------------|--------------|---------------|-----------|
| `exercise_focus_areas` | `exercise_id` | `exercises` | `id` | CASCADE |
| `exercise_focus_areas` | `focus_area_id` | `focus_areas` | `id` | CASCADE |
| `exercise_levels` | `exercise_id` | `exercises` | `id` | CASCADE |
| `exercise_levels` | `level_id` | `levels` | `id` | CASCADE |
| `exercise_equipment` | `exercise_id` | `exercises` | `id` | CASCADE |
| `exercise_equipment` | `equipment_id` | `equipment` | `id` | CASCADE |
| `exercise_restriction_map` | `exercise_id` | `exercises` | `id` | CASCADE |
| `exercise_restriction_map` | `restriction_id` | `exercise_restrictions` | `id` | CASCADE |
| `exercise_muscles` | `exercise_id` | `exercises` | `id` | CASCADE |
| `exercise_muscles` | `muscle_id` | `muscles` | `id` | CASCADE |
| `workout_exercises` | `workout_id` | `workouts` | `id` | CASCADE |
| `workout_exercises` | `exercise_id` | `exercises` | `id` | RESTRICT |
| `workout_category_map` | `workout_id` | `workouts` | `id` | CASCADE |
| `workout_category_map` | `category_id` | `workout_categories` | `id` | CASCADE |
| `workout_focus_areas` | `workout_id` | `workouts` | `id` | CASCADE |
| `workout_focus_areas` | `focus_area_id` | `focus_areas` | `id` | CASCADE |
| `workout_levels` | `workout_id` | `workouts` | `id` | CASCADE |
| `workout_levels` | `level_id` | `levels` | `id` | CASCADE |
| `plan_templates` | `fitness_level_id` | `levels` | `id` | RESTRICT |
| `plan_template_days` | `plan_template_id` | `plan_templates` | `id` | CASCADE |
| `plan_template_days` | `workout_id` | `workouts` | `id` | RESTRICT |
| `profiles` | `user_id` | `auth.users` | `id` | CASCADE |
| `fitness_profiles` | `user_id` | `auth.users` | `id` | CASCADE |
| `user_physical_restrictions` | `user_id` | `auth.users` | `id` | CASCADE |
| `user_physical_restrictions` | `restriction_id` | `physical_restrictions` | `id` | CASCADE |
| `weight_entries` | `user_id` | `auth.users` | `id` | CASCADE |
| `user_plans` | `user_id` | `auth.users` | `id` | CASCADE |
| `user_plans` | `plan_template_id` | `plan_templates` | `id` | RESTRICT |
| `user_plan_days` | `user_plan_id` | `user_plans` | `id` | CASCADE |
| `user_plan_days` | `workout_id` | `workouts` | `id` | RESTRICT |
| `workout_sessions` | `user_id` | `auth.users` | `id` | CASCADE |
| `workout_sessions` | `workout_id` | `workouts` | `id` | RESTRICT |
| `workout_sessions` | `user_plan_day_id` | `user_plan_days` | `id` | SET NULL |
| `workout_exercise_sessions` | `workout_session_id` | `workout_sessions` | `id` | CASCADE |
| `workout_exercise_sessions` | `workout_exercise_id` | `workout_exercises` | `id` | RESTRICT |
| `favorite_workouts` | `user_id` | `auth.users` | `id` | CASCADE |
| `favorite_workouts` | `workout_id` | `workouts` | `id` | CASCADE |
| `push_subscriptions` | `user_id` | `auth.users` | `id` | CASCADE |
| `notification_preferences` | `user_id` | `auth.users` | `id` | CASCADE |
| `sync_operations` | `user_id` | `auth.users` | `id` | CASCADE |

**Deletion strategies used:**
- **CASCADE** — remove dependent rows automatically (most relationships)
- **RESTRICT** — block deletion of the parent if children exist (exercise-from-workout, workout-from-plan, template-from-plan, level-from-template)
- **SET NULL** — orphan the child row but preserve it (`user_plan_day_id` on `workout_sessions`)

---

## Unique Constraints Summary

| Table | Columns |
|-------|---------|
| `levels` | `slug` |
| `focus_areas` | `slug` |
| `workout_categories` | `slug` |
| `equipment` | `slug` |
| `physical_restrictions` | `slug` |
| `exercise_restrictions` | `slug` |
| `muscles` | `slug` |
| `exercises` | `(external_source, external_exercise_id)` |
| `workouts` | `slug` |
| `workout_exercises` | `(workout_id, exercise_order)` |
| `plan_template_days` | `(plan_template_id, day_number)` |
| `profiles` | `user_id` |
| `fitness_profiles` | `user_id` |
| `user_plan_days` | `(user_plan_id, day_number)` |
| `workout_sessions` | `client_operation_id` |
| `push_subscriptions` | `(user_id, endpoint)` |
| `sync_operations` | `operation_id` |

---

## Check Constraints Summary

| Table | Column | Constraint |
|-------|--------|------------|
| `exercises` | `exercise_mode` | `'reps'`, `'duration'`, `'both'` |
| `workouts` | `duration_seconds` | > 0 |
| `workouts` | `estimated_calories` | > 0 |
| `workout_exercises` | `exercise_order` | > 0 |
| `workout_exercises` | `sets` | > 0 |
| `workout_exercises` | `reps` | > 0 |
| `workout_exercises` | `duration_seconds` | > 0 |
| `workout_exercises` | `rest_seconds` | >= 0 |
| `plan_templates` | `duration_days` | = 30 |
| `plan_template_days` | `day_number` | 1–30 |
| `plan_template_days` | `target_duration_seconds` | > 0 |
| `plan_template_days` | `target_calories` | > 0 |
| `profiles` | `age` | 10–120 |
| `fitness_profiles` | `fitness_level` | `'beginner'`, `'intermediate'`, `'advanced'` |
| `fitness_profiles` | `push_up_ability` | `'unable'`, `'0_5'`, `'5_10'`, `'10_20'`, `'20_plus'` |
| `fitness_profiles` | `plank_ability` | `'unable'`, `'0_30'`, `'30_60'`, `'60_120'`, `'120_plus'` |
| `fitness_profiles` | `height_cm` | > 0 |
| `fitness_profiles` | `target_weight_kg` | > 0 |
| `weight_entries` | `weight_kg` | > 0 |
| `user_plans` | `status` | `'active'`, `'completed'`, `'archived'` |
| `user_plan_days` | `day_number` | 1–30 |
| `user_plan_days` | `target_duration_seconds` | > 0 |
| `user_plan_days` | `target_calories` | > 0 |
| `user_plan_days` | `status` | `'locked'`, `'available'`, `'in_progress'`, `'completed'` |
| `workout_sessions` | `source` | `'plan'`, `'discover'` |
| `workout_sessions` | `duration_seconds` | > 0 |
| `workout_sessions` | `estimated_calories` | > 0 |
| `workout_sessions` | `status` | `'in_progress'`, `'completed'`, `'abandoned'`, `'interrupted'` |
| `workout_exercise_sessions` | `completed_sets` | >= 0 |
| `workout_exercise_sessions` | `actual_reps` | > 0 |
| `workout_exercise_sessions` | `actual_duration_seconds` | > 0 |
| `workout_exercise_sessions` | `status` | `'pending'`, `'in_progress'`, `'completed'`, `'skipped'` |
| `sync_operations` | `operation_type` | `'create'`, `'update'`, `'delete'` |
| `sync_operations` | `status` | `'pending'`, `'processing'`, `'completed'`, `'failed'` |
