# Phase 11 — E2E Results (live remote database)

Suite: `src/scripts/e2e-phase11.ts` — **57 passed, 0 failed**.

## A. Security regression guards
- ✅ QA-C2: legacy `complete_plan_day` removed (RPC → function-not-found)
- ✅ QA-C1: anonymous completion RPC fails closed (`forbidden`)
- ✅ Trigger: client-role INSERT of a `completed` workout session rejected

## B. RLS penetration matrix (A attacks B, 12 tables)
- ✅ Cross-account SELECT / UPDATE / DELETE denied on every private table
  (profiles, fitness_profiles, weight_entries, restrictions link table,
  user_plans, user_plan_days, workout_sessions, exercise_sessions,
  favorites, notification_preferences, push_subscriptions, notifications)
- ✅ Public catalog readable; member write attempts filtered (0 rows) with
  content verified unchanged via service role

## C. Plan integrity & idempotency (30-day journey)
- ✅ Template yields exactly 30 days; Day1 available, Days 2–30 locked
- ✅ Crafted locked-day session completion rejected by RPC (`plan_day_locked`),
  Day 5 remains locked
- ✅ Day1 completion unlocks Day2 only; duplicate completion flagged
  `already_completed`; no second unlock (timestamp unchanged)
- ✅ Notification dedupe on replay (exactly one row)
- ✅ 6 concurrent replays all report `already_completed`; state converges;
  still exactly one notification after burst
- ✅ Concurrent active-plan creation blocked by partial unique index

## D. Account deletion cascade
- ✅ `auth.admin.deleteUser` removed profiles, fitness_profiles, weight_entries,
  user_plans, plan days, sessions, favorites, notification preferences, push
  subscriptions, notifications for the deleted identity (row-count == 0 each)

## HTTP suite
See api-security.md (`src/scripts/api-phase11.ts`, **12/12**): 401 gate, zod 400s,
locked-day rejection through the sync path, replay idempotency over HTTP,
cross-user hijack fail-closed without error leakage.
