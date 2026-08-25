# Product Decisions / Assumptions Log — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

Every Phase 0 decision, assumption, and open item is tracked here. Status: `DECIDED` (approved product rule), `ASSUMED` (reasonable default, not yet ratified), `OPEN` (genuinely unresolved), `OUT OF SCOPE` (excluded from V1).

---

## 1. DECIDED

| ID | Decision | Rationale |
|----|----------|-----------|
| D-01 | V1 is completely free; no payments/subscriptions/gym membership management. | Approved master context. |
| D-02 | Member-only; no admin/trainer/staff interfaces. | Approved master context. |
| D-03 | One account = one member profile. | Approved master context. |
| D-04 | Email verification is part of signup. | Approved master context. |
| D-05 | Login supports email/password + Google OAuth. | Approved master context. |
| D-06 | Age is entered directly; no date of birth. | Approved master context §10. |
| D-07 | Height stored internally as cm; weight as kg. | Approved master context. |
| D-08 | Three base 30-day plans: Beginner, Intermediate, Advanced. | Approved master context. |
| D-09 | Same base plan structure per fitness level; personalization is deterministic filtering/replacement. | Approved master context §10, §44. |
| D-10 | Plan day number is separate from actual activity date. | Approved master context §11. |
| D-11 | Missing calendar days do not reset the plan. | Approved master context. |
| D-12 | User cannot skip a plan day; can skip individual exercises. | Approved master context. |
| D-13 | Reaching the end of a workout completes it (skipped exercises allowed). | Approved master context §21. |
| D-14 | Workout pause/resume supported; resume from last unfinished state. | Approved master context. |
| D-15 | Profile changes do not regenerate the existing 30-day plan in V1. | Approved master context §8. |
| D-16 | Discover workouts are fixed workouts, repeatable, all levels accessible. | Approved master context. |
| D-17 | Incompatible Discover exercises are replaced from the controlled library; workout stays accessible. | Approved master context §19. |
| D-18 | Exercise safety uses structured restrictions, not AI judgement. | Approved master context §15. |
| D-19 | Discover does not count toward the plan daily goal. | Approved master context §24. |
| D-20 | Discover DOES count in reports/activity tracker. | Approved master context §25–26. |
| D-21 | Historical weight entries preserved; never overwritten. | Approved master context §27. |
| D-22 | BMI derived from current height/weight; updates automatically; no stale stored value. | Approved master context §28. |
| D-23 | Streak based on actual completed workout activity; deterministic and testable. | Approved master context §30. |
| D-24 | Notifications permission-aware and non-blocking. | Approved master context §31. |
| D-25 | Offline supports defined workout functionality; Discover online-only. | Approved master context §32. |
| D-26 | ExerciseDB free API is initial development/non-commercial source; media replaceable; external_source + external_exercise_id stored. | Approved master context §4, §38. |
| D-27 | No hardcoded ExerciseDB URLs in UI. | Approved master context §38. |
| D-28 | UI/UX visual design deferred to Phase 7 (Google Stitch). | Approved master context §39–40. |
| D-29 | No dedicated Favorites page in V1. | Approved master context §20. |
| D-30 | No Discover search in V1. | Approved master context §17. |
| D-31 | No equipment ownership tracking; workout states required equipment. | Approved master context §16. |
| D-32 | Exercise data and workout prescriptions are separate entities. | Approved master context §13. |
| D-33 | Workouts/plans built from our controlled exercise library; no AI-invented exercises. | Approved master context §19, §44. |
| D-34 | Reports/charts computed from underlying activity/history records. | Approved master context §29. |

---

## 2. ASSUMED (reasonable defaults, pending confirmation)

