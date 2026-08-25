# Testable Architectural Invariants — Gym Member Fitness PWA

Phase: Phase 1 — System Architecture
Version: 0.1.0
Date: 2026-08-19
Status: Approved (architecture contract)

These invariants MUST always hold. Each is enforced at one or more layers and covered by tests (unit/integration/E2E). Phase 1 is the authoritative source; Phase 2 adds DB-level enforcement; Phase 11 adds test coverage gates.

Legend — Enforcement layers:
- **DB** = database constraint (Phase 2)
- **Domain** = domain service logic
- **App** = application use case / server action
- **RLS** = Row Level Security
- **SW** = service worker / offline sync engine
- **UI** = presentation guard (never the only guard)

---

## AUTH & ACCOUNT

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-01 | A user cannot read or modify another user's private data (profile, weight, plan, sessions, favorites). | RLS, App | RLS is the hard boundary; app logic is defense-in-depth. |
| INV-02 | Authenticated identity always comes from the verified session, never a client-supplied `user_id`. | App, RLS | Coding rule #9. |
| INV-03 | A protected app route requires a valid session; unverified accounts cannot reach the personalized dashboard. | App, UI | Auth guard/middleware. |
| INV-04 | Deleting an account removes all of that user's private records; no orphaned private data remains accessible. | App, DB | Cascade + server-side deletion. |
| INV-05 | Account deletion is scoped to the authenticated user only. | RLS, App | Identity from session. |

## ONBOARDING & PLAN GENERATION

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-06 | A user has at most one user plan in V1; retries never create a second plan. | DB, App | Unique constraint on active user plan; idempotent generation. |
| INV-07 | Plan generation is deterministic: same inputs → same user plan (for same base plan + restrictions). | Domain | No randomness/AI. |
| INV-08 | The personalized plan derives from the base plan for the member's fitness level and is filtered by physical concerns only. | Domain, App | Base plan + deterministic filtering/replacement. |
| INV-09 | Updating the profile (level, height, weight, concerns) never regenerates or mutates the existing user plan in V1. | App, Domain | R10; guarded by app logic + tests. |

## PLAN PROGRESSION

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-10 | Day N+1 unlocks only after Day N is completed; a locked day cannot be started/completed. | DB, Domain, App | Progression service is authoritative; server validates. |
| INV-11 | A plan day cannot be skipped (no manual advance). | Domain, App | Only completion unlocks the next day. |
| INV-12 | Missing calendar days never reset the plan; the next incomplete day remains the active day. | Domain, App | `plan_day_number` independent of calendar. |
| INV-13 | `plan_day_number` and `actual_activity_date` are stored and treated separately. | DB, Domain | Distinct columns; distinct semantics. |
| INV-14 | Completing a plan day records the completion at most once (idempotent); repeated completion has no double-unlock side effects. | DB, App | client_action_id; day-completion idempotency. |

## WORKOUT & SESSIONS

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-15 | A workout can complete even when some exercises were skipped; reaching the end = completed. | Domain, App | R13. |
| INV-16 | Duplicate completion requests (double click, retry, refresh, reconnect) never create duplicate sessions. | DB, App | Unique `(user_id, client_action_id)`. |
| INV-17 | Every workout exercise session records status completed or skipped. | DB, App | No partial rows without status. |
| INV-18 | Interrupted workouts resume from the last unfinished exercise/state; resuming does not duplicate exercise records. | SW, App, DB | Snapshot + idempotent upsert. |
| INV-19 | A workout session references exactly one source: plan or discover. | DB, App | Check constraint `source ∈ {plan, discover}`. |

## DAILY GOAL / REPORTS / STREAK

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-20 | Only plan-sourced sessions advance the plan daily goal; Discover sessions never do. | Domain, App | R20. |
| INV-21 | Discover sessions DO count in reports and activity totals. | Domain, App | R21. |
| INV-22 | Reports include both plan and discover sessions; plan sessions are never excluded. | Domain, App | F-17. |
| INV-23 | Streak is computed deterministically from actual completed sessions (plan or discover) in the member's timezone. | Domain | ADR-014; pure function. |
| INV-24 | Multiple completed sessions on the same calendar day count as one streak day. | Domain | ADR-014. |
| INV-25 | Reports/activity are derived from underlying session and weight records; no duplicated report tables. | Domain, App | D-34. |

## WEIGHT / BMI

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-26 | Historical weight entries are never overwritten or deleted (append-only). | DB, App | R22. |
| INV-27 | Current weight = latest weight entry; no conflicting source of truth. | Domain, App | §39. |
| INV-28 | BMI is always derived from current height + latest weight; never stored stale. | Domain | R23. |
| INV-29 | Missing height or weight → BMI not displayed (placeholder), never a stale number. | Domain, UI | §19. |

## DISCOVER

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-30 | All Discover levels are accessible to all users; beginners may open advanced workouts. | App, UI | R17. |
| INV-31 | Discover personalization never mutates the global fixed workout. | Domain, App | Runtime/session variant only. |
| INV-32 | Incompatible exercises are replaced from the controlled library deterministically; no unsafe or AI-invented replacements. | Domain | R18, R19. |
| INV-33 | If no safe replacement exists, the outcome is explicit and documented (never silently unsafe). | Domain | O-06 fallback. |
| INV-34 | A workout appearing in multiple Discover groups is one record (no duplicate workout rows). | DB | Multi-category rule. |

## OFFLINE & SYNC

| ID | Invariant | Layers | Notes |
|----|-----------|--------|-------|
| INV-35 | Offline sync never creates duplicate sessions (same client_action_id → idempotent). | DB, SW | ADR-011/012. |
| INV-36 | Failed offline operations are preserved with diagnostics; never silently deleted. | SW | Sync lifecycle. |
| INV-37 | Server validates all synced offline data (user, workout validity, plan access, action uniqueness, timestamps, allowed transitions). | App, DB | Offline trust model. |
| INV-38 | The service worker never caches authenticated responses containing private member data in shared caches. | SW | Cache strategy. |
| INV-39 | A PWA/service-worker update never purges active workout state or pending sync queue. | SW | Update strategy. |
| INV-40 | Discover is not available offline in V1. | SW, UI | R27. |

---

## Enforcement Summary

- DB-level: INV-01*, 04, 06, 10, 14, 16, 17, 19, 26, 34, 35 (unique/check/FK constraints + RLS).
- Domain-level: INV-07, 08, 09, 11, 12, 13, 15, 20, 21, 22, 23, 24, 25, 27, 28, 31, 32, 33.
- App/Server-level: all INV-xx where server actions/handlers are the entry point.
- SW-level: INV-18, 35, 36, 38, 39, 40.
- UI-level: INV-03, 30 (UX guards only).

\* INV-01 is fundamentally RLS; DB is the hard boundary.

These invariants are the acceptance basis for unit/integration/E2E/offline tests in Phase 11 and for Phase 2 constraints.
