# Session & Activity Model

> How workout executions are recorded, from session creation through per-exercise tracking.

---

## Workout Sessions

Every time a user performs a workout, one row is created in `workout_sessions`. This is the primary activity record — reports, streaks, and the activity tracker all derive from it.

| Field | Purpose |
|-------|---------|
| `user_id` | The member who performed the workout |
| `workout_id` | FK to the workout definition |
| `source` | `'plan'` or `'discover'` |
| `user_plan_day_id` | FK to the plan day being fulfilled (nullable) |
| `started_at` | When the user began the session |
| `completed_at` | When the session reached a terminal state |
| `duration_seconds` | Actual duration (populated on completion) |
| `estimated_calories` | Calories at session completion |
| `status` | Current session state |
| `client_operation_id` | Client-generated UUID for idempotency |

### Source

| Value | Meaning |
|-------|---------|
| `'plan'` | Session was started from an available plan day |
| `'discover'` | Session was started independently from the Discover tab |

**Rule:** Discover sessions must never contribute toward plan daily goals. Queries that calculate daily progress must filter on `source = 'plan'`.

### User Plan Day Link

`user_plan_day_id` is nullable:

- **Plan sessions:** `user_plan_day_id` points to the specific `user_plan_days` row being fulfilled.
- **Discover sessions:** `user_plan_day_id` is `null` — no plan day is involved.

**ON DELETE SET NULL:** If a plan day is deleted, the session record survives but loses its plan link. This preserves activity history during plan cleanup.

---

## Idempotency

The PWA can create sessions offline and sync later. Retries, double-taps, browser refreshes, and reconnection replays must not produce duplicate session records.

### Client Operation ID

The client generates a UUID (`client_operation_id`) before initiating any write. This value is:

1. Generated client-side (never from the server)
2. Stored locally before the network request
3. Sent with the server write
4. Enforced with a `UNIQUE` constraint on `workout_sessions.client_operation_id`

If two writes arrive with the same `client_operation_id`, the second is rejected at the database level — no duplicate session is created.

---

## Session States

```
in_progress → completed | abandoned | interrupted
```

| Status | Meaning |
|--------|---------|
| `in_progress` | Session created, workout not yet finished |
| `completed` | User finished the workout (triggers plan day completion if source=plan) |
| `abandoned` | User explicitly quit the workout |
| `interrupted` | Session lost connection or crashed before completion |

**State machine rules:**

- A session starts as `in_progress` on creation.
- Transition to `completed`, `abandoned`, or `interrupted` is final — no backward transitions.
- Only `completed` status triggers plan day progression.
- `interrupted` sessions can be resumed client-side if the `workout_exercise_sessions` rows show unfinished exercises.

---

## User Plan Day Link (Detailed)

When a plan session completes, a server-side transaction atomically:

1. Sets `workout_sessions.status` to `completed`
2. Sets `user_plan_days.status` to `completed`
3. Sets `user_plan_days.completed_at` and `actual_activity_date`
4. Sets `user_plan_days.status` for day N+1 from `locked` to `available`
5. Sets `user_plan_days.unlocked_at` for day N+1

This transaction must be idempotent — a duplicate completion attempt must not unlock day N+2.

---

## Exercise Sessions

Each exercise within a workout session is tracked individually in `workout_exercise_sessions`. One row per `workout_exercise` per session.

| Field | Purpose |
|-------|---------|
| `workout_session_id` | FK to the parent session |
| `workout_exercise_id` | FK to the specific exercise prescription |
| `status` | Current state of this exercise in this session |
| `completed_sets` | Number of sets actually performed |
| `actual_reps` | Reps performed (nullable, for reps-mode exercises) |
| `actual_duration_seconds` | Actual time held/performed (nullable, for duration-mode) |
| `started_at` | When the user started this exercise |
| `completed_at` | When the exercise was finished |
| `skipped_at` | When the exercise was skipped |

### Exercise Status

| Status | Meaning |
|--------|---------|
| `pending` | Not yet started (initial state) |
| `in_progress` | Currently being performed |
| `completed` | Finished with all or some sets |
| `skipped` | User skipped this exercise |

### Exercise Skip

When a user skips an exercise:

- `status` is set to `'skipped'`
- `skipped_at` is populated with the skip timestamp
- `completed_sets` may be non-zero if the user partially completed the exercise before skipping
- The overall workout session continues — skipping does not invalidate the session

### Workout Resume

Exercise sessions track per-exercise progress, enabling the client to resume an interrupted session:

1. Client reads all `workout_exercise_sessions` for the session
2. Filters for rows where `status` is `'pending'` or `'in_progress'`
3. Resumes from the first incomplete exercise
4. The `completed_sets` value tells the client which set to start from

**Important:** The database stores durable checkpoint state. Real-time timer positions and animation frames remain client-side. Only meaningful state changes (exercise start, set completion, skip) are persisted.

---

## Actual Performance

The session model captures what the user actually did, separate from what the workout prescribed:

| Prescribed (workout_exercises) | Actual (workout_exercise_sessions) |
|-------------------------------|-------------------------------------|
| `sets` | `completed_sets` |
| `reps` | `actual_reps` |
| `duration_seconds` | `actual_duration_seconds` |

This separation enables:

- Comparing target vs actual in reports
- Streak and progress calculations based on real activity
- Future personalization based on performance history

### Calories

`workout_sessions.estimated_calories` stores the calorie estimate at session completion. This is a plan-level estimate, not a precise physiological measurement.

---

## Activity Tracker

The activity tracker reads directly from `workout_sessions` — no separate activity table is needed.

A single day's activity might include:

| Session | Source | Duration |
|---------|--------|----------|
| Plan Day 4 | plan | 8 min |
| Stretching | discover | 5 min |
| Fat Burn | discover | 12 min |

All three sessions are visible in the tracker. Only the plan session contributes to the daily goal.

---

## Related Documents

- `workout-plan-model.md` — How sessions connect to plan templates and user plans
- `offline-idempotency.md` — How `client_operation_id` survives offline sync
- `schema.md` — Full table definitions for `workout_sessions` and `workout_exercise_sessions`
- `relationships.md` — Foreign key behavior and cascade rules
