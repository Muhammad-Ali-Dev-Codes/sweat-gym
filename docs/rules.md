# Gym Member Fitness PWA — Rules & Invariants

## Product Rules

1. The app is member-only in V1.
2. V1 is completely free; no payments, subscriptions, or gym membership billing.
3. No admin/trainer interfaces in V1.
4. One account maps to one member profile.
5. Email verification is required in the signup flow.
6. Login supports email/password and Google OAuth.

## Profile Rules

1. Profile contains full name, email, age, height, current weight, target weight, fitness level, and physical concerns.
2. Weight is stored internally in kg; height in cm.
3. Users may edit profile data later.
4. Changing the profile does not immediately regenerate the current 30-day plan in V1.
5. Historical weight entries are never overwritten.
6. BMI is derived from current weight and height.

## Onboarding Rules

1. Onboarding has eight steps.
2. Physical concerns are multi-select.
3. V1 physical concerns are No concern, Low impact, and No jumping.

## Plan Rules

1. There are three controlled base plans: Beginner, Intermediate, Advanced.
2. Each base plan has 30 days.
3. Day N must be completed before Day N+1 unlocks.
4. Future days are visible but locked.
5. Missing calendar days does not reset plan progress.
6. Plan day number is distinct from actual calendar completion date.
7. A user's current plan remains stable after profile edits in V1.
8. Daily Goal uses the assigned Plan workout only.
9. Discover activity never contributes to the Plan Daily Goal.
10. User cannot skip a plan day.

## Workout Rules

1. Exercise is reusable content; Workout is a fixed collection of exercises.
2. Workout prescriptions can use reps, duration, or both.
3. Rest is supported.
4. User can pause, resume, exit, and skip individual exercises.
5. Skipping an exercise does not prevent overall workout completion.
6. Reaching the end marks the workout completed.
7. An interrupted workout should be resumable from the last unfinished state.
8. Duplicate completion attempts must be idempotent.

## Discover Rules

1. Discover items are workouts, not the primary individual exercise catalog.
2. One workout can belong to multiple categories/focus areas/levels.
3. No Discover search is required for V1.
4. Beginners may open Advanced Discover workouts.
5. Incompatible Discover exercises are replaced with compatible controlled-library exercises where possible.
6. The original global workout must never be mutated for one user.
7. Discover workouts may be repeated.
8. Favorites are represented by a heart icon; no separate Favorites page is required.

## Safety Rules

1. Exercise restrictions are structured metadata.
2. Multiple restrictions may apply to one exercise and one user.
3. Safety matching is deterministic.
4. Do not use AI as the final safety decision-maker.
5. Do not provide medical diagnoses or treatment decisions.

## Reporting Rules

1. Reports include Plan and Discover sessions.
2. Activity Tracker includes Plan and Discover sessions.
3. Daily Goal includes Plan sessions only.
4. Reports support Today, This Week, This Month, Last 30 Days, and All Time.
5. Streaks are derived from actual completed workout activity using a deterministic rule.
6. Estimated calories are not presented as medically exact measurements.

## Data Rules

1. Public exercise/workout content is not member-editable.
2. Private member data is isolated using Supabase Auth + PostgreSQL RLS.
3. Never trust client-supplied user IDs for authorization.
4. ExerciseDB IDs are external IDs, not internal primary keys.
5. ExerciseDB must remain a replaceable external source.
6. Historical workout/session meaning must survive future content edits.
7. Report tables are not required when data can be derived from sessions/history.

## Offline Rules

1. Today's workout can work offline.
2. Discover does not need to work offline in V1.
3. Offline writes must be validated on the server during sync.
4. Sync must be idempotent.
5. Offline retries must not create duplicate workout sessions.
6. Local IndexedDB state is untrusted client state, not the final source of truth.

## Engineering Rules

1. Use TypeScript strict mode.
2. Validate external/user inputs.
3. Keep secrets server-side.
4. Never expose Supabase service-role credentials.
5. Use migrations for database schema changes.
6. Avoid unnecessary libraries and microservices.
7. Preserve existing working code when extending the project.
8. Verify work with typecheck, lint, tests, and build where applicable.
9. Never claim success without verification.
