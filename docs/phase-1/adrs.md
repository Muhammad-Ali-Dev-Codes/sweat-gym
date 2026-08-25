# Architecture Decision Records — Gym Member Fitness PWA

Phase: Phase 1 — System Architecture
Version: 0.1.0
Date: 2026-08-19
Status: Proposed (accepted pending Phase 1 review)

Each ADR records: Status, Context, Decision, Consequences, and where it is enforced.

---

## ADR-001 — Next.js full-stack instead of a separate Express backend

- **Status:** Accepted
- **Context:** Need a server layer for secure operations (plan generation, ingestion, sync validation) plus a mobile-first frontend. A separate backend adds deployment and maintenance cost.
- **Decision:** Use a single Next.js (App Router) application for both frontend and backend (Server Actions + Route Handlers). No separate Express/NestJS service.
- **Consequences:** Simpler deployment (Vercel), one codebase, shared types; must be disciplined about server/client boundaries.
- **Enforced by:** folder architecture; coding rules (secrets, RLS).

---

## ADR-002 — Supabase PostgreSQL instead of MongoDB or self-hosted Postgres

- **Status:** Accepted
- **Context:** Need relational data, RLS, auth, and hosted simplicity. Approved stack mandates Supabase.
- **Decision:** Supabase PostgreSQL as the database; RLS as the authorization boundary; Supabase Auth for authentication.
- **Consequences:** Strong relational integrity; RLS everywhere; no separate auth service.
- **Enforced by:** Phase 2 schema; RLS matrix.

---

## ADR-003 — Rule-based personalization instead of AI plan generation

- **Status:** Accepted
- **Context:** Master context explicitly forbids AI-generated workout logic in V1 and requires deterministic, testable personalization.
- **Decision:** Personalization is a deterministic rule engine (base plan + compatibility filtering/replacement). No LLM in plan/workout decisions.
- **Consequences:** Testable, explainable; content curation required for base plans and replacements.
- **Enforced by:** domain services; invariants; no-LLM coding rule.

---

## ADR-004 — ExerciseDB as a replaceable ingestion source

- **Status:** Accepted
- **Context:** ExerciseDB free API is non-commercial/educational; media must be replaceable; app must not depend on live ExerciseDB.
- **Decision:** ExerciseDB is an ingestion/import layer only (server-side scripts). Store `external_source` + `external_exercise_id`; media via abstraction. App serves content from our DB.
- **Consequences:** App works without ExerciseDB; media licensing risk isolated; ingestion must map taxonomy.
- **Enforced by:** media abstraction; server-only client; UI never reads ExerciseDB.

---

## ADR-005 — Dexie/IndexedDB for offline persistence

- **Status:** Accepted
- **Context:** Need durable local state (workout player snapshot, outbox, recent progress) with a simple API.
- **Decision:** Dexie over IndexedDB for all client-side persistent state.
- **Consequences:** Offline capability; device-specific state; sync required for server truth.
- **Enforced by:** offline architecture; sync engine.

---

## ADR-006 — Serwist for PWA / service worker

- **Status:** Accepted
- **Context:** Approved stack mandates Serwist; need installability, offline shell, and media caching.
- **Decision:** Serwist manages the service worker (precache app shell/static, runtime cache approved media). SW never caches authenticated private responses.
- **Consequences:** Reliable offline shell; explicit cache invalidation; careful update strategy to preserve workout state.
- **Enforced by:** cache strategy; PWA update rules.

---

## ADR-007 — Plan template vs user plan separation

- **Status:** Accepted
- **Context:** Base plans are shared; per-user personalization must not mutate shared templates.
- **Decision:** Base plan templates (shared) and user plan instances (per user, generated once) are separate entities.
- **Consequences:** One template serves many users; personalization lives at user-plan level; R10 (no regeneration) is enforceable.
- **Enforced by:** schema separation; plan generation use case; invariants.

---

## ADR-008 — Workout vs workout session separation

