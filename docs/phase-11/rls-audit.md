# Phase 11 — Row Level Security Audit & Penetration Results

## Policy inventory

All member tables have RLS ENABLED with `user_id = auth.uid()` style policies:
`profiles`, `fitness_profiles`, `weight_entries`, `user_physical_restrictions`,
`user_plans`, `user_plan_days`, `workout_sessions`, `workout_exercise_sessions`,
`favorite_workouts`, `notification_preferences`, `push_subscriptions`,
`notifications`, plus Phase-8 sync tables. Public content tables (`exercises`,
`workouts`, `plan_templates`, levels, restriction catalog) are world-readable with
no member writes (verified: UPDATE affects 0 rows and content is unchanged).

## Live penetration matrix

Method: two freshly provisioned accounts (A = attacker, B = victim) via admin API;
A attempts SELECT/UPDATE/DELETE on every one of B's rows using the anon-key client
(`src/scripts/e2e-phase11.ts`). RLS "silent filter" semantics are handled by asserting
zero affected rows **and** service-role verification that data is untouched.

| Table | SELECT | UPDATE | DELETE |
|---|---|---|---|
| profiles (by user_id) | ✅ denied | ✅ denied | n/a (PK) |
| fitness_profiles | ✅ | ✅ | ✅ |
| weight_entries | ✅ | ✅ | ✅ |
| user_plans | ✅ | ✅ | ✅ |
| user_plan_days | ✅ | ✅ | ✅ |
| workout_sessions | ✅ | ✅ | ✅ |
| workout_exercise_sessions | ✅ | ✅ | ✅ |
| favorite_workouts (composite PK) | ✅ | ✅ | ✅ |
| notification_preferences | ✅ | ✅ | n/a (PK) |
| push_subscriptions | ✅ | ✅ | ✅ |
| notifications | ✅ | ✅ | ✅ |
| exercises / workouts (public) | read ok | ✅ write denied | — |

**Result: 57/57 checks pass.**

## RPC surface

- `complete_workout_session_rpc`: anonymous → `forbidden`; foreign owner →
  `forbidden`; locked plan day → `plan_day_locked`; replay → `already_completed`
  no-op; 6-way concurrent burst converges to a single progression + single
  notification.
- Legacy dangerous functions **dropped** in migration 0020:
  `complete_plan_day(UUID,UUID)` (SECURITY DEFINER, unowned), stale
  `calculate_current_streak(UUID)`, `calculate_bmi(NUMERIC,NUMERIC)`.
  Verified live: call now returns function-not-found.

## Migration history of this phase

| Migration | Purpose |
|---|---|
| 0020 | Re-harden RPC guard (anon check + IS DISTINCT FROM), revoke from anon, drop legacy functions, dedupe + partial unique indexes (one active plan / one in-progress session per user) |
| 0021 | BEFORE INSERT/UPDATE triggers blocking client-role writes of `status='completed'` on `user_plan_days` and `workout_sessions` |
| 0022 | RPC rejects completions bound to LOCKED plan days |
| 0023 | Missing preferences row counts as enabled (fixes SELECT INTO nulling) |
| 0024 | Rebuild unsatisfiable `reminder_time` CHECK with backslash-free regex |

All applied to the remote project (`supabase migration list` shows local=remote).
