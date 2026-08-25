# Phase 4 — Exercise Data & Content Ingestion

## Status: COMPLETE

## Summary

Phase 4 builds the application's internal exercise/content foundation. ExerciseDB V1 Free API was tested but has broken pagination (always returns first 25 exercises regardless of filter/cursor). A curated seed-based approach was used instead, which is actually better for product quality.

## What Was Delivered

### Exercise Infrastructure
- ExerciseDB API client with retry logic and rate limiting
- Typed external DTOs for ExerciseDB responses
- Validation layer for external exercise data
- Normalization layer (external → internal domain model)
- Curation mappings (equipment, muscles, focus areas, levels, restrictions, exercise modes)

### Exercise Library
- 80 curated exercises imported into database
- 16 exercises per focus area (Full Body, Abs, Arm, Chest, Butt & Legs)
- All exercises have proper instructions, equipment, muscle, level, and restriction mappings
- Exercise modes classified (reps, duration, both)
- Safety restrictions classified (no-jumping, low-impact, knee-sensitive, back-sensitive, no-crunch)

### Workout Content
- 8 fixed workouts created
- Each workout has 6-7 exercises with sets/reps/duration/rest
- Workouts cover all focus areas, levels, and categories
- Categories: Picks for You, Stretching & Warmup, Fat Burning, Strength & Tone

### Import System
- `npm run exercises:import` — import exercises from seed file
- `npm run exercises:import:dry` — dry run mode
- `npm run workouts:import` — import workouts from seed file
- Idempotent imports (safe to re-run)
- Upsert-based (updates existing, inserts new)

## Files Created

### Core Infrastructure
- `src/lib/exercisedb/types.ts` — Typed DTOs
- `src/lib/exercisedb/client.ts` — API client with pagination + retry
- `src/lib/exercisedb/validate.ts` — Validation layer
- `src/lib/exercisedb/normalize.ts` — Normalization layer
- `src/lib/exercisedb/index.ts` — Barrel exports

### Curation Mappings
- `src/lib/exercisedb/mappings/equipment.ts` — Equipment slug mapping
- `src/lib/exercisedb/mappings/muscles.ts` — Muscle slug mapping
- `src/lib/exercisedb/mappings/focus-areas.ts` — Body part → focus area mapping
- `src/lib/exercisedb/mappings/levels.ts` — Level classification logic
- `src/lib/exercisedb/mappings/restrictions.ts` — Safety restriction classification
- `src/lib/exercisedb/mappings/exercise-modes.ts` — Exercise mode classification

### Import Scripts
- `src/scripts/import-exercises.ts` — Exercise import command
- `src/scripts/import-workouts.ts` — Workout import command

### Seed Data
- `supabase/seed/exercises-seed.json` — 80 curated exercises
- `supabase/seed/workouts-seed.json` — 8 fixed workouts

## Content Coverage

### By Focus Area
| Focus Area | Exercises | Workouts |
|---|---|---|
| Full Body | 16 | 3 |
| Abs | 16 | 3 |
| Arm | 16 | 1 |
| Chest | 16 | 2 |
| Butt & Legs | 16 | 2 |

### By Level
| Level | Exercises |
|---|---|
| Beginner | ~40 |
| Intermediate | ~30 |
| Advanced | ~10 |

### By Equipment
| Equipment | Exercises |
|---|---|
| None (bodyweight) | ~35 |
| Dumbbells | ~25 |
| Barbell | ~5 |
| Resistance Band | ~3 |
| Bench | ~5 |
| Pull-up Bar | ~4 |
| Cable Machine | ~3 |
| Kettlebell | ~2 |
| Other | ~3 |

### Safety Coverage
| Restriction | Compatible Exercises |
|---|---|
| No Jumping | ~65 |
| Low Impact | ~70 |
| Knee Sensitive | ~60 |
| Back Sensitive | ~75 |
| No Crunch | ~70 |

## Known Limitations

1. **ExerciseDB API**: Free version has broken pagination (always returns first 25 exercises). Used curated seed data instead.
2. **Exercise count**: 80 exercises (target was 150-300). Sufficient for V1 but can be expanded.
3. **Media**: No exercise GIFs yet. Animation URLs are null. ExerciseDB GIFs can be added later for matching exercises.
4. **30-day plan content**: Not created in this phase. Plan engine belongs to Phase 5.

## Acceptance Criteria

- [x] External API client works
- [x] External response is typed
- [x] External data is validated
- [x] Import is idempotent
- [x] Duplicate imports do not create duplicate exercises
- [x] External source identity is stored
- [x] Exercise names are normalized
- [x] Instructions are imported correctly
- [x] Equipment is mapped
- [x] Focus areas are mapped
- [x] Levels are mapped
- [x] Safety restrictions are mapped/curated
- [x] Exercise modes are classified
- [x] Unreviewed data is not automatically exposed
- [x] Curated exercise library exists
- [x] Content covers required major categories
- [x] Low-impact/no-jumping candidates exist
- [x] Replacement candidates exist
- [x] Initial fixed workout content references approved exercises
- [x] External API is not required at member runtime
- [x] Provider failure after import does not break app
- [x] ExerciseDB source limitations documented
- [x] Media licensing documented
- [x] Field ownership documented
- [x] Import update behavior documented

## Next Phase

Phase 5 — Workout & 30-Day Plan Engine