- **Status:** Accepted
- **Context:** Workouts are fixed content; sessions record real attempts with per-exercise states.
- **Decision:** Workout (template) and Workout Session (performed attempt) are distinct entities; exercise-level session records track completed/skipped.
- **Consequences:** Accurate history; resume support; reports derived from sessions.
- **Enforced by:** schema; session recording use case; invariants.

---

## ADR-009 — RLS for all private member data

- **Status:** Accepted
- **Context:** Member data is private; never trust client-supplied user IDs.
- **Decision:** Every private table has RLS policies keyed to the authenticated session; server derives identity from session only.
- **Consequences:** Strong data isolation; server code paths use service role only for ingestion/admin.
- **Enforced by:** RLS matrix; Phase 2 policies; security tests.

---

## ADR-010 — No microservices in V1

- **Status:** Accepted
- **Context:** Small team; V1 simplicity; serverless-friendly.
- **Decision:** Monolithic Next.js + Supabase. Domain boundaries allow future extraction without redesign.
- **Consequences:** Minimal ops; scaling handled by host/DB.
- **Enforced by:** deployment architecture.

---

## ADR-011 — Idempotent workout completion via client_action_id

- **Status:** Accepted
- **Context:** Duplicate completions (double click, retry, offline sync) must not create duplicate sessions.
- **Decision:** Client generates a UUID `client_action_id` per session; server unique constraint `(user_id, client_action_id)`; offline outbox reuses it.
- **Consequences:** Single source of dedupe; requires client to persist the key across retries.
- **Enforced by:** schema unique constraint; sync engine; invariants (INV-11, INV-12).

---

## ADR-012 — Outbox pattern for offline sync

- **Status:** Accepted
- **Context:** Offline actions must survive and sync without loss or duplication.
- **Decision:** Local outbox (IndexedDB) records pending actions; sync engine sends with idempotency; states pending/syncing/synced/failed; failed actions preserved with diagnostics.
- **Consequences:** No silent data loss; deterministic retries; recoverable failures.
- **Enforced by:** sync engine; offline architecture.

---

## ADR-013 — TanStack Query for server state; no Redux

- **Status:** Accepted
- **Context:** Need server-state caching/invalidation without introducing a global store.
- **Decision:** TanStack Query for server state; React local state for UI state; Dexie for workout/offline state. No Redux unless a concrete requirement emerges.
- **Consequences:** Less boilerplate; centralized query keys.
- **Enforced by:** state management architecture; query-key factory.

---

## ADR-014 — Deterministic streak algorithm (Plan + Discover, member timezone)

- **Status:** Accepted
- **Context:** Phase 0 required a deterministic streak but deferred the exact rule (O-05).
- **Decision:** A workout day = any calendar day (member timezone) with ≥1 completed session (plan or discover). Streak = consecutive workout days ending today or yesterday. Multiple sessions per day count once. Pure function `computeStreak(workoutDays, today, tz)`.
- **Consequences:** Simple, testable, reproducible; consistent with reports including both sources.
- **Enforced by:** StreakService; unit tests; `decisions.md` P1-D-11.

---

## ADR-015 — MET-based calorie estimation

- **Status:** Accepted
- **Context:** Calories must be estimates using weight, intensity, duration (O-08); no universal fixed value.
- **Decision:** `kcal = MET × weight_kg × duration_hours`; MET by workout intensity (light 3.5 / moderate 5.0 / high 7.5, approximate Compendium values); rounded to integer; labeled as estimate.
- **Consequences:** Deterministic and defensible; not medically exact (documented limitation).
- **Enforced by:** CalorieEstimationService; unit tests; `decisions.md` P1-D-12.

---

## ADR-016 — UTC timestamps + member timezone for day boundaries

- **Status:** Accepted
- **Context:** Streak/reports/daily goal/notifications need correct "day" semantics across timezones.
- **Decision:** Store timestamps as `timestamptz` (UTC). Store member IANA timezone (browser-derived). All day-boundary logic uses member timezone; server never assumes its own timezone.
- **Consequences:** Correct behavior across timezones; requires tz plumbing into aggregation services.
- **Enforced by:** timezone architecture; StreakService/ReportService.
