# User Journey / User Flow Document — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

This document describes every major user flow at the product level. Visual design is deferred to Phase 7.

---

## 1. Primary Journey (End to End)

```
Landing Page
  → Signup / Login
  → Email Verification (signup only)
  → Login
  → Onboarding (8 steps)
  → Personalized Plan Generation
  → Dashboard
  → Plan / Discover / Reports / My Profile
```

---

## 2. Landing → Signup Flow

```
Landing Page (top-right: Login, Get Started)
  → Get Started
  → Signup
    - Full Name
    - Email
    - Password
  → Supabase Auth account creation
  → Verification email sent
  → User opens their email
  → Confirms email
  → Verification link returns user to website
  → User logs in
  → Onboarding
```

### Edge / alternate paths
- User already has an account → goes to Login instead.
- Verification link expired → resend verification (handled by auth provider); document in edge-cases.md.
- User signs up with an email already in use → error message, offer login.

---

## 3. Login Flow

```
Login Page
  → Email + Password  OR  Google OAuth
  → Authenticated
  → Check onboarding completeness
      → incomplete → Onboarding
      → complete → Dashboard
```

### Forgot password
```
Login → Forgot Password → enter email → reset email → reset → login
```

### Delete account (from My Profile / account actions)
```
My Profile → Delete Account → confirmation → account deleted → landing
```

---

## 4. Onboarding Flow

Onboarding is **required** before the personalized dashboard experience.

| Step | Screen | User Input | Stored As |
|------|--------|-----------|-----------|
| 1 | Welcome — "Hello, welcome to the journey to your dream body." Supporting text about personalizing daily goal and schedule. Action: **Start** | None | — |
| 2 | Choose Your Plan | Beginner / Intermediate / Advanced | `fitness_level` |
| 3 | How many push-ups can you do at one time? | can't / 0–5 / 5–10 / 10–20 / over 20 | `push_up_ability` |
| 4 | How long can you hold a plank? | can't / 0–30 / 30–60 / 60–120 / over 120 | `plank_ability` |
| 5 | Height & Current Weight | Height input, Weight input | `height_cm`, `current_weight_kg` |
| 6 | Target Weight | Target weight input | `target_weight_kg` |
| 7 | Physical Concerns (multi-select) | No, I am fine / Low impact / No jumping | `physical_concerns` |
| 8 | Generate Personalized Plan (generation/progress experience) | None (action) | triggers plan generation |

### Onboarding rules
- Multiple physical concerns can be selected simultaneously.
- "No, I am fine" indicates no restrictions; combining it with other concerns is contradictory (see decisions.md).
- Onboarding progress must survive partial completion (user closes app midway, returns later → continue where left off or restart cleanly as defined in Phase 1).

---

## 5. Post-Onboarding

```
Plan Generation → Dashboard
```

Dashboard acts as the hub. Primary navigation:

| Item | Purpose |
|------|---------|
| Plan | 30-day plan view (Day 1..Day 30, progression, locked days) |
| Discover | Browse fixed workouts |
| Reports | Progress, charts, weight, activity |
| My Profile | Profile info, edit, logout, delete account |

Notifications: desktop — sidebar/header structure; mobile — bottom navigation area.

---

## 6. Plan Flow

```
Plan → view Day 1..30
  Day N state: completed | unlocked | locked
  → Open unlocked day → Workout Player
  → Complete Day N → Day N+1 unlocks
```

### Rules
- Day N must be completed before Day N+1 unlocks.
- Future days visible but locked.
- User cannot skip a plan day.
- Missing calendar days do not reset the plan; the next incomplete day continues.
- Plan day number is separate from actual activity date.

### Completed day
- Re-opening a completed day is allowed (view/repeat permitted behavior as defined in Phase 1).

---

## 7. Workout Player Flow

```
Open workout (Plan or Discover)
  → Workout details / Start
  → Exercise 1 begins (GIF, instructions, sets/reps/duration, rest timer)
  → Continue through exercises
  → Final exercise ends
  → Workout marked complete
  → Session stored
```

### Alternate paths
- Pause / resume (timer pauses).
- Skip current exercise (does not fail the workout; recorded as skipped).
- Exit mid-workout → resume later from the last unfinished exercise/state.

### Completion rule
- Reaching the end completes the workout, even with skipped exercises.

---

## 8. Discover Flow

```
Discover → browse groups (Focus Area / Picks / Stretching & Warmup / Fat Burning / Strength & Tone / Levels / Duration)
  → open a workout → Discover Workout Details
  → profile-based modification applied if incompatible exercises present
  → Start Workout → Workout Player
```

### Rules
- Discover contains fixed workouts, not standalone exercises.
- A workout may appear in multiple groups (single underlying record).
- All levels accessible to all users.
- If an incompatible exercise exists, replace from controlled library; workout stays accessible.
- Favorites: heart icon beside relevant workout item. Outline = not favorited; red = favorited; press again removes.
- No search in V1.
- Discover is online-only in V1.

---

## 9. Reports / Progress Flow

```
Reports → select period (Today / This Week / This Month / Last 30 Days / All Time)
  → view metrics: weight, calories, workout duration, workout count, streak
  → view activity tracker (Plan + Discover sessions)
  → weight history / trend / BMI
```

- Both Plan and Discover sessions count in reports and activity tracker.
- Charts computed from underlying activity/history records.

---

## 10. Weight / BMI Flow

```
Record weight any time (Profile or Reports entry point)
  → stored as new historical entry (never overwrites previous)
  → current weight updated
  → BMI recalculated from latest weight + height
```

---

## 11. Notifications Flow

```
App requests notification permission (where platform requires)
  → granted: notifications enabled (reminders: workout reminder, new day available, streak reminder)
  → denied/revoked/unsupported: app continues normally; feature disabled gracefully
```

---

## 12. Offline Flow

```
Offline: user can
  → view today's workout
  → view downloaded workout media
  → perform workout (timers work)
  → record completion locally
  → view recent progress
  → sync to Supabase when connectivity returns (idempotent, no duplicates)
```

Discover is online-only in V1.

---

## 13. Account Management Flow

```
My Profile
  → Edit profile (name, age, height, weight, target weight, fitness level, physical concerns)
     Note: editing does NOT regenerate an existing 30-day plan in V1.
  → Logout
  → Delete Account (confirmation) → account deleted → landing
```

---

## 14. Flow-Level State Screens

Required state screens (product level): Loading, Empty, Error, Offline, Locked Day, Resume Workout, Permission-Denied Notification. See `functional-requirements.md` and `edge-cases.md`.
