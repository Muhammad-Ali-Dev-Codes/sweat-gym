# V1 Scope / Out-of-Scope — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

This document defines precisely what is IN V1 scope and what is OUT of V1 scope. Anything not listed as in-scope must not be assumed to exist.

---

## 1. V1 In-Scope

### 1.1 Authentication & Accounts
- Landing page
- Signup (email + password)
- Email verification
- Login (email + password)
- Google OAuth
- Forgot password / password reset
- Logout
- Delete account

### 1.2 Onboarding
- 8-step onboarding (see user-flows.md §4)
- Plan selection, push-up/plank ability, height/weight, target weight, physical concerns
- Personalized plan generation

### 1.3 Plan
- Three base 30-day plans (Beginner / Intermediate / Advanced)
- Per-user plan assignment (personalization via deterministic safety filtering)
- Plan progression (Day N → unlock Day N+1)
- Locked day states, completed day states
- Missed-days handling (no reset)
- Plan daily goal (duration + estimated calories, plan-only)

### 1.4 Workouts
- Workout player (exercise display, GIF/animation, instructions, reps, duration, sets, rest timer, pause, resume, skip, progress)
- Workout completion at end (with skipped exercises allowed)
- Workout resume from last unfinished state
- Exercise-level session tracking (completed / skipped)
- Estimated calories (session + plan target)

### 1.5 Discover
- Fixed workouts grouped by Focus Area / Picks for You / Stretching & Warmup / Fat Burning / Strength & Tone / Levels / Duration
- Multi-category membership (single workout record in multiple groups)
- Discover workout details
- Profile-based exercise replacement (workout stays accessible)
- Favorites via heart icon (no dedicated page)
- All levels accessible to all users
- Repeatable workouts
- No search

### 1.6 Progress & Tracking
- Reports (Today / This Week / This Month / Last 30 Days / All Time)
- Metrics: weight, calories, workout duration, workout count, streak
- Activity tracker (Plan + Discover)
- Weight tracking (historical, never overwritten)
- BMI (derived)
- Progress charts
- Workout streaks

### 1.7 Profile & Settings
- My Profile (name, email, age, height, current weight, target weight, fitness level, physical concerns)
- Profile editing (without plan regeneration)
- Notification preferences/settings
- Notification permission-aware behavior

### 1.8 Notifications
- Workout reminder
- New day available
- Streak reminder
- Other approved fitness-related notifications

### 1.9 PWA / Offline
- Installable PWA (Serwist service worker)
- Offline: view today's workout, view downloaded media, perform workout, timer, record completion, view recent progress
- Dexie/IndexedDB local storage
- Idempotent sync back to Supabase

### 1.10 Shared Content
- Master exercise library
- Fixed workout templates
- Base plan templates

---

## 2. V1 Out-of-Scope (Must NOT be built)

| Domain | Excluded items |
|--------|----------------|
| Management | Gym membership management, membership expiry system |
| Billing | Payment gateway, online subscriptions, billing, e-commerce |
| Staff | Admin dashboard, trainer dashboard, gym staff portal |
| Social | Social network, chat, community feed, friend system |
| AI | AI workout generator, dynamic AI plan generation, AI coaching |
| Discover | Discover offline support |
| Favorites | Dedicated Favorites page |
| Equipment | User equipment inventory / ownership tracking |
| Attendance | Gym attendance tracking |
| Nutrition | Nutrition management, meal plans |
| Medical | Medical diagnosis, medical treatment recommendations |
| Search | Discover search |

---

## 3. Scope Rules

1. Anything not listed as V1 functionality must not be assumed to exist.
2. Future features must be explicitly approved by the product owner before inclusion.
3. V1 is completely free; no monetization features.
4. The product is member-only; no staff-facing surfaces.

---

## 4. Scope Guardrails (During Later Phases)

- Do not add admin/trainer surfaces "just in case".
- Do not add payment stubs.
- Do not add social features.
- Do not add AI workout generation.
- Do not make Discover work offline in V1.
- Do not create a dedicated Favorites page.
- Do not ask users what equipment they own.

If a requirement appears during development that touches these guardrails, it must be escalated as a scope decision rather than silently included.
