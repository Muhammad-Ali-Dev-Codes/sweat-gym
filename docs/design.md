# Gym Member Fitness PWA — Design Direction & UI/UX Plan

## 1. Design Status

The final UI/UX has NOT been designed yet.

Final visual design will be created during:

- Phase 7 — UI/UX Design with Stitch

Until Phase 7, this document defines the product's design direction and required screens, not the final visual implementation.

## 2. Design Goals

- Mobile-first
- Premium fitness-app feel
- Minimal and modern
- Strong visual hierarchy
- Fast to understand
- Clear daily workout focus
- Clean Apple-inspired simplicity
- High usability with one-hand mobile interaction
- Responsive on tablet and desktop
- Accessible controls and states

## 3. Primary Viewport

Primary design target: approximately 390px wide.

Secondary: tablet and desktop responsive layouts.

## 4. Navigation

### Desktop

- Plan
- Discover
- Reports
- My Profile
- Notifications integrated into sidebar/header structure

### Mobile

- Primary navigation optimized for thumb reach
- Notifications available in bottom navigation area as approved

## 5. Required Screens

### Public

- Landing
- Login
- Signup
- Email verification return
- Forgot password
- Password reset

### Onboarding

- Welcome
- Plan selection
- Push-up ability
- Plank ability
- Height/current weight
- Target weight
- Physical concerns
- Plan generation

### App

- Dashboard
- Plan overview
- Plan day detail
- Workout player
- Workout resume state
- Discover home
- Discover workout detail
- Reports
- Weight/progress
- My Profile
- Notifications
- Logout confirmation if needed
- Delete account confirmation

### System States

- Loading
- Empty
- Error
- Offline
- No notification permission
- Locked day
- Completed day
- No workout history
- Missing media
- Sync pending
- Sync failed

## 6. Dashboard Design Intent

The dashboard should answer one question immediately:

> "What should I do today?"

Expected content hierarchy:

1. Greeting/member context
2. Current daily plan/workout
3. Daily Goal progress
4. Progress/streak summary
5. Recent activity or useful shortcut

Do not overload the first screen with secondary metrics.

## 7. Plan Design Intent

Show Day 1–Day 30 clearly.

States:

- Completed
- Current/unlocked
- Locked
- Future

The plan should communicate progression without making skipped calendar days feel like failure.

## 8. Discover Design Intent

Discover should feel like a curated fitness library.

Sections:

- Focus Area
- Picks for You
- Stretching & Warmup
- Fat Burning
- Strength & Tone
- Levels
- Duration

Each workout card should make the important information quickly scannable:

- Workout name
- Duration
- Estimated calories
- Difficulty/level where relevant
- Equipment where relevant
- Favorite heart

## 9. Modified Discover Workout

When an exercise is replaced because of profile restrictions, the modified workout should be shown clearly.

The user should understand that the workout has been adjusted for their profile without making the experience feel broken.

A design decision for Phase 7 should determine whether to show an explicit note such as:
> "Adjusted for your profile"

## 10. Workout Player Design Intent

The workout player should prioritize the current exercise.

Expected information:

- Exercise name
- GIF/animation
- Instructions
- Sets/reps or duration
- Rest timer
- Overall progress
- Pause/resume
- Skip

The current exercise should dominate the visual hierarchy.

## 11. Reports Design Intent

Reports should make consistency easy to understand.

Primary metrics:

- Weight trend
- Workout consistency
- Streak

Supporting metrics:

- Calories
- Duration
- Workout count

Filters:

- Today
- This Week
- This Month
- Last 30 Days
- All Time

## 12. Weight/BMI Design Intent

The member should be able to quickly see:

- Current weight
- Target weight
- Weight trend
- BMI
- Recent measurements

Weight entry must be easy to access without navigating through complex settings.

## 13. Profile Design Intent

Show:

- Name
- Email
- Age
- Height
- Current weight
- Target weight
- Fitness level
- Physical concerns

Actions:

- Edit profile
- Logout
- Delete account

## 14. Notifications Design Intent

Notifications should feel useful, not spammy.

Possible groups:

- Workout reminders
- New-day reminders
- Streak reminders

Permission-denied state should explain that the app still works normally.

## 15. Accessibility

- All interactive controls must have clear labels.
- Heart favorite buttons must be accessible.
- Locked days need a clear locked state.
- Color must not be the only way to communicate status.
- Timers should remain understandable with assistive technology where practical.
- Reduced-motion support should be considered.

## 16. Media Design

Primary exercise media for V1:

- GIF/animation
- Optional thumbnail
- Optional video where legally permitted

Media should load efficiently and not overwhelm mobile bandwidth. Use lazy loading and appropriate previews.

## 17. Stitch Workflow

When Phase 7 begins:

1. Feed Stitch the approved PRD, Rules, Architecture, and this Design Direction.
2. Generate the visual system and screen layouts.
3. Review all major states, not only happy-path screens.
4. Freeze approved design decisions.
5. Update this file with final visual specifications.
6. Use the approved Stitch output as the visual source of truth for implementation.

## 18. Design Rules

1. Do not design around admin/gym-management concepts.
2. Keep the member journey central.
3. Make the current workout obvious.
4. Keep controls thumb-friendly on mobile.
5. Avoid excessive dashboard density.
6. Do not invent features outside the approved PRD.
7. Preserve accessibility and clear feedback states.
