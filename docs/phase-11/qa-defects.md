# Phase 11 — QA Defect Register

Status legend: FIXED = code/migration shipped and verified live; WAIVED = accepted
with rationale.

| ID | Sev | Area | Defect | Resolution |
|----|-----|------|--------|------------|
| QA-C1 | CRITICAL | DB/RPC | Migration 0018 re-created completion RPC with `IF v_user_id <> auth.uid()` guard — NULL passes for anonymous callers; reverted 0017 hardening | **FIXED** — 0020 re-hardens (`IS DISTINCT FROM` + explicit anon check, REVOKE from anon); verified live |
| QA-C2 | CRITICAL | DB/RPC | Legacy `complete_plan_day(UUID,UUID)` SECURITY DEFINER with zero ownership checks still callable; nothing in src references it | **FIXED** — dropped in 0020; live call returns function-not-found |
| QA-H1 | HIGH | DB/RLS | Client-role sessions could rewrite plan-day/session status arbitrarily (bypassing pacing) | **FIXED** — 0021 BEFORE INSERT/UPDATE triggers reject client-role `status='completed'` writes; verified live |
| QA-H2 | HIGH | API | `/api/sync` trusted `userPlanDayId` from payload → crafted skip-ahead completions | **FIXED** — route validates ownership (RLS-scoped SELECT) + non-locked status → 400; RPC adds second gate (0022); verified live |
| QA-H3 | HIGH | Domain | Plan-generated workouts ignored member physical restrictions at session build time (discover path only) | **FIXED** — restriction fetch/replacement applied to BOTH sources in startWorkout; per rules "where possible" fail-open retained |
| QA-H5 | HIGH | Domain | Resume picked any in-progress workout for the workoutId regardless of source/day → stalled days | **FIXED** — `getIncompleteSession(userId, workoutId, {source, planDayId})`; caller scoped |
| QA-H6 | HIGH | DB | Race allowed two active plans / duplicate in-progress sessions | **FIXED** — dedupe + partial unique indexes (0020); concurrent-insert test passes |
| QA-H7 | HIGH | DB/RPC | PL/pgSQL `SELECT INTO` nulled preference defaults when no settings row existed → ALL notifications silently suppressed for such members | **FOUND+FIXED this phase** — 0023 restores enabled defaults on NOT FOUND; live-verified notifications fire |
| QA-H8 | HIGH | DB/Prod | 0018 CHECK on `reminder_time` used over-escaped regex → constraint unsatisfiable incl. its own DEFAULT; table unwritable since Phase 10 (settings feature broken) | **FOUND+FIXED this phase** — 0024 rebuilds constraint backslash-free; live-verified writes succeed |
| QA-H9 | HIGH | API | `/api/sync` upsert omitted NOT NULL `client_operation_id` → every queued offline completion failed 500 at delivery | **FOUND+FIXED this phase** — persists queue `operationId`; HTTP suite green end-to-end |
| QA-M1 | MED | DB | Duplicate in-progress sessions per user possible via races | **FIXED** — dedupe + partial unique index (0020) |
| QA-M4 | MED | Domain | Pacing rejection happened AFTER healing locked day → transient unlock inconsistency on failure | **FIXED** — rejection check reordered before any write |
| QA-M6 | MED | PWA | Manifest referenced 4 PNG icons that did not exist (`public/icons/` empty) → install criteria broken | **FOUND+FIXED** — generated icon-192/512 + maskable variants (valid PNGs, sips-verified) |
| QA-L1 | LOW | API | Sync 500s leaked internal error strings to clients | **FIXED** — generic messages, details logged server-side |
| QA-L2 | LOW | Auth | OAuth callback open-redirect via `next` param | **FIXED** — same-origin allow-list, fallback `/dashboard` |
| QA-L3 | LOW | Schema | Sync schema accepted arbitrary `startedAt` shapes; profile/onboarding actions lacked input validation | **FIXED** — `isoOrParsable`, zod on createOrUpdateProfile/updateOnboardingStatus |
| A1 | MED | Frontend | Dashboard computed day keys/greeting/week labels in server TZ not member TZ | **FIXED** — tz-aware helpers (`dayKeyInTz`, local hour/weekday, labels with timeZone) |
| A2 | MED | Reports | Stats cap 400 vs documented 1000 truncated histories | **FIXED** — unified 1000 |
| A3 | LOW | Reports | Calorie burn uses hardcoded MET intensity (ignores fitness level) | **WAIVED** — matches V1 estimate spec; refinement deferred |
| B1 | MED | UI | PWA banner white-on-white text | **FIXED** — theme token |
| B2 | MED | A11y | Timer transitions invisible to screen readers | **FIXED** — event-driven aria-live announcements (see accessibility-audit.md) |
| B5 | MED | UI | Profile save false "Saved" on failure | **FIXED** — error state + role=alert |
| B14 | LOW | A11y | Signup toggle aria-label typo | **FIXED** |

## Process findings

- Phase 10's audit skipped live-DB execution "to avoid writing to the remote
  project"; both production-breaking defects QA-H8/QA-H9 shipped through exactly
  that gap. Phase 11's mandate to run live verification caught them.
- Head-count queries with a dummy column return `count:null` from PostgREST —
  corrected mid-suite before certification so all reported numbers are honest.
