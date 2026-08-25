# Row Level Security Architecture

## Overview

Every table in the database has RLS enabled. Tables fall into two categories:

- **Private tables** — contain user-specific data. A user can only read and write their own rows.
- **Public tables** — contain shared content (exercises, workouts, plan templates, reference data). Any authenticated user can read them. No client write access is granted.

All policies are defined in `0011_enable_rls_policies.sql`.

## How RLS Works with Supabase Auth

Supabase exposes `auth.uid()`, which returns the UUID of the currently authenticated user from `auth.users`. Every RLS policy references this function to scope access.

A helper function wraps this call:

```sql
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$ SELECT auth.uid() $$;
```

When a query runs through the Supabase PostgREST API, PostgreSQL evaluates every applicable policy for the table. A row is visible only if at least one SELECT policy evaluates to `true` for that row. Writes succeed only if the relevant INSERT/UPDATE/DELETE policy evaluates to `true`.

Unauthenticated requests see zero rows on every table because no policy grants access to the `anon` role.

## Private Tables

Private tables store user-owned data. Policies enforce `auth.uid() = user_id` or an equivalent ownership join.

### Direct ownership (user_id column matches auth.uid())

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | own profile | own profile | own profile | — |
| `fitness_profiles` | own fitness profile | own fitness profile | own fitness profile | — |
| `user_physical_restrictions` | own restrictions | own restrictions | — | own restrictions |
| `weight_entries` | own entries | own entries | — | own entries |
| `user_plans` | own plans | own plans | own plans | — |
| `workout_sessions` | own sessions | own sessions | own sessions | — |
| `favorite_workouts` | own favorites | own favorites | — | own favorites |
| `push_subscriptions` | own subscriptions | own subscriptions | own subscriptions | — |
| `notification_preferences` | own preferences | own preferences | own preferences | — |
| `sync_operations` | own operations | own operations | own operations | — |

### Ownership through parent join (no direct user_id column)

Two tables have no `user_id` column. Ownership is verified by joining to their parent table:

**`user_plan_days`** — accessed through `user_plans`:

```sql
USING (
  EXISTS (
    SELECT 1 FROM user_plans
    WHERE user_plans.id = user_plan_days.user_plan_id
      AND user_plans.user_id = auth.uid()
  )
)
```

- SELECT: can view own plan days
- UPDATE: can update own plan days

**`workout_exercise_sessions`** — accessed through `workout_sessions`:

```sql
USING (
  EXISTS (
    SELECT 1 FROM workout_sessions
    WHERE workout_sessions.id = workout_exercise_sessions.workout_session_id
      AND workout_sessions.user_id = auth.uid()
  )
)
```

- SELECT: can view own exercise sessions
- INSERT: can insert own exercise sessions
- UPDATE: can update own exercise sessions

## Public Tables

Public tables contain shared reference content. Every authenticated user can read them. No INSERT, UPDATE, or DELETE policies are created, so writes are blocked by default when RLS is enabled.

| Table | SELECT |
|---|---|
| `levels` | authenticated users can read |
| `focus_areas` | authenticated users can read |
| `workout_categories` | authenticated users can read |
| `equipment` | authenticated users can read |
| `physical_restrictions` | authenticated users can read |
| `exercise_restrictions` | authenticated users can read |
| `muscles` | authenticated users can read |
| `exercises` | authenticated users can read |
| `exercise_focus_areas` | authenticated users can read |
| `exercise_levels` | authenticated users can read |
| `exercise_equipment` | authenticated users can read |
| `exercise_restriction_map` | authenticated users can read |
| `exercise_muscles` | authenticated users can read |
| `workouts` | authenticated users can read |
| `workout_exercises` | authenticated users can read |
| `workout_category_map` | authenticated users can read |
| `workout_focus_areas` | authenticated users can read |
| `workout_levels` | authenticated users can read |
| `plan_templates` | authenticated users can read |
| `plan_template_days` | authenticated users can read |

Each public table has a single policy in the form:

```sql
CREATE POLICY "Authenticated users can read <table>"
  ON <table> FOR SELECT
  TO authenticated USING (true);
```

## Security Considerations

### service_role bypasses RLS

The Supabase `service_role` key bypasses all RLS policies. It must never be exposed to the client. Server-side functions and admin operations that need unrestricted access use this key through environment variables only.

### SECURITY DEFINER functions

All database functions (`complete_plan_day`, `calculate_current_streak`, `calculate_bmi`) are defined with `SECURITY DEFINER`. This means they execute with the permissions of the function owner (the role that created them), not the calling user. This is necessary because:

- `complete_plan_day` needs to UPDATE both `workout_sessions` and `user_plan_days` in a single atomic operation. Without SECURITY DEFINER, the function would need to satisfy both tables' RLS policies simultaneously, which creates fragile cross-table ownership checks.
- `calculate_current_streak` and `calculate_bmi` are read-only utility functions. SECURITY DEFINER ensures they can access the data they need without requiring the client to construct complex join queries through RLS.

When calling SECURITY DEFINER functions from the client, the application must still validate that the user owns the data being operated on. The function trusts the caller's intent — RLS alone is not the safety boundary for these operations.

### No write policies on public tables

Public tables have RLS enabled but only SELECT policies. Any INSERT, UPDATE, or DELETE from a non-service_role client will be rejected by PostgreSQL. Only the `service_role` key or direct database admin access can modify public content. This is the mechanism that prevents users from altering the exercise library, workout definitions, or plan templates.

### Unauthenticated access

The `anon` role (unauthenticated requests) has no policies on any table. RLS blocks all access for unauthenticated users by default.
