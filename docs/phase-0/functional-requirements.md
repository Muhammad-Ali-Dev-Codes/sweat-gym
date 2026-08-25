# Functional Requirements Specification — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

Each feature is documented with: FEATURE NAME / PURPOSE / ACTOR / INPUT / OUTPUT / PRECONDITIONS / MAIN FLOW / ALTERNATE FLOW / ERROR FLOW / EDGE CASES / DATA NEEDED / OFFLINE BEHAVIOR / SECURITY REQUIREMENTS / SUCCESS CRITERIA.

---

## F-01 Sign Up

- **Purpose**: Create a member account with email + password.
- **Actor**: Anonymous visitor.
- **Input**: Full name, email, password.
- **Output**: Supabase Auth account created; verification email sent; user directed to a "check your email" state.
- **Preconditions**: No existing account with that email; password meets auth provider policy.
- **Main flow**: Landing → Get Started → Signup form → submit → account created → verification email → prompt user to verify.
- **Alternate flow**: User already has an account → route to login with message.
- **Error flow**: Email already registered → show error, offer login. Invalid email/weak password → inline validation error.
- **Edge cases**: Duplicate signup, expired verification, resend verification. See edge-cases.md.
- **Data needed**: Auth identity (Supabase Auth). Full name stored on profile.
- **Offline behavior**: Not applicable (requires network).
- **Security**: Password never stored in app DB; validation of all inputs; no client-supplied identity.
- **Success criteria**: Account created; verification email delivered; no duplicate auth identity.

---

## F-02 Email Verification

- **Purpose**: Confirm ownership of the email address.
- **Actor**: Newly registered member.
- **Input**: Verification link from email.
- **Output**: Email marked verified; user returned to website; user logs in.
- **Preconditions**: Signup completed; verification email sent.
- **Main flow**: User opens email → confirms → link returns to website → login → onboarding.
- **Alternate flow**: Verification link expired → resend option.
- **Error flow**: Invalid/expired link → show error, offer resend.
- **Edge cases**: Unverified user attempts to access protected app (blocked from personalized experience).
- **Data needed**: Auth identity verification status (Supabase Auth).
- **Offline behavior**: Not applicable.
- **Security**: Verification is server-side via Supabase Auth; never trust client-side "verified" flags.
- **Success criteria**: Email verified; user can proceed to login/onboarding.

---

## F-03 Login (Email + Password and Google OAuth)

- **Purpose**: Authenticate a member.
- **Actor**: Existing member (verified or unverified as policy allows).
- **Input**: Email + password, or Google OAuth.
- **Output**: Authenticated session; user routed to onboarding (incomplete) or dashboard (complete).
- **Preconditions**: Account exists.
- **Main flow**: Login form → authenticate → session → route by onboarding completeness.
- **Alternate flow**: Google OAuth flow → return with session.
- **Error flow**: Wrong password, unverified email, OAuth failure → clear error messages.
- **Edge cases**: Expired session, OAuth email conflict, deleted account. See edge-cases.md.
- **Data needed**: Supabase Auth session.
- **Offline behavior**: Login requires network (not part of offline scope).
- **Security**: Sessions via Supabase; RLS enforced; identity derived from verified session, never client-supplied.
- **Success criteria**: Valid session issued; correct routing.

---

## F-04 Forgot Password / Reset

- **Purpose**: Allow a member to reset their password.
- **Actor**: Member who forgot password.
- **Input**: Email address.
- **Output**: Reset email; user sets new password; can log in.
- **Preconditions**: Account exists.
- **Main flow**: Forgot password → email → reset → new password → login.
- **Alternate flow**: Reset link expired → request again.
- **Edge cases**: None/unknown email (do not reveal account existence unnecessarily).
- **Data needed**: Supabase Auth password reset.
- **Offline behavior**: Not applicable.
- **Security**: Handled by Supabase Auth; tokens expire.
- **Success criteria**: Password successfully reset.

---

## F-05 Delete Account

- **Purpose**: Permanently remove the member's account and personal data.
- **Actor**: Authenticated member.
- **Input**: Confirmation of deletion.
- **Output**: Account and associated private data removed; user returned to landing.
- **Preconditions**: User is authenticated.
- **Main flow**: My Profile → Delete Account → confirm → delete → landing.
- **Alternate flow**: Cancel.
- **Edge cases**: Re-login after deletion (should be a fresh signup); pending offline data on that device.
- **Data needed**: Auth identity + application profile data deletion.
- **Offline behavior**: Deletion requires network; offline-only pending data handling defined in Phase 1/6.
- **Security**: Identity from session; cascade deletes scoped to the authenticated user only.
- **Success criteria**: Account deleted; no orphaned private data.

