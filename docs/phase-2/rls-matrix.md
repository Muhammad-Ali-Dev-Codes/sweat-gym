# RLS Policy Matrix

Complete policy matrix for all 32 tables. Policies defined in `0011_enable_rls_policies.sql`.

## Legend

- **own {resource}** — policy verifies `auth.uid() = user_id`
- **own {resource} (via join)** — policy verifies ownership through parent table
- **authenticated read** — `TO authenticated USING (true)`, read-only for all authenticated users
- **blocked** — no policy exists; RLS denies the operation

---

## Private Tables

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Users can view own profile | Users can insert own profile | Users can update own profile | blocked |
| `fitness_profiles` | Users can view own fitness profile | Users can insert own fitness profile | Users can update own fitness profile | blocked |
| `user_physical_restrictions` | Users can view own physical restrictions | Users can insert own physical restrictions | blocked | Users can delete own physical restrictions |
| `weight_entries` | Users can view own weight entries | Users can insert own weight entries | blocked | Users can delete own weight entries |
| `user_plans` | Users can view own plans | Users can insert own plans | Users can update own plans | blocked |
| `user_plan_days` | Users can view own plan days | blocked | Users can update own plan days | blocked |
| `workout_sessions` | Users can view own sessions | Users can insert own sessions | Users can update own sessions | blocked |
| `workout_exercise_sessions` | Users can view own exercise sessions (via join) | Users can insert own exercise sessions (via join) | Users can update own exercise sessions (via join) | blocked |
| `favorite_workouts` | Users can view own favorites | Users can insert own favorites | blocked | Users can delete own favorites |
| `push_subscriptions` | Users can view own subscriptions | Users can insert own subscriptions | Users can update own subscriptions | blocked |
| `notification_preferences` | Users can view own notification preferences | Users can insert own notification preferences | Users can update own notification preferences | blocked |
| `sync_operations` | Users can view own sync operations | Users can insert own sync operations | Users can update own sync operations | blocked |

## Public Tables

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `levels` | Authenticated users can read | blocked | blocked | blocked |
| `focus_areas` | Authenticated users can read | blocked | blocked | blocked |
| `workout_categories` | Authenticated users can read | blocked | blocked | blocked |
| `equipment` | Authenticated users can read | blocked | blocked | blocked |
| `physical_restrictions` | Authenticated users can read | blocked | blocked | blocked |
| `exercise_restrictions` | Authenticated users can read | blocked | blocked | blocked |
| `muscles` | Authenticated users can read | blocked | blocked | blocked |
| `exercises` | Authenticated users can read | blocked | blocked | blocked |
| `exercise_focus_areas` | Authenticated users can read | blocked | blocked | blocked |
| `exercise_levels` | Authenticated users can read | blocked | blocked | blocked |
| `exercise_equipment` | Authenticated users can read | blocked | blocked | blocked |
| `exercise_restriction_map` | Authenticated users can read | blocked | blocked | blocked |
| `exercise_muscles` | Authenticated users can read | blocked | blocked | blocked |
| `workouts` | Authenticated users can read | blocked | blocked | blocked |
| `workout_exercises` | Authenticated users can read | blocked | blocked | blocked |
| `workout_category_map` | Authenticated users can read | blocked | blocked | blocked |
| `workout_focus_areas` | Authenticated users can read | blocked | blocked | blocked |
| `workout_levels` | Authenticated users can read | blocked | blocked | blocked |
| `plan_templates` | Authenticated users can read | blocked | blocked | blocked |
| `plan_template_days` | Authenticated users can read | blocked | blocked | blocked |
