# Application Use Cases — Gym Member Fitness PWA

Phase: Phase 1 — System Architecture
Version: 0.1.0
Date: 2026-08-19

Each use case is classified by execution boundary:
- **Server-only** — must run on the Next.js server (secure operations, RLS-elevated, external API, notification prep).
- **Client-only** — browser-only (timers, offline, media, UI state).
- **Shared** — invoked from both (e.g., server-rendered data fetched by client hooks).
- **Offline-capable** — functions while offline (may queue to outbox and sync).

---

## Auth & Account

| Use case | Boundary | Notes |
|----------|----------|-------|
| CreateMemberAccount | Server-only | Supabase Auth + profile creation; validates inputs. |
| CompleteEmailVerificationFlow | Server-only | Auth callback handling. |
| SignInWithPassword | Client/Server | Supabase Auth; route by onboarding completeness. |
| SignInWithGoogle | Client/Server | OAuth flow via Supabase. |
| RequestPasswordReset | Server-only | Auth. |
| ResetPassword | Server-only | Auth. |
| Logout | Client/Server | Clears session + local policy (Phase 6). |
| DeleteAccount | Server-only | Cascade delete scoped to authenticated user. |

## Onboarding & Profile

| Use case | Boundary | Notes |
|----------|----------|-------|
| SaveOnboardingDraft | Client-only | Local draft in IndexedDB (resume later). |
| CompleteOnboarding | Server-only | Persists fitness profile; triggers plan generation; idempotent. |
| GenerateUserPlan | Server-only | Base plan + deterministic filtering/replacement; exactly one plan. |
| UpdateFitnessProfile | Server-only | Does NOT regenerate plan (R10). |
| GetProfile / GetFitnessProfile | Shared | RLS-safe read. |
| GetBMI | Shared/Domain | Derived from height + latest weight. |

## Plan

| Use case | Boundary | Notes |
|----------|----------|-------|
| GetCurrentPlan | Shared | Server-rendered; cached. |
| GetCurrentPlanDay | Shared | Active (next incomplete) day. |
| GetPlanDayState | Shared | completed/unlocked/locked for a day. |
| UnlockNextPlanDay | Server-only | Runs on completion; idempotent. |
| GetDailyGoal | Shared | Plan-sourced only (R20). |

## Workout

| Use case | Boundary | Notes |
|----------|----------|-------|
| StartWorkout | Shared | Creates in-progress session snapshot (local + server). |
| GetWorkout | Shared | Workout + prescriptions + media metadata. |
| GetWorkoutMedia | Shared | Media URLs from DB (never ExerciseDB directly). |
| ResumeWorkout | Offline-capable | Restore snapshot from IndexedDB; reconcile. |
| SkipExercise | Offline-capable | Record exercise skipped (local; sync). |
| PauseWorkout / ResumePlayback | Client-only | Timer/player state. |
| CompleteWorkout | Offline-capable | Finalize session; outbox; idempotent by client_action_id. |
| GetRecentProgress | Offline-capable | Cached progress for offline view. |

## Discover

| Use case | Boundary | Notes |
|----------|----------|-------|
| GetDiscoverGroups | Shared | Workout-centric; filters by focus/category/level/duration. |
| GetDiscoverWorkout | Shared | Workout detail. |
| PersonalizeDiscoverWorkout | Server-only | Deterministic replacement; runtime variant only. |
| ToggleFavorite | Shared | Idempotent; online-only in V1 (O-07 → Phase 6). |

## Reports / Progress / Weight

| Use case | Boundary | Notes |
|----------|----------|-------|
| GetReports | Shared | Period filter; plan + discover included. |
| GetActivityTracker | Shared | Actual sessions list (plan + discover). |
| GetProgress | Shared | Weight/calories/duration/count/streak view model. |
| GetStreak | Shared/Domain | Deterministic computeStreak (ADR-014). |
| RecordWeight | Server-only | Append-only entry; current weight = latest. |
| GetWeightHistory | Shared | All entries preserved; charts latest-per-day. |
| CalculateCalories | Domain/Shared | MET-based estimate (ADR-015). |

## Notifications

| Use case | Boundary | Notes |
|----------|----------|-------|
| GetNotificationPreferences | Shared | RLS-safe. |
| UpdateNotificationPreferences | Server-only | RLS-safe; permission-aware. |
| RegisterPushSubscription | Server-only | VAPID; server stores subscription. |
| UnregisterPushSubscription | Server-only | On revoke/logout. |
| SendNotification | Server-only | Trigger-based (reminder, new day, streak); non-blocking. |

## Offline & Sync

| Use case | Boundary | Notes |
|----------|----------|-------|
| QueueOfflineAction | Client-only | Outbox write with client_action_id. |
| RunSync | Client-only | Process outbox; idempotent; backoff; states pending/syncing/synced/failed. |
| DetectConnectivity | Client-only | Online/offline events; triggers sync. |
| PrefetchWorkoutMedia | Client-only | Cache today's workout media for offline. |
| GetCachedMediaAvailability | Client-only | Whether media is available offline. |

---

## Invocation pattern summary

- **Server-only** → Server Actions (app mutations) or Route Handlers (structured contracts/webhooks/external).
- **Shared reads** → server components / TanStack Query hitting repositories through RLS-safe clients.
- **Offline-capable** → client orchestrates local state + outbox; server validates on sync.
- **Client-only** → React state + Dexie + browser APIs; never touch privileged DB.