---

## F-06 Onboarding

- **Purpose**: Collect member fitness profile to generate a personalized plan.
- **Actor**: New member (post-login, incomplete onboarding).
- **Input**: 8-step answers (see user-flows.md §4).
- **Output**: Fitness profile persisted; personalized 30-day plan generated.
- **Preconditions**: Authenticated; onboarding incomplete.
- **Main flow**: Steps 1–8 → Generate Personalized Plan → Dashboard.
- **Alternate flow**: Partial completion; user returns later → resume or restart per Phase 1 decision.
- **Error flow**: Invalid age/height/weight; target weight equal/greater than current; missing answers → validation.
- **Edge cases**: Back navigation, repeated submission, plan generation interrupted, multiple restrictions. See edge-cases.md.
- **Data needed**: fitness_level, push_up_ability, plank_ability, height_cm, current_weight_kg, target_weight_kg, physical_concerns.
- **Offline behavior**: Onboarding requires network (creates plan server-side). Partial local draft may be supported per Phase 1/6.
- **Security**: Writes scoped to authenticated user via RLS.
- **Success criteria**: Profile saved; user plan created; dashboard accessible.

---

## F-07 Personalized Plan Generation

- **Purpose**: Create the member's 30-day user plan from the base plan for their fitness level.
- **Actor**: System (triggered by onboarding completion).
- **Input**: Fitness level, physical concerns, push-up/plank ability, age, height, weight, target weight.
- **Output**: user_plans + user_plan_days assigned; Day 1 unlocked; days 2–30 locked.
- **Preconditions**: Onboarding complete; no existing user plan (V1: plan created once).
- **Main flow**: Select base plan (level) → check exercise compatibility → remove/replace incompatible exercises → preserve structure → create user plan → Day 1 unlocked.
- **Alternate flow**: Re-trigger after failure (retry) — must not create duplicates.
- **Error flow**: Generation fails → show retry; no partial/duplicate plan.
- **Edge cases**: Retry, interrupted generation, no compatible replacement available. See edge-cases.md.
- **Data needed**: base plan templates, exercise restrictions, user restrictions.
- **Offline behavior**: Generation requires network; result should be downloadable for offline (Phase 6).
- **Security**: Server-side generation with session-derived identity; RLS.
- **Success criteria**: Exactly one user plan; deterministic; no duplicates on retry.

---

## F-08 Plan View & Progression

- **Purpose**: Display the 30-day plan and manage day-level progression.
- **Actor**: Authenticated member.
- **Input**: None (view); day selection.
- **Output**: 30 days displayed with completed/unlocked/locked states.
- **Preconditions**: User plan exists.
- **Main flow**: View plan → open unlocked day → perform workout → on completion, next day unlocks.
- **Alternate flow**: Re-open completed day (view/repeat as permitted).
- **Error flow**: Attempt to open locked day → locked state (not an error per se).
- **Edge cases**: Day already completed, missed days, returning after several days, duplicate completion. See edge-cases.md.
- **Data needed**: user_plan_days, workout_sessions (completion status).
- **Offline behavior**: View today's workout and recent progress offline (Phase 6).
- **Security**: RLS — plan scoped to authenticated user.
- **Success criteria**: Correct day states; Day N+1 unlocks only after Day N completion.

---

## F-09 Workout Player (Start / Exercise / Rest / Complete)

- **Purpose**: Perform a workout with full player support.
- **Actor**: Authenticated member.
- **Input**: Workout selection (Plan or Discover); Start.
- **Output**: Session recorded; workout marked complete at end.
- **Preconditions**: Authenticated; workout accessible.
- **Main flow**: Open workout → Start → exercises presented with GIF/instructions/prescription (sets, reps, duration) → rest timers → continue → final exercise ends → complete → session stored.
- **Alternate flow**: Pause/resume; skip exercise; exit and resume later.
- **Error flow**: Timer interruption, duplicate completion request, missing media → handled states (see edge-cases.md).
- **Edge cases**: User leaves app, browser closed, network loss, duplicate completion. See edge-cases.md.
- **Data needed**: workout_exercises (prescription), exercises (media/instructions), workout_sessions, workout_exercise_sessions.
- **Offline behavior**: Full offline workout execution supported (Phase 6).
- **Security**: Session writes scoped to user via RLS; no client-supplied user IDs.
- **Success criteria**: Session stored correctly with per-exercise status; reaching end = completed.

