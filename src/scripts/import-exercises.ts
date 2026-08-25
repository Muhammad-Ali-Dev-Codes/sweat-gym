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
  console.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local for live imports.");
  process.exit(1);
}

const supabase = (!dryRun && SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

interface SeedExercise {
  name: string;
  description: string | null;
  instructions: string[];
  animation_url: string | null;
  exercise_mode: "reps" | "duration" | "both";
  is_low_impact: boolean;
  requires_jumping: boolean;
  equipment_slugs: string[];
  target_muscle_slugs: string[];
  secondary_muscle_slugs: string[];
  focus_area_slugs: string[];
  level_slugs: string[];
  restriction_slugs: string[];
}

interface ImportStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

async function importFromSeed(): Promise<void> {
  const stats: ImportStats = { total: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  console.log("=== Exercise Seed Import ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  const seedPath = path.resolve(process.cwd(), "supabase/seed/exercises-seed.json");
  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found: ${seedPath}`);
    process.exit(1);
  }

  const exercises: SeedExercise[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  stats.total = exercises.length;
  console.log(`Loaded ${exercises.length} exercises from seed file`);

  if (dryRun) {
    printSummary(stats);
    return;
  }

  console.log("\nImporting exercises...");

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const progress = `[${i + 1}/${exercises.length}]`;

    try {
      const { data: existing } = await supabase!
        .from("exercises")
        .select("id")
        .eq("name", ex.name)
        .single();

      if (existing) {
        const { error } = await supabase!
          .from("exercises")
          .update({
            description: ex.description,
            instructions: ex.instructions,
            animation_url: ex.animation_url,
            exercise_mode: ex.exercise_mode,
            is_low_impact: ex.is_low_impact,
            requires_jumping: ex.requires_jumping,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) {
          stats.errors.push(`${progress} Update failed for ${ex.name}: ${error.message}`);
        } else {
          stats.updated++;
          console.log(`${progress} Updated: ${ex.name}`);
        }
      } else {
        const { data: inserted, error: insertError } = await supabase!
          .from("exercises")
          .insert({
            external_source: "seed",
            external_exercise_id: null,
            name: ex.name,
            description: ex.description,
            instructions: ex.instructions,
            animation_url: ex.animation_url,
            thumbnail_url: null,
            video_url: null,
            media_source: "seed",
            exercise_mode: ex.exercise_mode,
            is_low_impact: ex.is_low_impact,
            requires_jumping: ex.requires_jumping,
            is_active: true,
          })
          .select("id")
          .single();

        if (insertError) {
          stats.errors.push(`${progress} Insert failed for ${ex.name}: ${insertError.message}`);
        } else if (inserted) {
          stats.inserted++;
          await importRelationships(inserted.id, ex);
          console.log(`${progress} Inserted: ${ex.name}`);
        }
      }
    } catch (err) {
      stats.errors.push(`${progress} Error: ${ex.name}: ${err}`);
    }
  }

  printSummary(stats);
}

async function importRelationships(exerciseId: string, ex: SeedExercise): Promise<void> {
  for (const slug of ex.target_muscle_slugs) {
    const { data } = await supabase!.from("muscles").select("id").eq("slug", slug).single();
    if (data) {
      await supabase!.from("exercise_muscles").upsert(
        { exercise_id: exerciseId, muscle_id: data.id, is_primary: true },
        { onConflict: "exercise_id,muscle_id" }
      );
    }
  }

  for (const slug of ex.secondary_muscle_slugs) {
    const { data } = await supabase!.from("muscles").select("id").eq("slug", slug).single();
    if (data) {
      await supabase!.from("exercise_muscles").upsert(
        { exercise_id: exerciseId, muscle_id: data.id, is_primary: false },
        { onConflict: "exercise_id,muscle_id" }
      );
    }
  }

  for (const slug of ex.equipment_slugs) {
    const { data } = await supabase!.from("equipment").select("id").eq("slug", slug).single();
    if (data) {
      await supabase!.from("exercise_equipment").upsert(
        { exercise_id: exerciseId, equipment_id: data.id },
        { onConflict: "exercise_id,equipment_id" }
      );
    }
  }

  for (const slug of ex.focus_area_slugs) {
    const { data } = await supabase!.from("focus_areas").select("id").eq("slug", slug).single();
    if (data) {
      await supabase!.from("exercise_focus_areas").upsert(
        { exercise_id: exerciseId, focus_area_id: data.id },
        { onConflict: "exercise_id,focus_area_id" }
      );
    }
  }

  for (const slug of ex.level_slugs) {
    const { data } = await supabase!.from("levels").select("id").eq("slug", slug).single();
    if (data) {
      await supabase!.from("exercise_levels").upsert(
        { exercise_id: exerciseId, level_id: data.id },
        { onConflict: "exercise_id,level_id" }
      );
    }
  }

  for (const slug of ex.restriction_slugs) {
    const { data } = await supabase!.from("exercise_restrictions").select("id").eq("slug", slug).single();
    if (data) {
      await supabase!.from("exercise_restriction_map").upsert(
        { exercise_id: exerciseId, restriction_id: data.id },
        { onConflict: "exercise_id,restriction_id" }
      );
    }
  }
}

function printSummary(stats: ImportStats): void {
  console.log("\n=== Import Summary ===");
  console.log(`Total:     ${stats.total}`);
  console.log(`Inserted:  ${stats.inserted}`);
  console.log(`Updated:   ${stats.updated}`);
  console.log(`Skipped:   ${stats.skipped}`);
  console.log(`Errors:    ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }
}

importFromSeed().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
