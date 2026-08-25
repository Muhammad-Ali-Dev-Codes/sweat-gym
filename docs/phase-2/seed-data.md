# Seed Data Strategy

## Idempotency

All seed operations are idempotent and safe to run multiple times:

- SQL seeds use `INSERT ... ON CONFLICT DO NOTHING` or anonymous `DO $$` blocks with existence checks before inserting
- No manual cleanup or truncation is required
- Running seeds on an already-seeded database has no effect

## Reference Data (Migration 0012)

Reference data is defined directly in migration 0012 and inserted with conflict-safe statements:

| Table                  | Rows | Description                                    |
| ---------------------- | ---- | ---------------------------------------------- |
| `levels`               | 3    | Beginner, Intermediate, Advanced                |
| `focus_areas`          | 5    | Muscle groups and training focuses               |
| `workout_categories`   | 4    | Strength, Cardio, Flexibility, Custom            |
| `equipment`            | 5    | Common gym equipment options                     |
| `physical_restrictions`| 2    | Common physical limitations                      |
| `exercise_restrictions`| 5    | Specific exercise restrictions                   |
| `muscles`              | 16   | Full muscle catalog for exercise targeting        |

Reference data is authoritative in migration 0012 and is mirrored by the seed script for convenience.

## Seed Script (`supabase/seed/seed.sql`)

The seed script extends reference data with sample content for local development:

- **Reference data** — mirrors all rows from migration 0012 so `supabase db seed` produces a complete working database
- **5 test exercises** — sample exercises with muscle and equipment mappings
- **2 test workouts** — pre-built workouts using the test exercises
- **3 plan templates** — each with 30 days of scheduled workouts

The seed script is the single entry point for bootstrapping a local development database.

## When to Use Each Approach

| Scenario                          | Approach                                    |
| --------------------------------- | ------------------------------------------- |
| Local development setup           | `supabase db seed`                          |
| CI/CD test environments           | `supabase db seed`                          |
| Staging database population       | `supabase db seed`                          |
| Production exercise catalog       | ExerciseDB import script                     |
| Production plan templates         | Manual insert or migration                   |

## Environment Separation

Development and production use different content strategies:

- **Development** — `supabase/seed/seed.sql` provides a small, deterministic dataset for fast iteration and testing
- **Production** — ExerciseDB import populates the full exercise catalog with real movement data, muscle mappings, and animation URLs

The two approaches share the same schema and idempotency guarantees. Seed data is a subset; ExerciseDB is the superset.