---

## F-10 Workout Resume

- **Purpose**: Resume an unfinished workout from the last unfinished exercise/state.
- **Actor**: Authenticated member.
- **Input**: Reopen an unfinished workout.
- **Output**: Workout state restored (Exercise 4 of 8, timers, etc.).
- **Preconditions**: An in-progress session exists for the user/workout.
- **Main flow**: Reopen → detect unfinished session → resume from last state.
- **Alternate flow**: User restarts from beginning (as permitted/decided in Phase 1).
- **Error flow**: Stale/corrupt in-progress state → recover gracefully.
- **Edge cases**: Crash, browser closed, phone backgrounded, network loss. See edge-cases.md.
- **Data needed**: In-progress session state (local + server, Phase 6).
- **Offline behavior**: Resume works offline.
- **Security**: Resume scoped to the authenticated user.
- **Success criteria**: Resume from correct exercise; no duplicate exercise state loss.

---

## F-11 Discover (Browse / Groups / Multi-category)

- **Purpose**: Browse fixed workouts.
- **Actor**: Authenticated member.
- **Input**: Navigation through groups/filters.
- **Output**: Workout cards/items grouped by Focus Area, Picks, Stretching & Warmup, Fat Burning, Strength & Tone, Levels, Duration.
- **Preconditions**: Authenticated; online.
- **Main flow**: Discover → browse groups → open workout detail.
- **Alternate flow**: Switch groups/filters.
- **Error flow**: Loading/empty/error states for Discover content.
- **Edge cases**: Workout in multiple groups (single record, no duplicates). See edge-cases.md.
- **Data needed**: workouts, workout_focus_areas, workout_categories, workout_levels, duration metadata.
- **Offline behavior**: Discover is online-only in V1.
- **Security**: Workout content is public/shared; no private data exposed.
- **Success criteria**: Groups populated; no duplicate workout records; all levels visible.

---

## F-12 Discover Workout Details & Modification

- **Purpose**: Show workout details, applying profile-based exercise replacement.
- **Actor**: Authenticated member.
- **Input**: Selected Discover workout.
- **Output**: Modified workout shown (incompatible exercises replaced where possible).
- **Preconditions**: Authenticated; workout exists; online.
- **Main flow**: Open workout → detect incompatible exercises vs user restrictions → replace from controlled library → display modified workout → Start.
- **Alternate flow**: No incompatible exercises → show original.
- **Error flow**: Replacement unavailable → handle per Phase 1 rule (workout still accessible; replace with best available or flag).
- **Edge cases**: Advanced workout by beginner (allowed), multiple incompatible exercises, rapid favorite toggle. See edge-cases.md.
- **Data needed**: exercise_restrictions, user_physical_restrictions, exercises (for replacement).
- **Offline behavior**: Online-only in V1.
- **Security**: Replacement logic server-side/deterministic; public content.
- **Success criteria**: Workout accessible; incompatible exercises replaced; user sees modified version.

---

## F-13 Favorites

- **Purpose**: Mark/unmark favorite workouts via heart icon.
- **Actor**: Authenticated member.
- **Input**: Tap heart icon.
- **Output**: Favorite relationship stored/removed; icon toggles (outline ↔ red).
- **Preconditions**: Authenticated; online (sync to Supabase).
- **Main flow**: Tap heart → favorited → red. Tap again → unfavorited → outline.
- **Alternate flow**: Rapid toggling → final state consistent (idempotent).
- **Error flow**: Sync failure → local optimistic update + retry (Phase 6).
- **Edge cases**: Rapid toggle, offline toggle (if supported in Phase 6). See edge-cases.md.
- **Data needed**: favorite_workouts.
- **Offline behavior**: V1 — to be defined in Phase 6 (favorites not listed as offline requirement).
- **Security**: RLS scoped to user.
- **Success criteria**: Favorite state persists and toggles correctly.

---

## F-14 Workout Session Recording

