# Database Testing Plan

## Unit Tests

### complete_plan_day

Tests for the PostgreSQL function that marks a plan day as complete and advances the user.

- **Idempotency**: Calling `complete_plan_day` twice on the same day must not create duplicate completed entries or error. The function must be safe to retry.
- **Unlocking the next day**: After completing day N, day N+1 in `user_plan_days` must have its status changed from `'locked'` to `'active'`.
- **Boundary (day 30)**: Completing the final day (day 30 of a 30-day plan) must not attempt to unlock a non-existent day. The plan should be marked as completed.

### calculate_current_streak

Tests for the function that computes the user's current consecutive-day streak.

- **Consecutive days**: Given completed days on Monday through Friday with no gaps, the streak must return 5.
- **Gap resets streak**: Given completed days on Monday–Wednesday, a gap on Thursday, and completion on Friday, the streak must return 1 (Friday only).
- **Today-only streak**: A single completed workout today must return a streak of 1.

### calculate_bmi

Tests for the BMI calculation helper.

- **Normal BMI**: Height 1.80 m, weight 72 kg must return 22.22.
- **Edge cases**: Zero weight must return null or 0 (not divide-by-zero error). Negative values must be rejected or return null.

## RLS Tests

### Private Tables

User A inserts a row into a user-scoped table (e.g., `user_plans`, `workout_sessions`). User B, authenticated with a different `auth.uid()`, must NOT be able to `SELECT` that row.

### Public Tables

Authenticated users must be able to `SELECT` from public reference tables (`plan_templates`, `exercises`, `muscle_groups`, `equipment`, etc.) regardless of which user they are.

### Write Operations

A user must not be able to `INSERT`, `UPDATE`, or `DELETE` rows belonging to another user on any user-scoped table. Tests must verify that RLS policies deny these operations and return appropriate errors.

## Constraint Tests

### CHECK Constraints

Inserting invalid data must be rejected at the database level:

- `status` columns must only accept defined enum values (e.g., `'active'`, `'completed'`, `'locked'`).
- `difficulty_level` must be within the valid range.
- Negative values for `day_number`, `set_number`, or `rep_count` must be rejected.

### UNIQUE Constraints

Attempting to insert duplicate rows must fail:

- Duplicate `(user_id, day_number)` in `user_plan_days`.
- Duplicate `(user_id, endpoint)` in `push_subscriptions`.
- Duplicate `user_id` in `notification_preferences`.

### FK Constraints

Inserting a row that references a non-existent parent must fail:

- A `user_plans` row with a `plan_template_id` that does not exist in `plan_templates`.
- A `workout_sessions` row with a `user_plan_day_id` that does not exist in `user_plan_days`.
- An `exercise_sessions` row with a `workout_session_id` that does not exist in `workout_sessions`.

## Integration Tests

### Full Onboarding Flow

Execute the complete sequence a new user goes through and verify each table is populated correctly:

1. Create user profile in `profiles`.
2. Insert row into `fitness_profile`.
3. Insert rows into `user_physical_restrictions`.
4. Verify all three tables contain the correct `user_id` and data.

### Plan Assignment

Simulate assigning a plan template to a user:

1. Insert a row into `user_plans` referencing a `plan_templates` row.
2. Insert 30 rows into `user_plan_days` for that user plan.
3. Verify that day 1 has status `'active'` and days 2–30 have status `'locked'`.

### Workout Execution

End-to-end test of a single workout:

1. Create a `workout_sessions` row for an active plan day.
2. Create multiple `exercise_sessions` rows linked to the workout session.
3. Set `completed_at` on all exercise sessions.
4. Call `complete_plan_day`.
5. Verify the plan day is marked `'completed'` and the next day is `'active'`.

## Test Tooling

### Database-level (preferred)

Use `supabase db reset` to spin up a clean local database with all migrations applied, then run SQL assertion scripts that check row counts, column values, and error states.

### Application-level

Use Jest with `@supabase/supabase-js` to test RLS policies from the client perspective, simulating authenticated requests as different users.
