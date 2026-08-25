import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = (!dryRun && SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface WorkoutExercise {
  exercise_name: string;
  order_index: number;
  sets: number;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number;
}

interface SeedWorkout {
  name: string;
  description: string;
  duration_minutes: number;
  estimated_calories: number;
  category_slugs: string[];
  focus_area_slugs: string[];
  level_slugs: string[];
  exercises: WorkoutExercise[];
}

interface ImportStats {
  total: number;
  inserted: number;
  updated: number;
  errors: string[];
}

async function importWorkouts(): Promise<void> {
  const stats: ImportStats = { total: 0, inserted: 0, updated: 0, errors: [] };

  console.log("=== Workout Seed Import ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  const seedPath = path.resolve(process.cwd(), "supabase/seed/workouts-seed.json");
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found: ${seedPath}`);
    process.exit(1);
  }

  const workouts: SeedWorkout[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  stats.total = workouts.length;
  console.log(`Loaded ${workouts.length} workouts from seed file`);

  if (dryRun) {
    for (const w of workouts) {
      console.log(`  - ${w.name} (${w.duration_minutes}min, ${w.exercises.length} exercises)`);
    }
    printSummary(stats);
    return;
  }

  console.log("\nImporting workouts...");

  for (let i = 0; i < workouts.length; i++) {
    const w = workouts[i];
    const progress = `[${i + 1}/${workouts.length}]`;
    const slug = toSlug(w.name);

    try {
      const { data: existing } = await supabase!
        .from("workouts")
        .select("id")
        .eq("slug", slug)
        .single();

      let workoutId: string;

      if (existing) {
        workoutId = existing.id;
        const { error } = await supabase!
          .from("workouts")
          .update({
            name: w.name,
            description: w.description,
            duration_seconds: w.duration_minutes * 60,
            estimated_calories: w.estimated_calories,
            updated_at: new Date().toISOString(),
          })
          .eq("id", workoutId);

        if (error) {
          stats.errors.push(`${progress} Update failed for ${w.name}: ${error.message}`);
          continue;
        }
        stats.updated++;
        console.log(`${progress} Updated: ${w.name}`);
      } else {
        const { data: inserted, error: insertError } = await supabase!
          .from("workouts")
          .insert({
            name: w.name,
            slug,
            description: w.description,
            duration_seconds: w.duration_minutes * 60,
            estimated_calories: w.estimated_calories,
            is_active: true,
          })
          .select("id")
          .single();

        if (insertError) {
          stats.errors.push(`${progress} Insert failed for ${w.name}: ${insertError.message}`);
          continue;
        }
        workoutId = inserted.id;
        stats.inserted++;
        console.log(`${progress} Inserted: ${w.name}`);
      }

      await importWorkoutRelationships(workoutId, w, stats);
    } catch (err) {
      stats.errors.push(`${progress} Error: ${w.name}: ${err}`);
    }
  }

  printSummary(stats);
}

async function importWorkoutRelationships(
  workoutId: string,
  w: SeedWorkout,
  stats: ImportStats
): Promise<void> {
  for (const catSlug of w.category_slugs) {
    const { data } = await supabase!.from("workout_categories").select("id").eq("slug", catSlug).single();
    if (data) {
      await supabase!.from("workout_category_map").upsert(
        { workout_id: workoutId, category_id: data.id },
        { onConflict: "workout_id,category_id" }
      );
    } else {
      console.warn(`  ! Unknown category slug "${catSlug}" on ${w.name}`);
    }
  }

  for (const focusSlug of w.focus_area_slugs) {
    const { data } = await supabase!.from("focus_areas").select("id").eq("slug", focusSlug).single();
    if (data) {
      await supabase!.from("workout_focus_areas").upsert(
        { workout_id: workoutId, focus_area_id: data.id },
        { onConflict: "workout_id,focus_area_id" }
      );
    } else {
      console.warn(`  ! Unknown focus area slug "${focusSlug}" on ${w.name}`);
    }
  }

  for (const levelSlug of w.level_slugs) {
    const { data } = await supabase!.from("levels").select("id").eq("slug", levelSlug).single();
    if (data) {
      await supabase!.from("workout_levels").upsert(
        { workout_id: workoutId, level_id: data.id },
        { onConflict: "workout_id,level_id" }
      );
    } else {
      console.warn(`  ! Unknown level slug "${levelSlug}" on ${w.name}`);
    }
  }

  for (const ex of w.exercises) {
    const { data: exercise } = await supabase!
      .from("exercises")
      .select("id")
      .eq("name", ex.exercise_name)
      .single();

    if (exercise) {
      await supabase!.from("workout_exercises").upsert(
        {
          workout_id: workoutId,
          exercise_id: exercise.id,
          exercise_order: ex.order_index,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds,
          rest_seconds: ex.rest_seconds,
        },
        { onConflict: "workout_id,exercise_order" }
      );
    } else {
      stats.errors.push(
        `Exercise not found in DB: "${ex.exercise_name}" (workout ${w.name})`
      );
    }
  }
}

function printSummary(stats: ImportStats): void {
  console.log("\n=== Import Summary ===");
  console.log(`Total:     ${stats.total}`);
  console.log(`Inserted:  ${stats.inserted}`);
  console.log(`Updated:   ${stats.updated}`);
  console.log(`Errors:    ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }
}

importWorkouts().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
