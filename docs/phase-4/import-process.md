# Phase 4 — Import Process

## Exercise Import

### Command
```bash
npm run exercises:import
```

### Dry Run
```bash
npm run exercises:import:dry
```

### What It Does
1. Reads `supabase/seed/exercises-seed.json`
2. For each exercise:
   - Checks if exercise exists (by name)
   - Updates existing or inserts new
   - Creates relationships (muscles, equipment, focus areas, levels, restrictions)
3. Upsert-based (safe to re-run)

### Seed File Format
```json
{
  "name": "Push-Up",
  "description": null,
  "instructions": ["Step 1: ..."],
  "animation_url": null,
  "exercise_mode": "reps",
  "is_low_impact": true,
  "requires_jumping": false,
  "equipment_slugs": ["none"],
  "target_muscle_slugs": ["pectorals"],
  "secondary_muscle_slugs": ["triceps", "deltoids"],
  "focus_area_slugs": ["chest"],
  "level_slugs": ["beginner"],
  "restriction_slugs": []
}
```

## Workout Import

### Command
```bash
npx tsx src/scripts/import-workouts.ts
```

### Dry Run
```bash
npx tsx src/scripts/import-workouts.ts --dry-run
```

### What It Does
1. Reads `supabase/seed/workouts-seed.json`
2. For each workout:
   - Checks if workout exists (by slug)
   - Updates existing or inserts new
   - Creates relationships (categories, focus areas, levels, exercises)
3. Resolves exercise names to IDs

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Idempotency

Both import scripts are idempotent:
- Re-running will update existing records
- No duplicate records created
- Relationships are upserted

## Field Ownership

### ExerciseDB-Owned (updated on re-import)
- external_source
- external_exercise_id
- name
- animation_url
- instructions

### Product-Owned (preserved on re-import)
- focus_area_slugs
- level_slugs
- restriction_slugs
- is_active
