# Migration Plan

All migrations live in `supabase/migrations/`. Each file creates tables, indexes, constraints, policies, functions, or seed data for a single concern.

## Naming Convention

```
{number}_{description}.sql
```

- Number: four-digit zero-padded sequential integer
- Description: lowercase snake_case summarizing the migration's purpose
- Example: `0001_create_reference_tables.sql`

## Migrations

### 0001 — `0001_create_reference_tables.sql`

**Tables created:**
- `levels`
- `focus_areas`
- `workout_categories`
- `equipment`
- `physical_restrictions`
- `exercise_restrictions`
- `muscles`

**Purpose:** Creates all controlled vocabulary / lookup tables. These are the foundation for exercise taxonomy, workout categorization, and user restriction matching.

**Dependencies:** None.

---

### 0002 — `0002_create_exercises.sql`

**Tables created:**
- `exercises`
- `exercise_focus_areas`
- `exercise_levels`
- `exercise_equipment`
- `exercise_restriction_map`
- `exercise_muscles`

**Purpose:** Builds the master exercise library with media fields, external source tracking, and all many-to-many taxonomy relationships. The `exercises` table is the central entity that workouts reference.

**Dependencies:** 0001 (references `levels`, `focus_areas`, `equipment`, `exercise_restrictions`, `muscles`).

---

### 0003 — `0003_create_workouts.sql`

**Tables created:**
- `workouts`
- `workout_exercises`
- `workout_category_map`
- `workout_focus_areas`
- `workout_levels`

**Purpose:** Defines fixed workout collections composed of exercises with per-exercise prescriptions (sets, reps, duration, rest). Includes Discover category mapping and workout-level taxonomy.

**Dependencies:** 0002 (references `exercises`), 0001 (references `focus_areas`, `levels`, `workout_categories`).

---

### 0004 — `0004_create_plan_templates.sql`

**Tables created:**
- `plan_templates`
- `plan_template_days`

**Purpose:** Defines the three 30-day base plans (Beginner, Intermediate, Advanced). Each plan template has exactly 30 day rows, each mapped to a workout.

**Dependencies:** 0001 (references `levels`), 0003 (references `workouts`).

---

### 0005 — `0005_create_user_profiles.sql`

**Tables created:**
- `profiles`
- `fitness_profiles`
- `user_physical_restrictions`
- `weight_entries`

**Purpose:** Links Supabase `auth.users` to application profiles, fitness onboarding data, physical restriction selections, and weight history. This is the first migration that introduces user-owned data.

**Dependencies:** 0001 (references `physical_restrictions`).

---

### 0006 — `0006_create_user_plans.sql`

**Tables created:**
- `user_plans`
- `user_plan_days`

**Purpose:** Stores user-specific plan assignments with day-level progression tracking. A `user_plan` forks from a `plan_template`. Each `user_plan_day` tracks status (locked/available/in_progress/completed), unlock time, and actual activity date.

**Dependencies:** 0004 (references `plan_templates`), 0003 (references `workouts`).

---

### 0007 — `0007_create_sessions.sql`

**Tables created:**
- `workout_sessions`
- `workout_exercise_sessions`

**Purpose:** Records actual performed workout sessions with per-exercise tracking. Each `workout_session` is idempotent via `client_operation_id`. Supports both plan-sourced and Discover-sourced sessions.

**Dependencies:** 0003 (references `workouts`, `workout_exercises`), 0006 (references `user_plan_days`).

---

### 0008 — `0008_create_favorites_notifications.sql`

**Tables created:**
- `favorite_workouts`
- `push_subscriptions`
- `notification_preferences`

**Purpose:** User favorites for quick-access workout bookmarking, web push notification subscriptions (multi-device), and per-user notification opt-in preferences.

**Dependencies:** 0003 (references `workouts`).

---

### 0009 — `0009_create_sync_operations.sql`

**Tables created:**
- `sync_operations`

**Purpose:** Server-side operation queue for offline idempotency. Tracks client-generated operation IDs through pending/processing/completed/failed states. Prevents duplicate data from reconnection or offline sync retries.

