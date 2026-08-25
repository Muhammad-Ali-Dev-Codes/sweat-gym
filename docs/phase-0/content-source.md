# Content & Exercise Source Requirements — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

This document covers the exercise data source, media, taxonomy, licensing constraints, and the required abstraction so content remains replaceable.

---

## 1. Initial Source: ExerciseDB V1 Free API

| Property | Value |
|----------|-------|
| Base URL | `https://oss.exercisedb.dev/api/v1` |
| Data | ~1,500 structured exercises |
| Media | GIF-based exercise demonstrations |
| Endpoints | GET /exercises, /exercises/search, /exercises/bodyparts, /exercises/muscles, /exercises/equipments, /exercises/{exerciseId}, /bodyparts, /muscles, /equipments |

### Validated (2026-08-19)
- ✅ `/exercises` returns paginated list (`success`, `meta.total=1500`, `nextCursor`, `data[]`).
- ✅ Exercise fields observed: `exerciseId`, `name`, `gifUrl`, `bodyParts[]`, `equipments[]`, `targetMuscles[]`, `secondaryMuscles[]`, `instructions[]`.
- ✅ `/bodyparts` returns 10 items (neck, lower arms, shoulders, cardio, upper arms, chest, lower legs, back, upper legs, waist).
- ✅ `/equipments` returns 27 items (body weight, dumbbell, barbell, band, resistance band, cable, kett lebell, bench-adjacent machines, etc.).
- ✅ `/muscles` returns ~50 items (abs, glutes, pectorals, quadriceps, hamstrings, lats, etc.).

### Licensing constraint (important)
- The ExerciseDB free API is intended for personal/prototype/educational/non-commercial use per displayed provider terms.
- V1 is free and non-commercial, which is consistent.
- **Do not** design the application as permanently dependent on paid or commercially restricted ExerciseDB media.
- **Do not** assume the GIFs are commercially redistributable long-term.

---

## 2. Source → Domain Mapping (Normalization Required)

ExerciseDB taxonomy is NOT identical to our product taxonomy. It must be mapped/normalized into our own domain model.

| ExerciseDB (external) | Our domain |
|------------------------|------------|
| `exerciseId` | stored as `external_exercise_id` |
| (source) | stored as `external_source` = `exercisedb` |
| `gifUrl` | `animation_url` (via media abstraction) |
| `name` | `name` |
| `bodyParts[]` | body-part metadata → mapped to our focus areas where applicable |
| `targetMuscles[]` | target muscle metadata |
| `secondaryMuscles[]` | secondary muscle metadata |
| `equipments[]` | mapped to our equipment entities |
| `instructions[]` | `instructions` (steps) |
| — (not provided) | our own focus areas, levels, restrictions, categories, difficulty, timing mode (added by us) |

> The mapping is performed during ingestion (Phase 4) into our own database. The UI must read from our database, never directly from ExerciseDB.

---

## 3. Media Abstraction (Replaceable Source)

Architectural requirement — the exercise/media source must be replaceable.

Exercise record must support:

```
animation_url
thumbnail_url
video_url
media_source
external_media_id (if applicable)
```

Additionally:

```
external_source      -- e.g., 'exercisedb'
external_exercise_id -- the ExerciseDB id
```

Rules:
- Never hardcode ExerciseDB URLs in the UI.
- The UI requests media from our database/service.
- Media can later be swapped for: licensed media, self-created media, commercially permitted media, or another provider — without changing the domain model.

---

## 4. Content Rules

- V1 media: GIF/animation is the primary demonstration format. Video optional (where legally permitted).
- Do not scrape YouTube, random fitness sites, or copy copyrighted videos/images without permission.
- Do not assume GitHub availability means unrestricted media rights.
- V1 plans and Discover workouts are built from our controlled exercise library (after ingestion + our own taxonomy + safety metadata).

---

## 5. Our Taxonomy (Added by Us, Not from ExerciseDB)

### Focus areas
Full Body, Abs, Arm, Chest, Butt & Legs.

### Levels
Beginner, Intermediate, Advanced.

### Discover categories
Picks for You, Stretching & Warmup, Fat Burning, Strength & Tone.

### Duration filters
<10 min, 10–15 min, 16–35 min (operate from real duration values where possible).

### Safety restrictions (structured metadata)
e.g., `no_jumping`, `low_impact`, `knee_sensitive`, `back_sensitive`, `no_crunch`. An exercise may have multiple. Matching with user concerns is deterministic (never AI).

---

## 6. Ingestion Pipeline (Conceptual, Phase 4)

```
ExerciseDB API → Fetch → Validate → Normalize → Store in our DB
  → Add our own taxonomy → Add safety metadata → Add equipment relationships
  → Build fixed workouts → Build 30-day plans
```

---

## 7. Content Risks

| Risk | Mitigation |
|------|------------|
| ExerciseDB media not commercially redistributable long-term | Media abstraction; store external ids; replaceable media fields; V1 non-commercial |
| ExerciseDB taxonomy ≠ our taxonomy | Explicit mapping/normalization at ingestion |
| License/terms change | Do not hardcode URLs; keep source layer replaceable |
| Missing/incomplete exercises for our plans/workouts | Controlled library curation in Phase 4/5; deterministic replacements |
| ExerciseDB availability (rate limits, downtime) | Our DB is the source of truth after ingestion; app never depends on live ExerciseDB |
