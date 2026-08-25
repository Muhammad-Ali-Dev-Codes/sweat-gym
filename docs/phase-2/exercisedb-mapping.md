# ExerciseDB Mapping

## Source

ExerciseDB: https://github.com/yuhonas/exercise-db

## exercises Table

Each ExerciseDB entry maps to a single row in `exercises` with these fields:

| ExerciseDB Field | exercises Column          | Notes                                                      |
| ---------------- | ------------------------- | ---------------------------------------------------------- |
| `id`             | `external_exercise_id`    | Stored as text                                              |
| (constant)       | `external_source`         | Set to `'exercisedb'`                                       |
| `name`           | `name`                    | Exercise name                                               |
| `description`    | `description`             | Text description of the movement                            |
| `instructions`   | `instructions`            | String array of step-by-step instructions                   |
| `gifUrl`         | `animation_url`           | Animated GIF URL of the exercise                            |
| `bodyPart`       | —                         | Stored but not directly mapped to our categories; use `focus_areas` for curated groupings |
| `equipment`      | `exercise_equipment`      | Mapped via join table                                       |
| `target`         | `exercise_muscles`        | Mapped as primary muscle (`is_primary = true`)               |
| `secondaryMuscles`| `exercise_muscles`       | Mapped as secondary muscles (`is_primary = false`)           |

## muscle Target Mapping

```
ExerciseDB target (string)
  → muscles.id (lookup by name)
    → exercise_muscles (is_primary = true)

ExerciseDB secondaryMuscles (array)
  → muscles.id (lookup by name for each)
    → exercise_muscles (is_primary = false)
```

## Equipment Mapping

```
ExerciseDB equipment (string)
  → equipment.id (lookup by name)
    → exercise_equipment (join table)
```

## Media Abstraction

The exercises table supports multiple media fields for forward compatibility:

| Column          | Purpose                              |
| --------------- | ------------------------------------ |
| `animation_url` | Primary animated visual (GIF/WebM)   |
| `thumbnail_url` | Static preview image                 |
| `video_url`     | Full video demonstration             |
| `media_source`  | Tracks origin of current media assets |

ExerciseDB provides `gifUrl` which maps to `animation_url`. The other media fields are left null and can be populated later from alternative sources. `media_source` records where the current assets came from so they can be replaced without losing provenance.

## Import Strategy

ExerciseDB data is imported through one of:

- **Supabase Edge Functions** — serverless import using the service_role key, suitable for one-shot imports or scheduled refreshes
- **Node.js script** — local or CI-based import using the `@supabase/supabase-js` client with service_role key

Both approaches follow the same mapping logic and idempotency guarantees.

## Idempotency

The `exercises` table has a unique constraint on `(external_source, external_exercise_id)`.

- Duplicate ExerciseDB entries are rejected by the database
- Import scripts can safely re-run against an already-populated table
- `INSERT ... ON CONFLICT DO NOTHING` or `ON CONFLICT UPDATE` can be used depending on whether stale data should be refreshed