**Dependencies:** None (standalone user-scoped table).

---

### 0010 — `0010_create_functions.sql`

**Functions created:**
- `complete_plan_day(p_user_plan_day_id UUID, p_session_id UUID)` — atomically marks a plan day and session as completed, then unlocks the next day
- `calculate_current_streak(p_user_id UUID)` — counts consecutive workout days ending today
- `calculate_bmi(p_weight_kg NUMERIC, p_height_cm NUMERIC)` — returns BMI rounded to 1 decimal

**Purpose:** Encapsulates multi-table atomic state transitions and derived calculations that must not be split across separate client queries. All functions use `SECURITY DEFINER`.

**Dependencies:** 0006 (writes to `user_plan_days`), 0007 (reads/writes `workout_sessions`), 0005 (reads `fitness_profiles`).

---

### 0011 — `0011_enable_rls_policies.sql`

**Policies created:** All private table ownership policies and all public table read policies (see `rls.md` and `rls-matrix.md`).

**Purpose:** Enables Row Level Security on every table and creates the complete set of access policies. Private tables enforce `auth.uid()` ownership. Public tables allow authenticated read access.

**Dependencies:** 0001 through 0009 (all tables must exist before policies can be created).

---

### 0012 — `0012_seed_reference_data.sql`

**Data inserted:**
- `levels` — Beginner, Intermediate, Advanced
- `focus_areas` — Full Body, Abs, Arm, Chest, Butt & Legs
- `workout_categories` — Picks for You, Stretching & Warmup, Fat Burning, Strength & Tone
- `equipment` — None, Dumbbells, Resistance Band, Bench, Mat
- `physical_restrictions` — Low Impact, No Jumping
- `exercise_restrictions` — No Jumping, Low Impact, Knee Sensitive, Back Sensitive, No Crunch
- `muscles` — 16 muscle groups from ExerciseDB taxonomy

**Purpose:** Populates all controlled vocabulary tables with initial reference data. Uses `ON CONFLICT DO NOTHING` for idempotent re-runs.

**Dependencies:** 0001 (all reference tables must exist).

---

## Execution Order

Migrations run in numerical order. The dependency chain is:

```
0001  →  0002  →  0003  →  0004  →  0006  →  0007
                         ↘                ↘
                          0005             0008
                                            ↘
                                            0009
                         ↘       ↘       ↘
                          0010 ← all prior
                                    ↘
                                    0011 ← all prior
                                    0012 ← 0001
```

The numbering ensures every migration can safely reference objects from earlier migrations. Never reorder or skip migrations.

## Running Migrations

### Fresh database (recommended for development)

```bash
supabase db reset
```

This drops and recreates the database, runs all migrations in order, then executes the seed file.

### Apply a single new migration

```bash
supabase migration up
```

### Check migration status

```bash
supabase migration list
```

## Rollback Strategy

Supabase does not provide automatic rollback. Each migration must be manually reversed if a rollback is required.

For development, the simplest rollback is a full reset:

```bash
supabase db reset
```

For production or partial rollback, create a reversal migration manually:

1. Inspect the migration that needs to be reversed
2. Write a new migration that drops the created objects
3. Apply it in order

Example reversal for `0001`:

```sql
DROP TABLE IF EXISTS exercise_muscles CASCADE;
DROP TABLE IF EXISTS exercise_restriction_map CASCADE;
DROP TABLE IF EXISTS exercise_equipment CASCADE;
DROP TABLE IF EXISTS exercise_levels CASCADE;
DROP TABLE IF EXISTS exercise_focus_areas CASCADE;
DROP TABLE IF EXISTS exercise_restrictions CASCADE;
DROP TABLE IF EXISTS physical_restrictions CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS workout_categories CASCADE;
DROP TABLE IF EXISTS muscles CASCADE;
DROP TABLE IF EXISTS focus_areas CASCADE;
DROP TABLE IF EXISTS levels CASCADE;
```

In practice, rollback should only occur during development. Production databases should be treated as append-only — new migrations that fix issues are preferred over reversing applied changes.
