# Gym Member Fitness PWA — Architecture

## 1. Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- PostgreSQL RLS
- Serwist
- Dexie / IndexedDB
- Recharts
- Lucide React
- Vercel
- GitHub
- ExerciseDB V1 Free API for initial development/content ingestion

## 2. High-Level Architecture

```
Member Device
    ↓
Next.js PWA
    ├── React UI
    ├── TanStack Query
    ├── Client workout runtime
    ├── Service Worker / Serwist
    └── Dexie / IndexedDB
            ↓
     Next.js Server
      ├── Server Actions
      ├── Route Handlers
      ├── Domain/Application Services
      ├── Repositories
      └── ExerciseDB ingestion client
            ↓
        Supabase
        ├── Auth
        ├── PostgreSQL
        └── Storage
```

## 3. Architectural Layers

### Presentation

Routes, components, interactions, accessibility, visual states. No privileged database operations.

### Application

Use cases and orchestration such as CompleteWorkout, GenerateUserPlan, RecordWeight, GetReports, ToggleFavorite.

### Domain

Plan progression, exercise compatibility, workout completion, calorie estimation, BMI, reports, streaks, and daily-goal rules.

### Data Access

Supabase repositories, IndexedDB/Dexie repositories, ExerciseDB client, storage operations.

### Infrastructure

Supabase configuration, service worker, push notifications, logging, environment management, deployment.

## 4. Authentication

Supabase Auth owns authentication. profiles owns application-level member data. Supported methods: email/password and Google OAuth. Email verification is required in the signup journey. Password reset and account deletion are supported.

## 5. Authorization

Private member data uses PostgreSQL RLS. Browser/client state is untrusted. Ownership is derived from the authenticated Supabase session, not client-provided user IDs.

Private data includes profile, fitness profile, restrictions, weight history, user plan, workout sessions, exercise session records, favorites, and notification preferences/subscriptions.

## 6. Core Domain Model

```
Auth User
   ↓
Profile
   ↓
Fitness Profile + Restrictions + Weight History
   ↓
Base Plan Template
   ↓
User Plan
   ↓
User Plan Days
   ↓
Workout
   ↓
Workout Exercises
   ↓
Exercises
   ↓
Workout Sessions
   ↓
Exercise Session Records
   ↓
Reports / Activity / Streak
```

## 7. ExerciseDB Integration

ExerciseDB is an external source only. The application imports/normalizes data into the internal exercise model.

```
ExerciseDB
   ↓
External DTO
   ↓
Validation / normalization
   ↓
Internal Exercise Model
   ↓
PostgreSQL
```

Never make the UI consume raw ExerciseDB JSON. Never use ExerciseDB IDs as our primary keys. Keep media source replaceable.

## 8. Workout Architecture

- Exercise = reusable content.
- Workout = fixed exercise collection.
- Workout Exercise = prescription (order, sets, reps, duration, rest).
- Workout Session = actual attempt.
- Workout Exercise Session = actual per-exercise state.

This separation is required for reusable content, history integrity, Discover modifications, and resume/skip behavior.

## 9. Plan Architecture

Three base plan templates, 30 days each. A user plan is an assigned version of a base template. User plan days store user-specific progression and preserved targets. Current plans do not regenerate after profile edits in V1.

Plan progression: completed Day N → unlock Day N+1. Future days visible but locked. Missed calendar days do not reset progression.

## 10. Discover Architecture

Discover is workout-centric. Workouts can be linked to multiple categories, focus areas, levels, and duration ranges. Discover reads from the internal database, not ExerciseDB at runtime.

If a Discover workout contains an incompatible exercise, resolve a safe replacement from the controlled exercise library. Never mutate the global workout for a single user.

## 11. Daily Goal vs Reports

- Daily Goal source: current Plan workout only.
- Reports and Activity source: all completed Plan and Discover sessions.

This must remain a strict separation in application queries/services.

## 12. Workout State

Conceptual states:

- idle
- starting
- active
- paused
- resting
- skipped
- interrupted/resumable
- completed

The client may own live timer state; durable session progress is persisted at meaningful checkpoints. Completion must be idempotent.

## 13. Offline Architecture

Serwist manages the service worker/PWA shell. Dexie/IndexedDB stores supported offline data and pending actions. The server remains authoritative.

Offline supported:

- Today's workout
- Downloaded media
- Workout player
- Timer
- Completion recording
- Recent progress

Discover is online-only in V1.

Sync flow:

```
Local action
  ↓
IndexedDB pending operation
  ↓
Network available
  ↓
Server validation + idempotency check
  ↓
PostgreSQL transaction
  ↓
Acknowledgement
  ↓
Local operation marked synced
```

## 14. Security

- RLS for all private member data.
- Server-only secrets.
- Never expose Supabase service-role credentials.
- Validate client inputs server-side.
- Treat IndexedDB as untrusted.
- Never trust client ownership fields.
- Protect password reset and authentication endpoints.

## 15. Time

Store absolute timestamps as UTC/TIMESTAMPTZ. Store a user IANA timezone for date-sensitive streak, report, activity, notification, and plan-calendar logic.

## 16. Reporting

Reports are derived primarily from workout sessions and weight entries. Avoid redundant report tables. Query patterns should be supported with appropriate indexes.

## 17. Deployment

GitHub → CI → Vercel preview → QA → production. Supabase migrations are versioned and applied in order. Development/preview/production environments must be separated appropriately.

## 18. Architecture Principles

1. Keep V1 monolithic and simple.
2. Avoid microservices.
3. Keep domain rules deterministic.
4. Keep external providers replaceable.
5. Keep database normalized where relationships matter.
6. Keep UI independent from raw database/external-provider structures.
7. Preserve historical meaning.
8. Make offline sync idempotent.
