# Workout & Plan Model

> How workouts are defined, composed, and scheduled across 30-day plans.

---

## Workout

A workout is a fixed, reusable collection of exercises with per-exercise prescriptions. Workouts are global content — not user-specific — and live in the `workouts` table.

Each workout carries:

| Field | Purpose |
|-------|---------|
| `name` | Human-readable display name |
| `slug` | Stable URL/lookup identifier |
| `duration_seconds` | Total expected duration as an integer |
| `estimated_calories` | Target calorie burn estimate |
| `is_active` | Soft-visibility toggle |

### Workout Exercises

The ordered exercise list inside a workout lives in `workout_exercises`. Each row is a **prescription** — it tells the workout player what to do, not how the user actually performed.

| Field | Purpose |
|-------|---------|
| `exercise_id` | FK to the reusable exercise library |
| `exercise_order` | Sequence position (1-indexed, unique per workout) |
| `sets` | Prescribed set count |
| `reps` | Prescribed rep count (nullable — null when exercise is duration-only) |
| `duration_seconds` | Prescribed hold/time (nullable — null when exercise is reps-only) |
| `rest_seconds` | Rest period after this exercise (0 or more) |

**Key invariant:** Different workouts can prescribe the same exercise with different parameters. The exercise definition stays in `exercises`; the prescription lives in `workout_exercises`.

---

## Workout Taxonomy

Workouts are tagged via junction tables for filtering and Discover browsing.

### Categories (`workout_category_map`)

Categories group workouts for the Discover tab. Initial values:

- `picks_for_you`
- `stretching_and_warmup`
- `fat_burning`
- `strength_and_tone`

A workout may appear in multiple categories. Categories are Discover-only — they do not affect plan assignment.

### Focus Areas (`workout_focus_areas`)

Links workouts to body-region focus. Values shared with the exercise taxonomy: Full Body, Abs, Arm, Chest, Butt & Legs. A workout may target multiple areas.

### Levels (`workout_levels`)

Links workouts to fitness levels: beginner, intermediate, advanced. A Discover workout may support multiple levels.

---

## Plan Templates

Plan templates are the three controlled 30-day programs stored in `plan_templates`.

| Field | Purpose |
|-------|---------|
| `name` | e.g. "Beginner 30-Day Plan" |
| `fitness_level_id` | FK to `levels` — one template per fitness level |
| `duration_days` | Always 30 (CHECK constraint) |
| `is_active` | Visibility toggle |

**One template per fitness level.** At seed time there are exactly three rows.

### Plan Template Days

Each template has exactly 30 rows in `plan_template_days`, one per `day_number` (1–30).

| Field | Purpose |
|-------|---------|
| `day_number` | Sequential position within the template (1–30) |
| `workout_id` | FK to the workout assigned to this day |
| `target_duration_seconds` | Expected duration target |
| `target_calories` | Expected calorie target |

**Unique constraint:** `(plan_template_id, day_number)` — no duplicate days within a template.

Template days define the **target** — what the plan promises. They are never mutated by user activity.

---

## User Plans

When a user starts a plan, a row is created in `user_plans` as a fork of the selected template.

| Field | Purpose |
|-------|---------|
| `user_id` | The member who owns this plan |
| `plan_template_id` | FK to the source template |
| `started_at` | When the plan was activated |
| `status` | `active`, `completed`, or `archived` |

**Forking strategy:** At plan creation time, the 30 `plan_template_days` are copied into `user_plan_days` for the user. This decouples historical user state from future template edits. If the admin later modifies the beginner template, existing users keep their original assignment.

### User Plan Days

Each user plan generates exactly 30 rows in `user_plan_days`.

| Field | Purpose |
|-------|---------|
| `day_number` | Sequential position (1–30), copied from template |
| `workout_id` | FK to the assigned workout, copied from template |
| `target_duration_seconds` | Copied from template |
| `target_calories` | Copied from template |
| `status` | Current state of this day |
| `unlocked_at` | Timestamp when day transitioned to `available` |
| `completed_at` | Timestamp when day transitioned to `completed` |
| `actual_activity_date` | The real calendar date the user performed the workout |

**Unique constraint:** `(user_plan_id, day_number)`

### Status Progression

```
locked → available → in_progress → completed
```

| Status | Meaning |
|--------|---------|
| `locked` | Not yet reachable; future day |
| `available` | Unlocked and ready to start |
| `in_progress` | Workout session has been created for this day |
| `completed` | Linked workout session reached `completed` |

**Unlock rule:** Day N+1 becomes `available` only after Day N reaches `completed`. Server-side logic enforces this transition atomically within a transaction that also marks the session complete.

### Plan Day ≠ Calendar Day

`day_number` is the sequential position in the plan (1–30). `actual_activity_date` is the real calendar date the workout was performed.

| day_number | actual_activity_date | Meaning |
|------------|----------------------|---------|
| 1 | 2026-08-20 | User started on Aug 20 |
| 5 | 2026-08-24 | Day 5 done on Aug 24 |
| 6 | 2026-08-27 | Rest days between 5 and 6 |

This separation is critical: the plan tracks progress by sequence, reports track activity by calendar date.

---

## Target vs Actual

The design enforces a strict separation between planned targets and actual performance:

| Layer | Tables | Role |
|-------|--------|------|
| **Target** | `plan_template_days` | Defines what the plan promises per day |
| **Target (user)** | `user_plan_days` | Copied targets for a specific user's plan |
| **Actual** | `workout_sessions` | Recorded performance when a workout is executed |
| **Actual (detail)** | `workout_exercise_sessions` | Per-exercise actual sets, reps, duration |

Plan template days are never modified by user activity. User plan days track status and timing only. All performance data flows into session tables.

---

## Related Documents

- `schema.md` — Full table definitions and constraints
- `relationships.md` — Foreign key behavior and cardinality
- `session-model.md` — How workout sessions link to plan days
- `offline-idempotency.md` — How session writes survive offline sync