- **Purpose**: Persist real workout attempts including per-exercise states.
- **Actor**: System (during workout execution).
- **Input**: Workout execution events (start, exercise completed/skipped, end).
- **Output**: workout_sessions + workout_exercise_sessions records.
- **Preconditions**: Workout in progress.
- **Main flow**: Start → record → complete/skip per exercise → end → completed session.
- **Alternate flow**: Abandoned/partial session (in-progress state retained for resume).
- **Error flow**: Duplicate completion request → idempotent (no duplicate sessions).
- **Edge cases**: Offline completion, network reconnect, sync conflict. See edge-cases.md.
- **Data needed**: session fields (user, workout, source, plan day, start/end, duration, calories, status; exercise statuses).
- **Offline behavior**: Local recording + idempotent sync (Phase 6).
- **Security**: RLS; session identity derived from auth.
- **Success criteria**: No duplicates; complete and accurate session records.

---

## F-15 Calorie Estimation

- **Purpose**: Estimate calories for plan targets and actual sessions.
- **Actor**: System.
- **Input**: User body weight, workout intensity, workout duration.
- **Output**: Estimated kcal values (plan target; session actual).
- **Preconditions**: Necessary inputs available.
- **Main flow**: Compute estimate deterministically from inputs.
- **Alternate flow**: Missing inputs → use documented defaults/assumptions (see decisions.md).
- **Error flow**: Invalid inputs → validation.
- **Edge cases**: New user, weight changes, intensity labels. See edge-cases.md.
- **Data needed**: weight, workout metadata (intensity), duration.
- **Offline behavior**: Estimate computed locally where possible (Phase 6).
- **Security**: No user identity needed for formula.
- **Success criteria**: Consistent, reproducible estimates; clearly labeled as estimates.

---

## F-16 Daily Goal

- **Purpose**: Show daily plan-goal progress (duration + estimated calories).
- **Actor**: Authenticated member.
- **Input**: Completed plan session(s).
- **Output**: Progress toward plan target duration/calories.
- **Preconditions**: User plan exists.
- **Main flow**: Complete plan workout → daily goal progresses.
- **Alternate flow**: Discover workouts → recorded separately; do NOT advance plan daily goal.
- **Error flow**: None (goal is informational).
- **Edge cases**: Multiple plan sessions same day (if permitted), Discover-only day. See edge-cases.md.
- **Data needed**: plan target (duration, calories), plan workout_sessions.
- **Offline behavior**: View recent progress offline (Phase 6).
- **Security**: RLS.
- **Success criteria**: Only plan activity advances the plan daily goal.

---

## F-17 Reports

- **Purpose**: Show activity/progress across periods.
- **Actor**: Authenticated member.
- **Input**: Period filter (Today / This Week / This Month / Last 30 Days / All Time).
- **Output**: Metrics: weight, calories, workout duration, workout count, streak.
- **Preconditions**: Authenticated.
- **Main flow**: Select period → computed metrics from sessions + weight history.
- **Alternate flow**: Switch period.
- **Error flow**: No data → empty state (not an error).
- **Edge cases**: No workouts, multiple workouts same day, Plan + Discover mix, range boundaries, new user. See edge-cases.md.
- **Data needed**: workout_sessions, weight_entries, streak calculation.
- **Offline behavior**: View recent progress offline (cached/recent data, Phase 6).
- **Security**: RLS — reports scoped to authenticated user.
- **Success criteria**: Correct totals across periods; both Plan and Discover included.

---

## F-18 Activity Tracker

- **Purpose**: Show actual workout activity (Plan + Discover).
- **Actor**: Authenticated member.
- **Input**: Period selection.
- **Output**: List of performed sessions with source and duration.
- **Preconditions**: Authenticated.
- **Main flow**: View activity list.
- **Edge cases**: Plan + Discover mix; multiple sessions same day. See edge-cases.md.
- **Data needed**: workout_sessions (source, workout, plan day, duration).
- **Offline behavior**: Recent progress offline (Phase 6).
- **Security**: RLS.
- **Success criteria**: Activity includes both Plan and Discover; distinct from Daily Goal.

---

## F-19 Weight Tracking

- **Purpose**: Record and view weight history.
- **Actor**: Authenticated member.
- **Input**: Weight value + timestamp.
- **Output**: New weight_entries row; current weight updated; history preserved.
- **Preconditions**: Authenticated.
- **Main flow**: Enter weight → stored → charts/history updated.
- **Alternate flow**: Multiple entries same day (keep all or policy per Phase 1).
- **Error flow**: Invalid value → validation.
- **Edge cases**: Weight decreases/increases, duplicates, height change. See edge-cases.md.
- **Data needed**: weight_entries (value, recorded_at).
- **Offline behavior**: Not listed as offline requirement in V1 (Phase 6 decision).
- **Security**: RLS.
- **Success criteria**: Historical entries never overwritten; current weight reflects latest.

---

