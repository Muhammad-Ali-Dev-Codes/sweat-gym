# Phase 1 Decisions — System Architecture

Phase: Phase 1 — System Architecture
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`, `/docs/phase-0/decisions.md`

This log records Phase 1 architectural decisions, including resolution of Phase 0 OPEN items owned by Phase 1, finalization of Phase 0 ASSUMED items, and new Phase 1 decisions/assumptions.

Status legend: `DECIDED` (approved in Phase 1), `ASSUMED` (working default, confirm with product owner), `OPEN` (deferred to a later phase), `OUT OF SCOPE`.

---

## 1. Phase 0 OPEN items resolved in Phase 1

| Phase 0 ID | Item | Resolution | Phase 1 ID |
|-----------|------|-----------|------------|
| O-01 | "No, I am fine" combined with other physical concerns | "No, I am fine" means "no restrictions". It is mutually exclusive with any other concern. UI prevents selecting it together with other concerns; server validation rejects the combination. An empty restriction set = no restrictions. | P1-D-01 |
| O-03 | Duplicate weight entry policy (same calendar day) | All entries are preserved (append-only, R22). Current weight = latest entry by `recorded_at`. Charts may display latest-per-day; history keeps every entry. | P1-D-03 |
| O-04 | Onboarding partial-progress: resume vs restart | Onboarding answers are drafted locally (IndexedDB) and only committed server-side at completion. Returning users resume at the last incomplete step from the local draft; if no local draft (e.g., different device), onboarding starts at step 1. | P1-D-02 |
| O-05 | Streak exact rule | Workout day = calendar day (member timezone) with ≥1 completed session (plan or discover). Streak = consecutive workout days ending today or yesterday; gap before yesterday → 0. Multiple sessions/day = one day. Pure function `computeStreak(workoutDays, today, tz)`. | P1-D-04, ADR-014 |
| O-06 | Exercise replacement fallback when none compatible | If no safe ranked replacement exists, apply (in order): (1) curated safe fallback exercise from a controlled pool; (2) mark the exercise as "not suitable for your profile" with clear explanation and adjust the workout's total duration accordingly. Never invent a replacement; never present an unsafe exercise. | P1-D-05 |
| O-08 | Exact calorie estimation formula | `kcal = MET × weight_kg × duration_hours`. MET by intensity: light 3.5 / moderate 5.0 / high 7.5. Default intensity from workout level (beginner→light, intermediate→moderate, advanced→high), overridable as workout metadata. Rounded to integer; labeled estimate. | P1-D-06, ADR-015 |

## 2. Phase 0 OPEN items deferred (explicitly not resolved here)

| Phase 0 ID | Item | Where resolved | Note |
|-----------|------|----------------|------|
| O-02 | Plan-day re-completion semantics for repeat sessions | Phase 5 (plan engine) | Phase 1 fixes the architectural behavior: re-opening a completed day is allowed; a repeated plan-sourced session records a new session (client_action_id) and does not unlock anything new. Whether repeat sessions re-count toward the daily goal is finalized in Phase 5. |
| O-07 | Offline favorites toggling | Phase 6 (offline) | V1 favorites are online-only; architecture keeps them out of the offline outbox. |
| O-09 | Final notification types list | Phase 10 | Candidates: workout reminder, new day available, streak reminder. |
| O-10 | Google OAuth email-conflict resolution | Phase 3 (auth) | Supabase identity handling; conflict UX defined then. |

## 3. Phase 0 ASSUMED items finalized in Phase 1

| Phase 0 ID | Assumption | Finalization | Phase 1 ID |
|-----------|------------|--------------|------------|
| A-01 | Push-up ability enum | `push_up_ability ∈ {cant, '0_5', '5_10', '10_20', 'over_20'}` | P1-D-07 |
| A-02 | Plank ability enum | `plank_ability ∈ {cant, '0_30', '30_60', '60_120', 'over_120'}` | P1-D-07 |
| A-03 | Fitness level enum | `fitness_level ∈ {beginner, intermediate, advanced}` | P1-D-07 |
| A-04 | Physical concerns | Restriction set ⊆ {low_impact, no_jumping}; empty = none; no_restrictions flag not stored (empty set encodes it). | P1-D-01, P1-D-07 |
| A-05 | Age range | 13–100 (years) | P1-D-08 |
| A-06 | Height/weight ranges | height_cm 100–250; weight_kg 30–300 | P1-D-08 |
| A-07 | "No, I am fine" exclusivity | Resolved (see O-01) | P1-D-01 |
| A-08 | Target weight equal/greater than current allowed | Confirmed: journey can be maintenance or gain; no direction restriction. | P1-D-09 |
| A-09 | Daily goal = target duration + target calories of plan workout | Confirmed. | P1-D-10 |
| A-11 | Onboarding partial-progress | Resume from local draft (see O-04) | P1-D-02 |
| A-12 | Re-opening completed plan day | Allowed for view/repeat; architecture defined (see O-02). | P1-D-11 |
| A-13 | Rest timer per workout-exercise | Content defines rest per prescription; default 30s where unspecified (Phase 5). | P1-D-12 |
| A-15 | Calorie estimation | MET formula (see O-08) | P1-D-06 |
| A-18 | Duration filters from real values | Confirmed; duration attribute stored as real minutes. | P1-D-13 |

## 4. New Phase 1 decisions

| ID | Decision |
|----|----------|
| P1-D-01 | "No, I am fine" is mutually exclusive with other concerns; empty restriction set = no restrictions. |
| P1-D-02 | Onboarding draft lives locally (IndexedDB); server commit happens only at completion; resume from draft. |
| P1-D-03 | Weight entries are append-only; current weight = latest by recorded_at; charts latest-per-day. |
| P1-D-04 | Streak: consecutive completed-workout days (plan or discover) in member timezone, ending today or yesterday. |
| P1-D-05 | Replacement fallback: curated safe fallback pool → mark unsuitable with explanation + duration adjustment. Never unsafe/invented. |
| P1-D-06 | Calories: MET-based formula, MET by intensity (light 3.5 / moderate 5.0 / high 7.5), integer kcal, labeled estimate. |
| P1-D-07 | Enums: fitness_level, push_up_ability, plank_ability, restriction keys as specified. |
| P1-D-08 | Validation ranges: age 13–100; height 100–250 cm; weight 30–300 kg. |
| P1-D-09 | Target weight may equal or exceed current weight (maintenance/gain allowed). |
| P1-D-10 | Daily goal derived from plan workout target duration + target estimated calories. |
| P1-D-11 | Re-opening a completed plan day allowed; repeated plan-sourced session is a new idempotent session; no re-unlock. |
| P1-D-12 | Rest timers defined per workout-exercise in content; default 30s where unspecified. |
| P1-D-13 | Discover duration filter operates on real stored duration values (minutes). |
| P1-D-14 | Session idempotency via client_action_id (UUID) unique per (user_id, client_action_id). |
| P1-D-15 | Member timezone stored on profile (IANA, browser-derived) and used for all day boundaries. |
| P1-D-16 | Server Actions for app mutations; Route Handlers for contracts/webhooks/external; direct Supabase for RLS-safe reads. |
| P1-D-17 | ExerciseDB client is server-only; ingestion via scripts; app never depends on live ExerciseDB. |
| P1-D-18 | No Redux; TanStack Query for server state; React local state for UI; Dexie for workout/offline state. |
| P1-D-19 | Service worker never caches authenticated private responses; caches only app shell + approved media. |
| P1-D-20 | Sentry (Phase 11) for errors; domain event model defined (events.md). |

## 5. New Phase 1 assumptions (working defaults)

| ID | Assumption | Notes |
|----|-----------|-------|
| P1-A-01 | Supabase free tier is sufficient for V1 scale. | Revisit before launch. |
| P1-A-02 | One Vercel deployment + one Supabase project per environment (dev/preview/prod). | Deployment architecture. |
| P1-A-03 | ExerciseDB ingestion runs as a development/server-only script (no admin UI). | Content-source doc. |
| P1-A-04 | Media GIFs proxied/served via our DB metadata; no hotlinking from UI to ExerciseDB. | Media abstraction. |
| P1-A-05 | Sync runs on connectivity events + app foreground + periodic retry with exponential backoff. | Offline sync. |
| P1-A-06 | Workout intensity defaults from level; can be overridden per workout. | Calorie MET. |
| P1-A-07 | Reports/streak timezone = member timezone captured at first authenticated load. | Timezone architecture. |
| P1-A-08 | Google OAuth + email/password conflict handled by Supabase default identity linking with clear UX in Phase 3. | O-10 deferral. |

## 6. Out of scope (unchanged from Phase 0)

Reconfirmed from Phase 0 `scope.md` — no changes. See X-01…X-11.

## 7. Open after Phase 1

| ID | Item | Owner |
|----|------|-------|
| P1-O-01 | Whether repeat plan-day sessions re-count toward daily goal. | Phase 5 |
| P1-O-02 | Notification types final list + delivery timing. | Phase 10 |
| P1-O-03 | Google OAuth email-conflict UX. | Phase 3 |
| P1-O-04 | Offline favorites toggle support. | Phase 6 |
| P1-O-05 | Exact intensity→MET mapping per workout confirmed with content team. | Phase 5 |
| P1-O-06 | Media storage decision (external vs Supabase Storage) for owned media. | Phase 4/6 |