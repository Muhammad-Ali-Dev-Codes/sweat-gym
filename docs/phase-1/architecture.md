# System Architecture — Gym Member Fitness PWA

Phase: Phase 1 — System Architecture
Status: Draft for review
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`, `/docs/phase-0/*`

This document defines the complete technical architecture for the Gym Member Fitness PWA, preserving every approved Phase 0 business rule. Diagrams referenced here live in `diagrams.md`. Decisions are recorded in `adrs.md` and `decisions.md`.

---

## 1. Architecture Goals

| Goal | Approach |
|------|----------|
| Correctness | Deterministic domain rules; invariants enforced in domain layer and DB constraints |
| Security | Supabase Auth + RLS; server-only secrets; never trust client identity |
| Maintainability | Layered architecture; domain boundaries; feature folders |
| Testability | Pure domain services; documented testable invariants (`invariants.md`) |
| Offline reliability | Outbox sync with idempotency keys; no duplicate sessions |
| Data integrity | Normalized schema; foreign keys; unique constraints (Phase 2) |
| Clear separation of concerns | Presentation → Application → Domain → Data Access → Infrastructure |
| Performance | Server rendering; lazy media; indexed queries |
| Simple deployment | Monolithic Next.js on Vercel + Supabase |
| Minimal operational complexity | No microservices; minimal paid infra |
| Replaceable external dependencies | ExerciseDB behind an ingestion/abstraction layer |
| Deterministic personalization | Rule engine; no LLM in workout/plan logic |

---

## 2. High-Level Architecture

```
┌────────────────────────────┐
│     MEMBER DEVICE          │
│  Browser / PWA (Next.js)   │
│  Service Worker (Serwist)  │
│  IndexedDB (Dexie)         │
└─────────────┬──────────────┘
              │ HTTPS
┌─────────────▼──────────────┐
│      NEXT.JS (Vercel)      │
│  App Router · Server       │
│  Actions · Route Handlers  │
│  Server Components         │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│         SUPABASE           │
│  ├── Auth                  │
│  ├── PostgreSQL (+RLS)     │
│  └── Storage (future)      │
└────────────────────────────┘

External content (development source):
ExerciseDB API ──ingestion/import layer──▶ PostgreSQL (internal domain model)
```

**Key principle:** The browser never depends on the external ExerciseDB API for normal application operation. All exercise content is served from our database after ingestion/normalization.

See diagram D1 in `diagrams.md`.

---

## 3. Architectural Layers

| Layer | Responsibility | Location |
|-------|----------------|----------|
| L1 Presentation | UI components, pages, states, accessibility, navigation | `src/app`, `src/components`, `src/features/*` |
| L2 Application | Use cases, orchestration, input validation | `src/application/use-cases` |
| L3 Domain | Business rules (plan progression, safety, daily goal, streak, calories, BMI, compatibility) | `src/domain/*` |
| L4 Data Access | Supabase queries, IndexedDB ops, repositories | `src/repositories`, `src/lib/sync` |
| L5 Infrastructure | Supabase client, ExerciseDB client, PWA, notifications, logging, env config | `src/lib/*` |

**Rules**
- L1 must not contain complex business logic or privileged DB operations.
- L3 must not depend on React components or the UI.
- Domain rules are pure, deterministic, and unit-testable.

---

## 4. Next.js Architecture

- **Framework:** Next.js (App Router).
- **Server features** for: secure data fetching, mutations, external API access, protected business operations, ExerciseDB ingestion, sensitive operations.
- **Client components** only where interactivity/browser APIs are required (workout timer, PWA install UI, offline detection, interactive filters, workout controls, notification permission UI).
- Do not mark entire route trees as client components unnecessarily.
- Prefer server-rendered content for static/secure data where practical.

---

## 5. Route Architecture

### Public
- `/` — landing
- `/login`, `/signup`
- `/auth/callback` — OAuth/email verification return
- `/forgot-password`, `/reset-password`

### Onboarding (auth-protected, onboarding incomplete)
- `/onboarding` — wizard (steps handled client-side)

### App (auth-protected)
- `/dashboard`
- `/plan`
- `/plan/day/[day]`
- `/workout/[workout]`
- `/discover`
- `/discover/[workout]`
- `/reports`
- `/profile`
- `/notifications`

**Rule:** All app routes require an authenticated session. Middleware/guard redirects unauthenticated users to `/login` and unverified/incomplete-onboarding users to verification/onboarding as applicable.

---

## 6. Authentication Architecture

- Provider: Supabase Auth (email/password + Google OAuth).
- Use the recommended Next.js + Supabase SSR session pattern (cookies, `createServerClient`).
- Authentication state available securely on the server (middleware + server components/actions).
- Do NOT store auth tokens manually in localStorage.
- Never expose Supabase service-role credentials to the client.
- Email verification is part of signup (R5).

**Flow:** Signup → Supabase Auth → verification email → verification → return to app → login → onboarding.

---

## 7. Authorization Architecture

- Authentication = who; Authorization = what (RLS).
- Every member-private table has RLS (see §73 matrix and Phase 2).
- Never rely solely on frontend hiding.
- Never trust a client-supplied `user_id`; always derive identity from the verified Supabase session.

### Private vs public data

| Private (RLS per user) | Public/shared (read-only to app) |
|------------------------|----------------------------------|
| profile, fitness profile, user restrictions, weight history, user plan, plan progress, workout sessions, exercise session records, favorites, notification preferences | exercises, exercise metadata, workout templates, Discover workouts, base plan templates, taxonomy (focus areas, levels, categories, equipment, restrictions) |

---

## 8. Database Interaction Architecture

```
UI → Application Use Case → Repository/Data Service → Supabase → PostgreSQL
```

- Repositories centralize data access; no scattered raw Supabase queries in UI components.
- Direct client queries allowed only where RLS safely supports them.
- Server-side operations use the SSR client; elevated-privilege ops use server-only client with service role (never client).

### Repository domains
`profiles`, `fitness`, `plans`, `workouts`, `exercises`, `sessions`, `reports`, `notifications`, `favorites`, `weight`

**Rule:** Do not create needless wrappers around every Supabase call. Abstract repeated domain operations, important business rules, testable boundaries, and external provider replacement.

---

## 9. Use Case Architecture

Application use cases orchestrate domain + repositories. Each is classified (see `use-cases.md`): server-only / client-only / shared / offline-capable.

Key use cases:
`CompleteOnboarding`, `GenerateUserPlan`, `GetCurrentPlanDay`, `UnlockNextPlanDay`, `StartWorkout`, `ResumeWorkout`, `SkipExercise`, `CompleteWorkout`, `RecordWeight`, `GetBMI`, `GetReports`, `GetProgress`, `ToggleFavorite`, `GetDiscoverWorkout`, `PersonalizeDiscoverWorkout`, `UpdateFitnessProfile`, `Logout`, `DeleteAccount`, `RequestPasswordReset`, `UpdateNotificationPreferences`.

---

## 10. Domain Services

Conceptual boundaries (implement as pure functions/modules unless a class is justified):

- `PlanProgressionService`
- `ExerciseCompatibilityService`
- `DiscoverPersonalizationService`
- `WorkoutCompletionService`
- `DailyGoalService`
- `CalorieEstimationService`
- `StreakService`
- `BMIService`
- `ReportService`
- `ReplacementRanker` (deterministic replacement selection)

---

## 11. Plan Architecture

- Three base 30-day templates: Beginner / Intermediate / Advanced (R9).
- **Separate:** base plan template vs. user's plan instance.
- Hierarchy: Plan Template → Plan Day Template → User Plan → User Plan Day → Workout Session.
- Profile changes do NOT regenerate the existing user plan in V1 (R10).
- Progression: Day N complete → Day N+1 unlocked.
- Missed days: progress stays on next incomplete day (no reset).
- `plan_day_number` and `actual_activity_date` stored separately.

---

## 12. Workout Architecture

Mandatory separation:
- **Exercise** — reusable content (media, instructions, metadata).
- **Workout** — fixed collection of exercises.
- **Workout Exercise Prescription** — order, sets, reps, duration, rest.
- **Workout Session** — actual attempt (user, workout, source, plan day, start/end, duration, calories, status).
- **Workout Exercise Session** — per-exercise state (completed / skipped).

Source context: `workout_session.source ∈ {plan, discover}`. The same base workout object may be used by both Plan and Discover — never duplicate the workout solely for source.

---

## 13. Workout Player State Machine

States: `idle → starting → active ⇄ paused → resting → active → … → completed`
- `active → skipped → next exercise` (skip does not fail workout)
- `active → interrupted → resumable` (exit)
- `resumable → active` (return)
- final exercise `active → completed`

In-progress state is persisted locally (IndexedDB) and optionally server-side; resume restores the last unfinished exercise/state. See diagram D5.

---

## 14. Workout Session Idempotency

Critical invariant: one completion event = one session.

**Strategy**
- Client generates a UUID `client_action_id` at session start (survives across the workout and offline).
- Server applies a unique constraint on `(user_id, client_action_id)` for `workout_sessions`.
- Duplicate submission (double click, retry, reconnect, offline sync, browser refresh) returns the existing row instead of creating a new one.
- `workout_exercise_sessions` are keyed to the parent session; upserts are idempotent by `(session_id, exercise_index)`.

---

## 15. Daily Goal Architecture

- Daily goal source: current plan day's target (duration + estimated calories).
- **Contributors:** completed plan-sourced sessions only.
- **Non-contributors:** Discover sessions.
- Server view model separates: planned duration, planned calories, actual plan-session duration, actual plan-session calories, and Discover activity — so dashboard calculations never mix sources (R20, R21).

---

## 16. Reporting Architecture

- Source: `workout_sessions` (both sources) + `weight_entries`.
- Periods: Today / This Week / This Month / Last 30 Days / All Time.
- Aggregation via `ReportService` over repositories; no duplicated report tables (D-34).
- Weight charts from `weight_entries` (latest per day for display; all entries preserved).

---

## 17. Streak Algorithm (DECIDED)

Definition (resolves Phase 0 O-05):

- **Workout day:** a calendar day (in the member's timezone) with ≥1 completed workout session (source plan or discover).
- Multiple sessions on the same day count as one workout day.
- **Current streak:** count of consecutive workout days ending on today or yesterday, in the member's timezone. If the most recent workout day is before yesterday, streak = 0.
- A workout performed today is included immediately; an active streak remains "alive" through today even before today's workout.
- Pure function: `computeStreak(workoutDays: Date[], today: Date, timezone: string): number` — deterministic and unit-testable.
- Timezone: member timezone derived from browser at first authenticated load and stored on the profile.

See `decisions.md` (P1-D-11) and `adrs.md` (ADR-014).

---

## 18. Calorie Estimation Architecture (DECIDED)

Resolves Phase 0 O-08. Deterministic MET-based estimate:

```
estimated_kcal = MET × weight_kg × duration_hours
```

- `MET` assigned from workout intensity: light = 3.5, moderate = 5.0, high = 7.5 (approximate Compendium-of-Physical-Activities values; documented, not medical-grade).
- Default intensity derives from the workout's level (beginner→light, intermediate→moderate, advanced→high); can be overridden as workout metadata.
- Plan target calories: computed from target duration × MET × weight at plan generation.
- Session actual calories: computed from actual performed duration × MET × current weight.
- Round to nearest integer kcal.
- UI labels all values as estimates.
- Missing inputs → documented defaults (weight = latest entry; duration = performed duration).

See `decisions.md` (P1-D-12) and `adrs.md` (ADR-015).

---

## 19. BMI Architecture

- Derived value: `BMI = weight_kg / (height_m)²`.
- Inputs: latest weight entry + current height.
- No stored BMI column; computed on demand (no stale values).
- Missing height/weight → BMI not shown (placeholder), never a stale value.

---

## 20. ExerciseDB Integration

- Dedicated `ExerciseDbClient` (server-side only) for: exercises, single exercise, search, equipment, body parts, muscles.
- Response structures isolated: External DTO → Mapper/Normalizer → Internal Exercise domain model.
- UI never understands ExerciseDB JSON; UI reads from our database.
- Rate limits of ExerciseDB respected; ingestion throttled/paginated (`meta.total`, `nextCursor` observed in validation).

### Ingestion

- Server-side script/command (development/admin utility), not member-facing runtime.
- Modes: initial import + controlled refresh. No public admin interface in V1.
- Normal member requests never depend on live ExerciseDB.

### Normalization mapping

| ExerciseDB | Internal |
|-----------|----------|
| `exerciseId` | `external_exercise_id` |
| — | `external_source = 'exercisedb'` |
| `gifUrl` | `animation_url` (media abstraction) |
| `name` | `name` |
| `bodyParts`, `targetMuscles`, `secondaryMuscles` | mapped metadata |
| `equipments` | equipment relationships (mapped) |
| `instructions` | instructions steps |
| — | our focus areas, levels, restrictions, categories, difficulty, timing mode (added by us) |

Our product taxonomy is authoritative; ExerciseDB taxonomy is input data.

---

## 21. Media Architecture

- `ExerciseMedia`: source, URL, media type, external identifier.
- Exercise record fields: `animation_url`, `thumbnail_url`, `video_url`, `media_source`, `external_media_id`.
- V1 primary: GIF/animation. Video optional (where legally permitted).
- No hardcoded third-party media URLs in presentation code; UI requests media from our DB/service.
- Media source replaceable without touching workout logic, taxonomy, schema, or UI components.

---

## 22. Discover Architecture

- Workout-centric: Workout + category/focus-area/level relationships + duration attribute.
- Queries operate over internal PostgreSQL data; never fetch Discover from ExerciseDB.
- Filters: focus area, category, level, duration (duration from real values, D/A-18).
- V1: no search.
- One workout may appear in multiple groups (single record).

### Discover personalization

```
Fetch workout → fetch exercises → fetch user restrictions → check compatibility
→ replace incompatible exercises (deterministic) → present modified workout
```
- Original fixed workout unchanged; the modified version is a runtime/session variant, never persisted as a global overwrite.
- Replacement ranked deterministically (see §Replacement Algorithm).

### Replacement algorithm (deterministic)

Candidate ranking (priority order):
1. Same focus area
2. Same or compatible level
3. Same movement mode (e.g., lower-body strength)
4. Same equipment requirements
5. Same approximate duration
6. Same intensity
7. No conflict with user restrictions

Example: incompatible `Jump Squat` → candidate `Bodyweight Squat` / step-back movement / another lower-body movement.

No random selection. No unsafe replacement. If no safe replacement exists:
- Mark exercise unavailable with a clear "not suitable for your profile" note, or
- Use a known safe fallback (from a curated safe pool), or
- Adjust workout duration accordingly and explain the modification.
Never invent a replacement; never silently present an unsafe exercise. (See `decisions.md` O-06 → P1-D-14.)

---

## 23. Restriction Matching

- User restrictions: `low_impact`, `no_jumping` (set; empty = none).
- Exercise restrictions: `no_jumping`, `low_impact`, `knee_sensitive`, `back_sensitive`, `no_crunch`, … (an exercise may have many).
- Mismatch = any exercise restriction is incompatible with any user restriction (both directions considered; e.g., exercise requires no_jumping-compatible = it has no `no_jumping` tag when the user has `no_jumping`).
- All matching exclusions apply; multiple restrictions handled by intersection of allowed sets.
- No fuzzy/AI interpretation in V1.

---

## 24. Equipment Architecture

- Equipment is exercise/workout metadata only.
- No user equipment inventory (R/X-07 out of scope).
- Workout details display required equipment ("Equipment required: Dumbbells, Bench").
- No ownership/availability assumptions.

---

## 25. Offline Architecture

- PWA: Serwist service worker.
- Local DB: Dexie + IndexedDB.
- Offline-capable (V1): today's plan workout view, downloaded workout media, workout player, timer, completion recording, recent progress.
- Not required offline: Discover.

### Data categories

| Cacheable static | Local mutable | Server source of truth |
|------------------|----------------|------------------------|
| App shell, approved assets, today's workout, required exercise metadata, downloaded exercise media | Active workout state, pending completion events, recent progress cache, offline session records | Account, long-term history, user plan, exercise library, reports, persistent favorites |

### Cache strategy

- App shell/static assets: Serwist precache (versioned).
- Exercise media: runtime cache-first for approved/downloaded media URLs; only cache today's workout media + explicitly downloaded assets, never the whole ExerciseDB catalog.
- API/private data: TanStack Query caching in memory/IndexedDB; the service worker must NOT cache authenticated responses containing private data in shared caches.

### Download management

- What: today's workout + its exercise media (GIFs/thumbnails).
- Where: IndexedDB (metadata) + Cache Storage (media blobs) via service worker.
- Storage: bounded quota (e.g., warn when approaching browser quota).
- Deletion: evicted when workout no longer current, on explicit user action, or on account deletion/logout policy.
- Failure: graceful fallback (thumbnail/placeholder + instructions); app continues.
- Availability: app queries IndexedDB to know if media is available offline.

---

## 26. Offline Sync Architecture

Outbox pattern with idempotency:

```
User action → update local state → create local sync record (outbox)
→ UI confirms → network available → sync engine sends action
→ server validates → idempotency check (client_action_id)
→ DB transaction → ack → mark local record synced
```

- Failure → retry with backoff.
- Permanent validation failure → mark `failed`, preserve diagnostics, expose recoverable UX.
- Never silently delete failed offline operations.
- Sync is idempotent (client_action_id unique per server row).
- No duplicate sessions (offline or online).

### Sync lifecycle states
`pending → syncing → synced | failed` (per outbox record). Retry strategy: exponential backoff with jitter; retry on connectivity events; manual retry surface.

---

## 27. State Management Architecture

| Category | Mechanism |
|----------|-----------|
| Server state (Supabase-backed) | TanStack Query (cache + invalidation) |
| UI state (modals, tabs, filters) | React local state / context where needed |
| Workout runtime (current exercise, timer, pause/resume, progress) | React state + persisted snapshot in IndexedDB |
| Offline state (sync queue, pending ops) | Dexie/IndexedDB (outbox) + sync engine |

No Redux unless a concrete requirement proves necessary.

### TanStack Query conventions
Centralized query-key factory (`src/lib/query-keys.ts`). Examples:
```
['profile'], ['fitness-profile'],
['plan'], ['plan-day', day],
['workout', workoutId],
['reports', range], ['weight-history', range],
['notifications'], ['favorites']
```
No ad-hoc random keys.

---

## 28. API Architecture

| Concern | Mechanism |
|---------|-----------|
| Secure app mutations tightly coupled to app | Server Actions |
| Public/structured contracts, webhooks, external integrations, client HTTP APIs when required | Route Handlers |
| RLS-safe reads | Direct Supabase client |
| External API access / credentials | Server-side only (ExerciseDbClient) |

Avoid creating APIs for the sake of APIs. Every custom endpoint documents: purpose, method, auth, authorization, request schema, response schema, validation, error responses, idempotency, rate limiting (Zod-compatible).

---

## 29. Error Architecture

Categories: `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `NetworkError`, `SyncError`, `ExternalServiceError`, `InternalError`.

- User-facing: clear, helpful, non-technical.
- Logged: technical context, no secrets/credentials/stack traces to users.
- Loading / empty / error / offline states defined per async feature (F-xx and `non-functional-requirements.md`).

---

## 30. Validation Architecture

- Zod for all input: signup, login, onboarding answers, profile updates, weight, height, fitness level, restrictions, workout operations, API inputs, sync actions, external API data.
- Client validation improves UX; **server validation is authoritative**.

---

## 31. Security Architecture

- Auth boundaries: Supabase Auth; SSR session; middleware.
- Authz boundaries: RLS everywhere private.
- CSRF: SameSite cookies; validate origin on mutations where relevant.
- Input validation: Zod.
- Rate limiting: signup, login, password reset, onboarding submission, plan generation, notification registration; generous limits on member reads. Respect ExerciseDB limits.
- Session handling: Supabase SSR cookies; refresh handling.
- Secrets: server-only (service role, VAPID keys). `NEXT_PUBLIC_*` only for safe values.
- External API security: ExerciseDB server-side only; no ingestion credentials exposed.
- Account deletion: server-side, cascade within scope (see §37).
- Never trust client ownership fields; identity from session.

---

## 32. Environment Variables

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Safe (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Ingestion scripts / trusted ops only |
| `EXERCISEDB_API_URL` | server-only | default `https://oss.exercisedb.dev/api/v1` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | server + public key client | Phase 10 push |
| `SENTRY_DSN` | server+client | Phase 11 observability |

Rules: only create env vars actually required; never commit `.env` files with secrets.

---

## 33. File / Media Storage

- Supabase Storage may be used later for application-owned media.
- Distinguish: external media (ExerciseDB), cached media (device), application-owned media (future).
- V1: media architecture supports future migration from ExerciseDB without rewriting domain/UI.

---

## 34. Performance Architecture

Targets (Phase 11 measures/verifies):
- Landing load: < 2.5s LCP on mid-range mobile.
- Dashboard data load: < 1s perceived (server-rendered + cached).
- Workout start: < 1s from tap to first exercise.
- Offline startup: instant from cache.
- Discover filter response: < 300ms (server/query cached).
- Report generation: < 500ms.
- Sync operation: < 1s per record on reconnect.

Strategies: server rendering, code splitting, lazy loading, image/media optimization, query caching, DB indexes (Phase 2), avoid N+1, exercise list pagination if required, minimize client JS, PWA caching, thumbnails + lazy media (never load all GIFs at once on Discover).

---

## 35. Scalability

- V1: monolithic, serverless-friendly; no microservices.
- Boundaries that scale independently: Next.js, Supabase Postgres, Supabase Auth, Supabase Storage, server-side ingestion, push infrastructure.
- Clear domain boundaries allow future extraction without redesign.

---

## 36. Observability

- Sentry (Phase 11) for client + server errors; monitor sync failures, external API failures, auth failures, critical workout-session errors.
- Never send sensitive user data to Sentry.
- Domain events model defined in `events.md`; decide later which become analytics events.

---

## 37. Delete Account Architecture

Server-side flow deletes (within authenticated user scope): auth identity, profile, fitness profile, user restrictions, weight history, user plan + days, workout sessions + exercise sessions, favorites, notification subscriptions/preferences.
- FK cascade configured in Phase 2.
- No orphaned private data remains accessible.
- Pending device-local offline data: cleared or ignored on deletion; re-login is a fresh signup.

---

## 38. Profile Update Architecture

- Updates affect: future recommendations, Discover replacement logic, calorie estimates, BMI, profile display.
- Updates do NOT regenerate the current plan (R10).
- Guarded by application logic + tests (invariant INV-09).
- Reports/BMI/future estimates use latest profile data; plan remains stable.

---

## 39. Weight Data Architecture

- `weight_entries` (immutable historical source) is authoritative.
- Current weight = latest entry by `recorded_at`.
- If a convenience profile field exists, sync rules keep it equal to latest entry; never allow silent divergence.

---

## 40. Plan Target vs Actual

- Plan template defines target expectations; user plan day stores assigned target; session stores actual performance.
- Target and actual are separate; never overwrite target with actual.

---

## 41. Data Ownership (Content)

| Ownership | Content |
|-----------|---------|
| Reference data | Taxonomy, levels, restrictions, equipment, focus areas, categories |
| External imported | ExerciseDB-derived metadata/media references |
| Curated product | Workouts, 30-day plans, Discover grouping, safety metadata, replacement mappings |
| User data | Profile, weight, activity, favorites, personal plan state, sessions |

---

## 42. RLS Conceptual Matrix

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| profiles | own row | own row (via auth) | own row | own row |
| fitness_profiles | own row | own row | own row | own row |
| user_physical_restrictions | own rows | own rows | own rows | own rows |
| weight_entries | own rows | own rows (user_id = auth) | — | own rows (policy) |
| user_plans / user_plan_days | own rows | own rows | own rows | own rows |
| workout_sessions / workout_exercise_sessions | own rows | own rows (identity verified) | own rows | own rows |
| favorite_workouts | own rows | own rows | own rows | own rows |
| notification_preferences / push_subscriptions | own rows | own rows | own rows | own rows |
| exercises, workouts, base plan templates, taxonomy | public (authenticated or anon per policy) | admin/ingestion only | admin/ingestion only | admin/ingestion only |

Exact SQL policies: Phase 2.

---

## 43. Rate Limiting

Potentially abusive endpoints: signup, login, password reset, onboarding submission, plan generation, workout completion, notification registration, ingestion scripts. Member workout reads not unnecessarily throttled. ExerciseDB rate limits respected.

---

## 44. Trust Boundaries

| Boundary | Data crossing | Trusted? | Validation |
|----------|---------------|----------|------------|
| Browser | user input, session state | No (untrusted) | Zod; session-derived identity |
| Service Worker | static assets, media, cache | Partially | only caches approved content; never private API responses |
| IndexedDB | local workout state, outbox | No (client-controlled) | validated on sync by server |
| Next.js server | domain operations | Trusted | validates all inputs; server secrets |
| Supabase Auth | identity | Trusted | session verification |
| PostgreSQL | records | Trusted | RLS + constraints |
| Supabase Storage | media (future) | Trusted | access rules |
| ExerciseDB | content | External | schema-validated; normalized |

**Browser is untrusted. Client-generated workout/session state is untrusted until validated by server.**

---

## 45. Offline Trust Model

Local offline data = untrusted client state. On sync, server validates: authenticated user, workout validity, plan access, action uniqueness (client_action_id), timestamps, allowed transitions. Never trust locally stored duration/calories/user ID/completion state automatically.

---

## 46. Timezone Architecture

- Store absolute timestamps as UTC (`timestamptz`).
- Member timezone: browser-derived IANA timezone captured at first authenticated load and stored on profile.
- Day boundaries for streak, reports, daily goal, notifications, and plan activity dates computed in the member's timezone.
- Server aggregation that needs day boundaries receives the member timezone explicitly; never rely on server timezone.

---

## 47. Conflict Handling / Multi-Device

- V1 keeps rules simple and deterministic.
- Server is authoritative for: plan progression, long-term history, profile, weight history, favorites, account state.
- Local is temporary/optimistic: active workout, pending offline ops, timers.
- Conflicts resolved: plan-day completion is idempotent; profile last-write-wins (with validation); favorites idempotent toggle; offline session dedupe by client_action_id.
- A user's plan/history belong to the account, not the device. Offline local state is device-specific.

---

## 48. PWA Installation & Updates

- Web manifest: app name, icons (multiple sizes), theme color, standalone display, installability (service worker + HTTPS + manifest).
- Service worker lifecycle: Serwist; precache app shell/static; runtime cache for approved media.
- Update strategy: new version installs in background; activate on next load; **never purge active workout state or pending sync queue** on update.
- Do not destroy offline workout state when a new version becomes available.

---

## 49. Accessibility Architecture

- Navigation, workout controls, timers, buttons, forms, errors, modals, heart control, locked days, notifications, loading states.
- Timer not conveyed by color alone (time + auditory/aria).
- Heart has an accessible label ("Add to favorites"/"Remove from favorites").
- Locked days communicate why they are locked.
- Keyboard accessibility, screen-reader labels, contrast, focus states, reduced motion (NFR-ACC).

---

## 50. Observability Events

Domain event model defined in `events.md` (e.g., `onboarding_completed`, `plan_day_completed`, `workout_completed`, `offline_sync_failure`). Send to Sentry/analytics only where useful; never leak sensitive data.

---

## 51. Testing Architecture

- **Unit (Vitest):** domain logic — plan progression, restriction matching, calorie estimation, BMI, streak, daily goal, Discover replacement, replacement ranker, invariants.
- **Integration:** Supabase repositories, API handlers, server actions, sync engine (against local Supabase).
- **E2E (Playwright):** signup, verification, login, onboarding, plan, workout completion, resume, Discover, reports, weight update.
- **Offline:** offline workout, reconnect, synchronization, duplicate prevention (client_action_id).

---

## 52. Folder / Module Architecture

```
src/
  app/               # App Router routes
  components/        # shared UI
  features/          # auth, onboarding, dashboard, plan, workouts, discover, reports, profile, notifications
  domain/            # plans, workouts, exercises, progress, users, media, personalization
  application/       # use-cases/
  repositories/      # data access
  lib/               # supabase, exercisedb, notifications, pwa, sync, validation, logging, query-keys
  hooks/             # shared React hooks
  types/             # domain + shared types
  schemas/           # Zod schemas
```

Organized by domain where that improves maintainability; avoid architecture astronautics.

---

## 53. Domain Module Boundaries

Bounded domains: Auth, Member Profile, Onboarding, Exercise Library, Workout, Plan, Discover, Progress, Reports, Notifications, Offline/Sync.
Each defines responsibilities, inputs, outputs, dependencies, public interfaces, data ownership, client/server boundary. Detailed in `use-cases.md`.

---

## 54. External Dependencies

| Dependency | Purpose | Failure behavior | Replaceable | Cost |
|------------|---------|------------------|-------------|------|
| Supabase (Auth, Postgres, Storage) | auth, DB, media | app error states; auth required | Yes (storage/DB abstraction) | free tier → paid as needed |
| ExerciseDB | initial content source | ingestion isolated; app unaffected | Yes (ingestion layer) | free (V1 non-commercial) |
| Vercel | hosting Next.js | deployment infra | Yes | per plan |
| Google OAuth | login | fallback to email/password | Yes | free |
| PWA/browser APIs | offline, push | graceful degradation | n/a | free |
| Push infra (VAPID) | notifications | silent degradation | Yes | free/push provider |

No paid infrastructure introduced into V1 without explicit approval.

---

## 55. Cost Architecture

V1: no user payments; minimize recurring infra cost; no unnecessary paid APIs/SaaS/workers/media services; ExerciseDB free endpoint under its current terms; architecture allows replacing it before any monetization.

---

## 56. Deployment Architecture

- Source: GitHub → CI (typecheck, lint, unit tests, build) → Preview deploy → review → Production.
- Environments: development (local), preview/staging, production — each with isolated Supabase project/config and env vars.
- Migration strategy: Supabase CLI, versioned migrations, order + seed strategy (Phase 2).
- Rollback: redeploy previous version; schema changes forward-only (additive preferred).
- No merging of dev/prod credentials.

---

## 57. Migration & Seed Strategy

- Versioned migrations via Supabase CLI (`supabase/migrations/`).
- Rollback philosophy: forward migrations; destructive changes only via explicit reviewed migrations.
- Seed data: reference data (levels, focus areas, categories, equipment, restrictions) committed and versioned; curated product content (workouts, base plans) versioned as seed; ExerciseDB-imported data separated from curated product data (different tables/markers).
- Environment synchronization: `supabase db reset` for dev; CI applies migrations to preview; production via reviewed migration.

---

## 58. Testable Architectural Invariants

Complete list with rationale and enforcement location: see `invariants.md`. Examples: locked plan day cannot be completed; plan day cannot be skipped; duplicate completion cannot create duplicate sessions; offline sync cannot create duplicate sessions; BMI derived; weight history immutable; Discover does not advance plan daily goal.

---

## 59. Architecture Decision Records

See `adrs.md` (ADR-001 … ADR-016).

---

## 60. Phase 1 Decisions / Assumptions

See `decisions.md` — resolves Phase 0 open items owned by Phase 1 (streak, calorie formula, weight-day policy, onboarding draft, "No I'm fine" exclusivity, plan-day re-completion, enum values, validation ranges) and records new Phase 1 assumptions.

---

## 61. What Phase 1 Does NOT Deliver

- No production UI, no Stitch design.
- No final migrations/schema (Phase 2).
- No production APIs, workout engine, PWA implementation, notifications implementation.
- No full application.

Phase 1 validates capabilities and documents contracts only.
