# Gym Member Fitness PWA — Product Requirements Document

## 1. Product

A member-only fitness Progressive Web App for personalized 30-day workouts, Discover workouts, workout execution, progress tracking, reports, streaks, notifications, and essential offline workout functionality.

## 2. V1 Scope

### Included

- Landing page
- Signup with full name, email, password
- Email verification
- Login with email/password and Google OAuth
- Forgot/reset password
- 8-step onboarding
- Personalized 30-day plan
- Beginner, Intermediate, Advanced plans
- Plan progression and locked future days
- Workout player
  - GIF/animation demonstrations
  - Instructions
  - Sets, reps, duration, rest timers
  - Pause/resume
  - Exercise skipping
  - Workout resume
- Discover workouts and filters
- Profile-aware Discover workout modification
- Heart favorites
- Reports and activity
- Weight history
- BMI
- Progress charts
- Streaks
- Push notifications
- My Profile
- Logout and account deletion
- Offline today's workout, downloaded media, workout execution, timer, completion, recent progress

### Excluded from V1

- Admin dashboard
- Trainer dashboard
- Gym membership management
- Payments/subscriptions
- Nutrition/meal plans
- Social/community features
- AI-generated workout plans
- Discover offline support
- Dedicated favorites page
- User equipment inventory

## 3. User Journey

Landing → Get Started → Signup → Email verification → Login → Onboarding → Plan generation → Dashboard.

Returning users with completed onboarding → Dashboard.

## 4. Onboarding

1. Welcome screen with Start button.
2. Fitness plan: Beginner (5–10 min/day), Intermediate (10–20), Advanced (15–30).
3. Push-ups: unable, 0–5, 5–10, 10–20, 20+.
4. Plank: unable, 0–30 sec, 30–60, 60–120, 120+.
5. Height and current weight; internally cm/kg.
6. Target weight; internally kg.
7. Physical concerns: No concern, Low impact, No jumping. Multiple selections allowed.
8. Generate personalized plan.

## 5. Main Navigation

- Plan
- Discover
- Reports
- My Profile

Notifications available in desktop navigation and mobile bottom navigation.

## 6. Plan

Three base plans exist:

- Beginner 30-Day Plan
- Intermediate 30-Day Plan
- Advanced 30-Day Plan

Each user receives a fixed base plan according to onboarding fitness level. The current plan is not regenerated immediately when the member later edits their profile.

Day N must be completed before Day N+1 unlocks. Future days are visible but locked. If the user misses several calendar days, the plan does not reset; the next incomplete day remains next. Plan day number and actual completion calendar date are separate.

The daily goal is based only on the assigned plan workout target duration and target estimated calories. Discover workouts do not contribute to the plan daily goal.

## 7. Workout Rules

Workouts are fixed collections of reusable exercises. Exercises contain media, instructions, metadata, equipment, levels, focus areas, and safety restrictions. Workout prescriptions define sets, reps, duration, and rest.

Users may pause, resume, exit, and skip individual exercises. A skipped exercise does not block completion. A workout is completed when the user reaches the end. Leaving mid-workout should allow resume from the last unfinished exercise.

## 8. Discover

Discover contains fixed workouts, not primary individual exercise listings.

### Focus Area

Full Body, Abs, Arm, Chest, Butt & Legs

### Picks for You

Lose Belly Fat, 20 Minutes Calorie Burner, Lose Fat (No Jumping)

### Stretching & Warmup

Before Workout Warmup, Fresh Start Warm Up, Sleep Time Stretching, Full Body Stretching, 7 Minute Lower Body Stretch Routine, Lazy Morning Stretching

### Fat Burning

Fat Burning HIIT, 20 Min Body Calorie Burner, Lose Belly Fat, Beginner Weighted Abs Burn

### Strength & Tone

Abs Workout (No Crunch!), Quick Bigger Chest Building, Lose Fat (No Jumping), Beginner Chest Workout, Dumbbell Arm Toning

### Level Filters

Beginner, Intermediate, Advanced

### Duration Filters

<10 min, 10–15 min, 16–35 min

One workout may appear in multiple categories, focus areas, and levels where appropriate. No search is required for V1. Beginners may open Advanced Discover workouts.

If a Discover workout contains an exercise incompatible with the user's profile restrictions, the workout remains accessible and is modified by replacing incompatible exercises with compatible controlled-library exercises where possible. The modified workout is shown to the user. The global workout is never mutated.

Favorites use a heart icon. No dedicated Favorites page is required.

## 9. Reports and Activity

Reports support Today, This Week, This Month, Last 30 Days, and All Time.

### Metrics

- Weight
- Estimated calories
- Workout duration
- Workout count
- Streak

Reports and Activity include both Plan and Discover workout sessions.

Example: Plan Day 4 (8 min) + Discover (5 min) + Discover (12 min) = 3 workouts, 25 total minutes, combined estimated calories.

## 10. Weight and BMI

Members may record weight at any time. Historical entries are preserved. Current weight is the latest valid entry. Target weight comes from the fitness profile.

BMI is derived from current weight and height and updates automatically when either changes. Do not treat BMI as a primary stored source of truth.

## 11. Notifications

Push notifications are supported. Permission denial must not break core app functionality. Notifications may cover workout reminders, new-day reminders, and streak reminders.

## 12. Offline

Offline support includes:

- View today's workout
- View downloaded workout GIFs/images
- Perform workout
- Timer/rest timer
- Record completion
- View recent progress

Discover is online-only in V1. Offline mutations must synchronize safely to Supabase when connectivity returns and must not create duplicate sessions.

## 13. Content Source

Initial exercise source: ExerciseDB V1 Free API at https://oss.exercisedb.dev/api/v1.

It provides about 1,500 structured exercises with GIF-based visual media and metadata. Its displayed free terms are non-commercial/prototype-oriented, so it is an initial development/content source, not an assumed permanent commercial media license. The internal model must remain replaceable.

## 14. Success Criteria

1. A member can complete signup, verify email, log in, and finish onboarding.
2. A deterministic 30-day plan can be assigned.
3. Plan progression and locking work correctly.
4. Workouts can be executed, paused, resumed, skipped, and completed.
5. Discover workouts can be filtered and safely modified for restrictions.
6. Reports and activity accurately include Plan + Discover activity.
7. Daily Goal includes Plan only.
8. Weight/BMI/progress work correctly.
9. Offline workout use and sync work without duplicate sessions.
10. Private member data is protected by authentication and RLS.
