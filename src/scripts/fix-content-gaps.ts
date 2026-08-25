/* eslint-disable @typescript-eslint/no-explicit-any */
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface IdMap { [key: string]: string }

async function getTable(table: string): Promise<any[]> {
  const { data } = await supabase.from(table).select("*");
  return data || [];
}

async function main(): Promise<void> {
  console.log("=== Content Gap Fix (Bulk) ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  const exercises = await getTable("exercises");
  const focusAreas = await getTable("focus_areas");
  const equipment = await getTable("equipment");
  const levels = await getTable("levels");
  const exerciseRestrictions = await getTable("exercise_restrictions");

  const faMap: IdMap = {};
  focusAreas.forEach((f: any) => faMap[f.slug] = f.id);
  const eqMap: IdMap = {};
  equipment.forEach((e: any) => eqMap[e.slug] = e.id);
  const lvMap: IdMap = {};
  levels.forEach((l: any) => lvMap[l.slug] = l.id);
  const erMap: IdMap = {};
  exerciseRestrictions.forEach((r: any) => erMap[r.slug] = r.id);

  const exMap: IdMap = {};
  exercises.forEach((e: any) => exMap[e.name] = e.id);

  function ids(names: string[]): string[] {
    return names.map(n => exMap[n]).filter(Boolean);
  }

  // 1. Focus areas
  const fullBodyIds = ids(["Burpee","Mountain Climber","Bear Crawl","Inchworm","Dumbbell Thruster","Kettlebell Swing","Turkish Get-Up","Clean and Press","Deadlift","Squat to Press","Renegade Row","Man Maker","Sprawl","Lateral Shuffle","High Knees","Jump Rope","Jumping Jack","Jumping Jacks","Push-Up","Plank","Bodyweight Squat","Lunges","Glute Bridge","Wall Sit","Bird Dog","Fire Hydrant"]);
  const buttLegsIds = ids(["Bodyweight Squat","Lunges","Glute Bridge","Calf Raise","Wall Sit","Dumbbell Squat","Romanian Deadlift","Step Up","Lateral Lunge","Bulgarian Split Squat","Hip Thrust","Leg Press","Sumo Squat","Single Leg Deadlift","Donkey Kick","Fire Hydrant","Deadlift","Squat to Press"]);

  const focusRows = [
    ...fullBodyIds.map(id => ({ exercise_id: id, focus_area_id: faMap["full_body"] })),
    ...buttLegsIds.map(id => ({ exercise_id: id, focus_area_id: faMap["butt_legs"] })),
  ];

  console.log(`1. Focus areas: ${focusRows.length} rows`);
  if (!dryRun && focusRows.length > 0) {
    const { error } = await supabase.from("exercise_focus_areas").upsert(focusRows, { onConflict: "exercise_id,focus_area_id" });
    if (error) console.log(`   Error: ${error.message}`);
    else console.log("   OK");
  }

  // 2. Equipment
  const rbIds = ids(["Bicep Curl","Lateral Raise","Front Raise","Face Pull","Tricep Kickback"]);
  const matIds = ids(["Plank","Side Plank","Bicycle Crunch","Dead Bug","Bird Dog","Mountain Climber","Russian Twist","Leg Raise","Reverse Crunch","Toe Touch Crunch","Hollow Body Hold","Ab Rollout","Cable Crunch","Hanging Leg Raise","Flutter Kick","V-Up","Glute Bridge","Fire Hydrant","Donkey Kick","Bodyweight Squat","Lunges","Push-Up","Burpee","Bear Crawl","Inchworm"]);

  const equipRows = [
    ...rbIds.map(id => ({ exercise_id: id, equipment_id: eqMap["resistance_band"] })),
    ...matIds.map(id => ({ exercise_id: id, equipment_id: eqMap["mat"] })),
  ];

  console.log(`2. Equipment: ${equipRows.length} rows`);
  if (!dryRun && equipRows.length > 0) {
    const { error } = await supabase.from("exercise_equipment").upsert(equipRows, { onConflict: "exercise_id,equipment_id" });
    if (error) console.log(`   Error: ${error.message}`);
    else console.log("   OK");
  }

  // 3. Restrictions
  const jumpingExercises = new Set(["Jumping Jack","Jumping Jacks","Burpee","Jump Rope","High Knees","Lateral Shuffle","Mountain Climber"]);
  const allExIds = exercises.map((e: any) => e.id);
  const noJumpIds = allExIds.filter((id: string) => {
    const name = exercises.find((e: any) => e.id === id)?.name;
    return name && !jumpingExercises.has(name);
  });
  const lowImpactIds = [...noJumpIds];

  const kneeSensitiveIds = ids(["Bodyweight Squat","Lunges","Glute Bridge","Calf Raise","Wall Sit","Dumbbell Squat","Romanian Deadlift","Step Up","Lateral Lunge","Bulgarian Split Squat","Hip Thrust","Leg Press","Sumo Squat","Single Leg Deadlift","Donkey Kick","Fire Hydrant","Plank","Side Plank","Dead Bug","Bird Dog","Flutter Kick","Leg Raise","Reverse Crunch"]);
  const backSensitiveIds = ids(["Push-Up","Incline Push-Up","Decline Push-Up","Diamond Push-Up","Plank","Side Plank","Dead Bug","Bird Dog","Glute Bridge","Calf Raise","Wall Sit","Donkey Kick","Fire Hydrant","Hammer Curl","Concentration Curl","Lateral Raise","Front Raise","Tricep Kickback","Wrist Curl","Reverse Wrist Curl","Bicycle Crunch","Flutter Kick","Toe Touch Crunch","V-Up","Bear Crawl","Inchworm"]);
  const noCrunchIds = ids(["Plank","Side Plank","Dead Bug","Bird Dog","Glute Bridge","Mountain Climber","Leg Raise","Reverse Crunch","Flutter Kick","Hollow Body Hold","Hanging Leg Raise","Ab Rollout","Cable Crunch","Bear Crawl","Inchworm"]);

  const restrictRows = [
    ...noJumpIds.map(id => ({ exercise_id: id, restriction_id: erMap["no_jumping"] })),
    ...lowImpactIds.map(id => ({ exercise_id: id, restriction_id: erMap["low_impact"] })),
    ...kneeSensitiveIds.map(id => ({ exercise_id: id, restriction_id: erMap["knee_sensitive"] })),
    ...backSensitiveIds.map(id => ({ exercise_id: id, restriction_id: erMap["back_sensitive"] })),
    ...noCrunchIds.map(id => ({ exercise_id: id, restriction_id: erMap["no_crunch"] })),
  ];

  console.log(`3. Restrictions: ${restrictRows.length} rows`);
  if (!dryRun && restrictRows.length > 0) {
    const { error } = await supabase.from("exercise_restriction_map").upsert(restrictRows, { onConflict: "exercise_id,restriction_id" });
    if (error) console.log(`   Error: ${error.message}`);
    else console.log("   OK");
  }

  // 4. Levels
  const beginnerIds = ids(["Jumping Jack","Jumping Jacks","Bodyweight Squat","Lunges","Plank","Push-Up","Bird Dog","Fire Hydrant","Hollow Body Hold","Sprawl"]);
  const intermediateIds = ids(["Turkish Get-Up","Man Maker","Lateral Shuffle"]);
  const advancedIds = ids(["Clean and Press","Renegade Row","Deadlift"]);

  const levelRows = [
    ...beginnerIds.map(id => ({ exercise_id: id, level_id: lvMap["beginner"] })),
    ...intermediateIds.map(id => ({ exercise_id: id, level_id: lvMap["intermediate"] })),
    ...advancedIds.map(id => ({ exercise_id: id, level_id: lvMap["advanced"] })),
  ];

  console.log(`4. Levels: ${levelRows.length} rows`);
  if (!dryRun && levelRows.length > 0) {
    const { error } = await supabase.from("exercise_levels").upsert(levelRows, { onConflict: "exercise_id,level_id" });
    if (error) console.log(`   Error: ${error.message}`);
    else console.log("   OK");
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