| ID | Assumption | Notes |
|----|------------|-------|
| A-01 | Onboarding push-up ability stored as one of: `cant`, `0_5`, `5_10`, `10_20`, `over_20`. | Internal enum naming to be finalized in Phase 1/2. |
| A-02 | Onboarding plank ability stored as one of: `cant`, `0_30`, `30_60`, `60_120`, `over_120`. | Internal enum naming to be finalized in Phase 1/2. |
| A-03 | Fitness level stored as `beginner`, `intermediate`, `advanced`. | Internal enum naming. |
| A-04 | Physical concerns stored as one or more of: `no_restrictions` (No, I am fine), `low_impact`, `no_jumping`. | "No, I am fine" treated as exclusive (see A-07). |
| A-05 | Age validation range: 13–100 (reasonable default). | To be confirmed with product owner. |
| A-06 | Height/weight validation ranges use reasonable human ranges (e.g., height 100–250 cm, weight 30–300 kg). | Refined in Phase 2 with check constraints. |
| A-07 | If a user selects "No, I am fine" plus other concerns, it is a contradiction; product treatment: "No, I am fine" is exclusive and clears other selections. | Flagged as an OPEN item requiring product confirmation (see O-01). |
| A-08 | Target weight equal to or greater than current weight is allowed (maintenance/gain journey is possible). | The product goal is current → target weight; direction is not restricted. |
| A-09 | Workout daily goal combines plan target duration and plan target estimated calories. | Derived per master context §12. |
| A-10 | Favorites sync offline is not in V1 offline scope (favorites require network unless Phase 6 decides otherwise). | Favorites not listed among offline capabilities. |
| A-11 | Onboarding partial-progress retention: user can leave and resume at the last completed step. | To be confirmed in Phase 1/7; clean restart is the fallback. |
| A-12 | Re-opening a completed plan day is allowed for viewing and permitted repeat behavior. | "Repeating permitted workout behavior" per master context §42. Exact repeat semantics decided in Phase 1/5. |
| A-13 | Rest timer durations are defined per workout-exercise in content; default rest where not specified is an implementation decision. | Content phase (Phase 5). |
| A-14 | Exercise replacement fallback when no compatible exercise exists: replace with a compatible "no-equipment basic" from the library, or mark exercise appropriately — never silently unsafe. | Detailed rule in Phase 5. |
| A-15 | Calorie estimation uses weight, intensity, and duration with a documented deterministic formula. | Formula defined in Phase 1. |
| A-16 | Notifications are server-push based; candidate types: workout reminder, new day available, streak reminder. | Full list finalized in Phase 10. |
| A-17 | Email verification return flow routes to login, then onboarding. | Per approved flow. |
| A-18 | Discover filter durations operate from real duration values. | Master context §36. |

---

## 3. OPEN (genuinely unresolved — must not be silently resolved)

| ID | Open item | Why it's open | Where it will be resolved |
|----|-----------|----------------|---------------------------|
| O-01 | Behavior when "No, I am fine" is combined with other physical concerns in onboarding. | Multi-select allows the combination, but it is contradictory. | Product owner confirmation; Phase 1. |
| O-02 | Whether a plan day can be re-completed for a repeat session and whether it should re-count toward daily goal. | Master context allows "repeating permitted workout behavior" but is ambiguous on re-completion semantics. | Phase 5 (plan engine). |
| O-03 | Duplicate weight entry policy (same calendar day): keep all entries vs. dedupe to latest. | Master context says never overwrite; does not specify same-day behavior. | Phase 1/2 (data model). |
| O-04 | Onboarding partial-progress: resume vs. restart on return. | Master context requires "user returns later" handling but not the exact UX. | Phase 1/7 (UX with Stitch). |
| O-05 | Streak definition exact rule (Plan+Discover vs Plan-only; timezone; same-day multiple workouts). | Master context requires deterministic streak but defers exact calculation. | Phase 1 (architecture). |
| O-06 | Exercise replacement fallback detail when no compatible exercise exists. | Master context requires deterministic rule; exact fallback list not defined. | Phase 5 (content/plan engine). |
| O-07 | Whether offline favorites toggling should be supported. | Favorites not in the offline scope list. | Phase 6 (offline architecture). |
| O-08 | Exact calorie estimation formula and intensity labeling. | Must be estimate, weight/duration/intensity based; formula not fixed. | Phase 1. |
| O-09 | Notification types final list beyond candidates. | Candidates listed; full set not finalized. | Phase 10. |
| O-10 | Google OAuth email-conflict resolution. | Auth provider handles most cases; conflict UX not specified. | Phase 3. |

---

## 4. OUT OF SCOPE (explicitly excluded from V1)

| ID | Item |
|----|------|
| X-01 | Gym membership management, expiry, billing, payments, subscriptions |
| X-02 | Admin/trainer/staff dashboards |
| X-03 | Social feed, friends, chat, community |
| X-04 | AI workout/plan generation, AI coaching |
| X-05 | Discover offline support |
| X-06 | Dedicated Favorites page |
| X-07 | User equipment inventory |
| X-08 | Gym attendance |
| X-09 | Nutrition/meal plans |
| X-10 | Medical diagnosis/treatment |
| X-11 | Discover search |
