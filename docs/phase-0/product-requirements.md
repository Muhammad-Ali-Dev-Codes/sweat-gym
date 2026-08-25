# Product Requirements Document — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Status: Approved draft
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

---

## 1. Product Purpose

The Gym Member Fitness PWA is a **member-only** fitness Progressive Web App that helps an individual fitness/gym member:

- Follow a **personalized 30-day workout journey** based on a fixed base plan adapted to their profile.
- **Discover additional fixed workouts** grouped by focus area, category, level, and duration.
- **Perform workouts** with a full player experience (exercise display, GIF animation, instructions, timers, rest, pause/resume, skip, resume-in-progress).
- **Track progress** through reports, weight history, BMI, workout duration, workout count, estimated calories, and streaks.
- **Use essential workout functionality offline** (view today's workout, perform workout, record completion, view recent progress).

**V1 is completely free.** There are no payments, subscriptions, gym membership management, or admin/trainer interfaces.

**Explicitly NOT a gym-management system.** This is not a SaaS for gym owners/trainers in V1.

---

## 2. Target User

| Aspect | Value |
|--------|-------|
| Primary user | Individual fitness/gym member |
| Goal | Follow a structured 30-day fitness journey, build habits, track progress |
| Device | Mobile phone (primary), tablet & desktop (secondary) |
| Design width | ~390px mobile-first |
| Relationship | One account = one member profile |

The user is **not** a gym owner, trainer, or staff member in V1.

---

## 3. V1 Scope Summary

### 3.1 In scope (high level)

Landing, signup, email verification, login (email/password + Google OAuth), forgot password, onboarding, personalized 30-day plan, plan progression, workout player, exercise animations/GIFs, instructions, timers, rest timers, pause/resume, exercise skipping, workout resume, Discover (workouts, categories, filters, profile-based modification), favorites (heart icon), Reports, weight tracking, BMI, progress charts, workout count, workout duration, estimated calories, streak, notifications, My Profile, logout, delete account, offline workout support, local offline storage, sync back to Supabase.

### 3.2 Explicitly out of scope (high level)

Gym membership management, billing, payments, subscriptions, trainer dashboard, admin dashboard, staff portal, social feed, friends, chat, community, AI-generated workout plans, dynamic AI coaching, Discover offline support, dedicated Favorites page, user equipment inventory, gym attendance, nutrition management, meal plans, medical diagnosis, medical treatment recommendations.

> Full in/out-of-scope list: see `scope.md`.

---

## 4. Product Rules (Business Rules)

The following are the **approved, non-negotiable product rules** for V1.

| # | Rule |
|---|------|
| R1 | Member-only product. |
| R2 | No admin/trainer/gym-management features in V1. |
| R3 | No payments in V1. |
| R4 | V1 is completely free. |
| R5 | Email verification is part of the signup flow. |
| R6 | Login supports email/password and Google OAuth. |
| R7 | One account = one member profile. |
| R8 | Onboarding occurs before the personalized dashboard experience. |
| R9 | There are exactly three base 30-day plans: Beginner, Intermediate, Advanced. |
| R10 | The current 30-day plan remains unchanged when profile changes in V1 (no regeneration). |
| R11 | User cannot skip a plan day. |
| R12 | User can skip individual exercises. |
| R13 | Reaching the end of a workout completes the workout (regardless of skipped exercises). |
| R14 | Workouts can be paused and resumed. |
| R15 | Discover workouts are fixed workouts. |
| R16 | Discover workouts may be repeated. |
| R17 | Advanced Discover workouts are accessible to beginners. |
| R18 | Incompatible Discover exercises are modified/replaced according to profile restrictions (workout stays accessible). |
| R19 | Exercise safety uses structured restrictions, not AI judgement. |
| R20 | Discover does not count toward the plan daily goal. |
| R21 | Discover DOES count in overall reports/activity. |
| R22 | Historical weight is preserved (never overwritten). |
| R23 | BMI is derived from latest weight and height and updates automatically. |
| R24 | Streak is supported and based on actual completed workout activity. |
| R25 | Notifications are supported and permission-aware (non-blocking). |
| R26 | Offline support exists for defined workout functionality. |
| R27 | Discover remains online-only in V1. |
| R28 | Exercise/media source must be replaceable (no hardcoded ExerciseDB coupling). |
| R29 | ExerciseDB free API is an initial development/non-commercial source. |
| R30 | Do not hardcode ExerciseDB URLs throughout the application. |

---

## 5. User Journey (Summary)

```
Landing
  → Signup / Login
  → Email Verification (signup only)
  → Login
  → Onboarding (8 steps)
  → Personalized Plan Generation
  → Dashboard
  → Plan / Discover / Reports / My Profile
```

Detailed flows are documented in `user-flows.md`.

---

## 6. Functional Domains

### 6.1 Authentication & Accounts

- Signup: Full Name, Email, Password → Supabase Auth account → email verification → return → login → onboarding.
- Login: Email + Password and Google OAuth.
- Forgot password / password reset: supported.
- Delete account: supported.
- Session expiry, invalid credentials, unverified email, OAuth conflicts handled (see edge-cases.md).

### 6.2 Onboarding

Eight steps:
1. Welcome ("Hello, welcome to the journey to your dream body.")
2. Choose Plan (Beginner 5–10 min/day, Intermediate 10–20 min/day, Advanced 15–30 min/day)
3. Push-up ability (can't / 0–5 / 5–10 / 10–20 / over 20)
4. Plank ability (can't / 0–30 / 30–60 / 60–120 / over 120)
5. Height + current weight (stored as height_cm, current_weight_kg)
6. Target weight (stored as target_weight_kg)
7. Physical concerns (No I'm fine / Low impact / No jumping) — multi-select
8. Generate personalized plan

Onboarding completion is required before the personalized dashboard.

### 6.3 Profile

Fields: Full name, Email, Age, Height (cm), Current weight (kg), Target weight (kg), Fitness level, Physical concerns.

User can edit supported fields after onboarding. **Editing profile does not regenerate the existing plan (V1).**

Age is entered directly (not date of birth).

### 6.4 Plan

- Three base 30-day plans (Beginner/Intermediate/Advanced).
- Same base plan structure for all users of the same fitness level.
- Personalized via deterministic safety/profile filtering and replacement.
- Progression: Day N must be completed to unlock Day N+1. Future days visible but locked.
- No skipping plan days. Missing calendar days do not reset the plan; the next incomplete day continues.
- `plan_day_number` is separate from `actual_activity_date`.
- Each plan day has target duration and target estimated calories.

### 6.5 Daily Goal

- Derived from the plan workout's target duration and target estimated calories.
- Only the plan workout contributes toward the daily plan goal.
- Discover activity does not satisfy the daily goal (but counts in reports/activity).

### 6.6 Workout Model & Player

- Exercise = reusable building block (name, media, instructions, metadata).
- Workout = fixed collection of exercises with sets/reps/duration/rest prescriptions.
- Player supports: exercise display, GIF/animation, instructions, reps, duration, sets, rest timer, pause, resume, skip exercise, progress, completion at end.
- Skipping an exercise does not fail the workout.
- Interrupted workouts resume from the last unfinished exercise/state.

### 6.7 Discover

- Fixed workouts (not standalone exercises).
- Groups: Focus Area, Picks for You, Stretching & Warmup, Fat Burning, Strength & Tone, Levels, Duration.
- A workout may belong to multiple categories/groups (no duplicate underlying records).
- All levels accessible to all users (no blocking).
- Profile-based modification: incompatible exercises replaced from the controlled library; workout stays accessible.
- No search in V1.
- Favorites via heart icon (no dedicated Favorites page).

### 6.8 Workout Sessions & Tracking

- Session records: user, workout, source (plan/discover), plan day (if applicable), start/end time, duration, estimated calories, completion status.
- Exercise-level session records with status (completed/skipped).

### 6.9 Reports & Progress

- Periods: Today, This Week, This Month, Last 30 Days, All Time.
- Metrics: weight, calories, workout duration, workout count, streak.
- Both Plan and Discover sessions count in reports.
- Activity tracker shows both Plan and Discover activity.
- Visual priority: weight trend > workout consistency > streak > calories > duration > workout count (final visual order is a Phase 7 UI/UX decision).

### 6.10 Weight & BMI

- Weight entries stored historically (never overwritten).
- Display: current, target, last 30 days, annual average, trend/chart.
- BMI = weight_kg / (height_m)^2, derived from latest values, updates automatically.

### 6.11 Streak

- Based on actual completed workout activity.
- Deterministic, reproducible, testable.
- Exact calculation defined in Phase 1.

### 6.12 Notifications

- Workout reminder, new day available, streak reminder (candidate types).
- Permission-aware; app works normally if denied/unsupported.

### 6.13 Offline (PWA)

- Offline: view today's workout, view downloaded media, perform workout, timer, record completion, view recent progress.
- Local storage via Dexie/IndexedDB; service worker via Serwist.
- Sync back to Supabase when connectivity returns; idempotent, no duplicate sessions.

---

## 7. Data Concepts (Distinctions That Must Be Preserved)

| Concept A | Concept B | Why the distinction matters |
|-----------|-----------|------------------------------|
| Daily Goal | Reports | Plan activity contributes to daily goal; all activity contributes to reports. |
| Plan Day | Calendar Date | Plan day is progression identifier, not calendar day after signup. |
| Exercise | Workout | Exercise is reusable; workout is a fixed collection with prescriptions. |
| Workout | Workout Session | Template vs. actual performed activity record. |
| Base Plan | User Plan | Shared template vs. per-user assignment with personalization. |
| Exercise Restrictions | User Restrictions | Metadata on exercises vs. user-selected concerns; matched deterministically. |
| ExerciseDB Source | Permanent Source | Import/normalization layer, not the permanent domain model. |
| Plan activity | Discover activity | Plan satisfies daily goal; both count in reports/activity tracker. |

---

## 8. Data Required (Conceptual)

- Profiles, fitness profiles, physical restrictions, user restrictions
- Weight entries
- Exercises (name, media, instructions, target/secondary muscles, body parts, equipment, difficulty, focus areas, restrictions, timing mode, external_source, external_exercise_id, animation_url, thumbnail_url, video_url)
- Focus areas, equipment, restrictions, levels, categories
- Workouts, workout exercises, workout focus areas, workout categories, workout levels
- Plan templates, plan template days
- User plans, user plan days
- Workout sessions, workout exercise sessions
- Favorite workouts
- Notification preferences

Exact schema is a Phase 2 deliverable (see `master-project-context.md` §35).

---

## 9. Media & Content

- Initial exercise source: ExerciseDB V1 Free API (`https://oss.exercisedb.dev/api/v1`), ~1,500 exercises, GIF media.
- ExerciseDB is a development/non-commercial source; media must remain replaceable.
- Store external_source + external_exercise_id; support animation_url / thumbnail_url / video_url.
- Do not scrape YouTube or other sites; do not copy copyrighted media without permission.

Detailed content requirements: see `content-source.md`.

---

## 10. Non-Functional Requirements (Summary)

Security, performance, reliability, accessibility, responsiveness, offline capability, data consistency, maintainability, observability, error handling. Full details in `non-functional-requirements.md`.

---

## 11. Screens Required (Requirement Level)

Landing, Login, Signup, Verification Return, Onboarding 1–7, Plan Generation, Dashboard, Plan, Workout Player, Discover, Discover Workout Details, Reports, Progress, My Profile, Notifications, plus state screens: Offline, Locked Day, Empty, Loading, Error, Resume Workout, Permission-Denied.

> Visual design is explicitly deferred to Phase 7 (Google Stitch).

---

## 12. Known Distinctions / Verification Checks

The following contradictions-or-confusions were verified and resolved:

1. Daily Goal ≠ Reports. ✅ Resolved (plan-only goal vs. all-source reports).
2. Plan Day ≠ Calendar Date. ✅ Resolved (progression identifier vs. actual activity date).
3. Exercise ≠ Workout ≠ Session. ✅ Resolved (three distinct entities).
4. Base Plan ≠ User Plan. ✅ Resolved.
5. Exercise restrictions ≠ User restrictions. ✅ Resolved (deterministic matching).
6. ExerciseDB ≠ permanent source. ✅ Resolved (abstraction required).
7. "No, I am fine" concern — this is a V1 "no restrictions" selection. If combined with other restrictions it is contradictory; product decision: choosing "No, I am fine" alongside other concerns is treated as invalid/unnecessary (see decisions.md).

---

## 13. Open Items

Open items requiring decisions are tracked in `decisions.md` (OPEN section). At Phase 0 close, no unresolved contradiction blocks implementation.
