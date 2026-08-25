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
const API_BASE = "https://oss.exercisedb.dev/api/v1";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = (!dryRun && SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

interface SeedExercise {
  name: string;
}

interface ExerciseDBResult {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

let requestCount = 0;
let rateLimitHit = false;

async function searchExercise(name: string): Promise<ExerciseDBResult | null> {
  if (rateLimitHit) return null;

  try {
    requestCount++;
    const url = `${API_BASE}/exercises?name=${encodeURIComponent(name)}&limit=5`;
    const response = await fetch(url);

    if (response.status === 429) {
      console.log(`  Rate limit hit at request #${requestCount}. Waiting 60s...`);
      rateLimitHit = true;
      await new Promise(r => setTimeout(r, 60000));
      rateLimitHit = false;
      requestCount = 0;
      return searchExercise(name);
    }

    if (!response.ok) return null;

    const data = await response.json();
    const exercises: ExerciseDBResult[] = data.data || data;

    if (!Array.isArray(exercises) || exercises.length === 0) return null;

    const normalizedName = name.toLowerCase().trim();
    const match = exercises.find(
      (e) => e.name.toLowerCase().trim() === normalizedName
    );

    return match || exercises[0];
  } catch (err) {
    console.log(`  Error searching "${name}": ${err}`);
    return null;
  }
}

async function fetchAnimations(): Promise<void> {
  console.log("=== Exercise Animation Fetcher ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  const seedPath = path.resolve(process.cwd(), "supabase/seed/exercises-seed.json");
  const seedExercises: SeedExercise[] = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  console.log(`Loaded ${seedExercises.length} exercises from seed file`);

  let foundCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const results: Array<{ name: string; gifUrl: string; exerciseId: string }> = [];

  for (let i = 0; i < seedExercises.length; i++) {
    const exercise = seedExercises[i];
    const progress = `[${i + 1}/${seedExercises.length}]`;

    if (rateLimitHit) {
      console.log(`${progress} Skipped (rate limited): ${exercise.name}`);
      skippedCount++;
      continue;
    }

    const match = await searchExercise(exercise.name);

    if (match && match.gifUrl) {
      foundCount++;
      results.push({ name: exercise.name, gifUrl: match.gifUrl, exerciseId: match.exerciseId });
      console.log(`${progress} Found: ${exercise.name} → ${match.gifUrl}`);

      if (!dryRun && supabase) {
        const { error } = await supabase
          .from("exercises")
          .update({ animation_url: match.gifUrl })
          .eq("name", exercise.name);

        if (error) {
          console.log(`  Update error: ${error.message}`);
        } else {
          updatedCount++;
        }
      }
    } else {
      console.log(`${progress} Not found: ${exercise.name}`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log("\n=== Summary ===");
  console.log(`Total:      ${seedExercises.length}`);
  console.log(`Found:      ${foundCount}`);
  console.log(`Updated:    ${updatedCount}`);
  console.log(`Not found:  ${seedExercises.length - foundCount}`);
  console.log(`Skipped:    ${skippedCount}`);
  console.log(`API calls:  ${requestCount}`);

  const jsonPath = path.resolve(process.cwd(), "supabase/seed/exercise-animations.json");
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved results to ${jsonPath}`);
}

fetchAnimations().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