## F-20 BMI

- **Purpose**: Show derived BMI.
- **Actor**: System / member.
- **Input**: Latest weight, height.
- **Output**: BMI = weight_kg / (height_m)^2.
- **Preconditions**: Height and weight available.
- **Main flow**: Compute on demand from latest values.
- **Alternate flow**: Missing input → hide/placeholder (no stale value).
- **Edge cases**: Height change, weight change. See edge-cases.md.
- **Data needed**: height_cm, latest weight_entries.
- **Offline behavior**: Computable offline from cached data (Phase 6).
- **Security**: None beyond RLS.
- **Success criteria**: BMI always derived from current height/weight.

---

## F-21 Streak

- **Purpose**: Show consecutive-day workout streak.
- **Actor**: System.
- **Input**: Completed workout activity (Plan + Discover).
- **Output**: Current streak count (deterministic).
- **Preconditions**: Authenticated.
- **Main flow**: Compute streak from actual completed sessions.
- **Alternate flow**: No activity → streak 0.
- **Edge cases**: No workouts, gaps, multiple workouts same day. See edge-cases.md.
- **Data needed**: workout_sessions (completed, dates).
- **Offline behavior**: Recent cached progress offline (Phase 6).
- **Security**: RLS.
- **Success criteria**: Deterministic, reproducible, testable streak.

---

## F-22 Notifications

- **Purpose**: Send fitness-related push notifications.
- **Actor**: System.
- **Input**: Permission grant; schedule/triggers (workout reminder, new day available, streak reminder).
- **Output**: Notifications delivered (if permitted).
- **Preconditions**: Platform permission granted.
- **Main flow**: Grant permission → register → send on triggers.
- **Alternate flow**: Denied/revoked/unsupported → feature disabled; app works normally.
- **Error flow**: Service unavailable → silent degradation.
- **Edge cases**: Permission revoked, unsupported browser, service unavailable. See edge-cases.md.
- **Data needed**: Notification preferences, schedules, session state.
- **Offline behavior**: Notifications handled by push service (Phase 6/10).
- **Security**: Permission-aware; no data leakage in notification payloads.
- **Success criteria**: Notifications delivered when permitted; app unaffected when not.

---

## F-23 Profile View / Edit

- **Purpose**: View and edit profile fields.
- **Actor**: Authenticated member.
- **Input**: Profile field updates.
- **Output**: Updated profile.
- **Preconditions**: Authenticated.
- **Main flow**: My Profile → edit → save.
- **Alternate flow**: Cancel.
- **Error flow**: Invalid values → validation.
- **Edge cases**: Fitness level/profile change after plan created → plan unchanged (R10). See edge-cases.md.
- **Data needed**: profiles, fitness_profiles, weight, restrictions.
- **Offline behavior**: Editing requires network (Phase 6 decision).
- **Security**: RLS; identity from session.
- **Success criteria**: Profile updates persist; existing plan not regenerated.

---

## F-24 Offline Workout & Sync

- **Purpose**: Enable offline workout execution and safe sync.
- **Actor**: Authenticated member (with prior online access to cache required data).
- **Input**: Cached workout; offline completion events.
- **Output**: Local session stored; synced to Supabase on reconnect (idempotent).
- **Preconditions**: Device previously online long enough to cache today's workout/media.
- **Main flow**: Offline → view today's workout → perform → record locally → reconnect → sync.
- **Alternate flow**: Cache missing media → graceful fallback.
- **Error flow**: Sync conflict, duplicate sync → idempotent resolution.
- **Edge cases**: Offline launch, partial save, reconnect mid-sync, stale cache. See edge-cases.md.
- **Data needed**: cached workouts/media, pending local sessions, sync state.
- **Offline behavior**: Core of this feature (Dexie/IndexedDB, Serwist service worker).
- **Security**: No client user-ID trust; sync maps to session identity; RLS.
- **Success criteria**: No duplicate sessions; offline completion preserved; sync idempotent.

---

## F-25 Notifications Preference (Settings)

- **Purpose**: Manage notification preferences.
- **Actor**: Authenticated member.
- **Input**: Preference toggles.
- **Output**: Preferences stored.
- **Preconditions**: Authenticated.
- **Main flow**: Settings → toggle preferences → save.
- **Edge cases**: Permission revoked after enabling. See edge-cases.md.
- **Data needed**: notification preferences.
- **Offline behavior**: Phase 10 decision.
- **Security**: RLS.
- **Success criteria**: Preferences respected by notification service.
