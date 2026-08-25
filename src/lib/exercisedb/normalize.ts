import type { ExerciseDbExerciseDTO } from "./types";
import { EQUIPMENT_MAP } from "./mappings/equipment";
import { MUSCLE_MAP } from "./mappings/muscles";
import { BODY_PART_TO_FOCUS_AREA } from "./mappings/focus-areas";
import { EXERCISE_LEVEL_MAP } from "./mappings/levels";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EXERCISE_RESTRICTIONS_MAP } from "./mappings/restrictions";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EXERCISE_MODE_MAP } from "./mappings/exercise-modes";

export interface NormalizedExercise {
  external_source: string;
  external_exercise_id: string;
  name: string;
  description: string | null;
  instructions: string[];
  animation_url: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  media_source: string;
  exercise_mode: "reps" | "duration" | "both";
  is_low_impact: boolean;
  requires_jumping: boolean;
  is_active: boolean;
  equipment_slugs: string[];
  target_muscle_slugs: string[];
  secondary_muscle_slugs: string[];
  focus_area_slugs: string[];
  level_slugs: string[];
  restriction_slugs: string[];
}

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function mapEquipment(equipments: string[]): string[] {
  const slugs = new Set<string>();
  for (const eq of equipments) {
    const mapped = EQUIPMENT_MAP[eq.toLowerCase()];
    if (mapped) slugs.add(mapped);
  }
  return Array.from(slugs);
}

function mapMuscles(muscles: string[]): string[] {
  const slugs = new Set<string>();
  for (const muscle of muscles) {
    const mapped = MUSCLE_MAP[muscle.toLowerCase()];
    if (mapped) slugs.add(mapped);
  }
  return Array.from(slugs);
}

function mapFocusAreas(bodyParts: string[], targetMuscles: string[]): string[] {
  const slugs = new Set<string>();
  for (const bp of bodyParts) {
    const mapped = BODY_PART_TO_FOCUS_AREA[bp.toLowerCase()];
    if (mapped) slugs.add(mapped);
  }
  for (const muscle of targetMuscles) {
    const mapped = MUSCLE_MAP[muscle.toLowerCase()];
    if (mapped) {
      const focusMapped = MUSCLE_TO_FOCUS_AREA[mapped];
      if (focusMapped) slugs.add(focusMapped);
    }
  }
  return Array.from(slugs);
}

const MUSCLE_TO_FOCUS_AREA: Record<string, string> = {
  "pectorals": "chest",
  "biceps": "arm",
  "triceps": "arm",
  "delts": "arm",
  "deltoids": "arm",
  "shoulders": "arm",
  "forearms": "arm",
  "abs": "abs",
  "waist": "abs",
  "glutes": "butt-and-legs",
  "quadriceps": "butt-and-legs",
  "hamstrings": "butt-and-legs",
  "calves": "butt-and-legs",
  "upper legs": "butt-and-legs",
  "lower legs": "butt-and-legs",
  "lats": "full-body",
  "traps": "full-body",
  "upper back": "full-body",
  "back": "full-body",
  "spine": "full-body",
  "cardiovascular system": "full-body",
};

function mapLevels(exercise: ExerciseDbExerciseDTO): string[] {
  const key = `${exercise.equipments.join(",")}|${exercise.bodyParts.join(",")}|${exercise.targetMuscles.join(",")}`;
  return EXERCISE_LEVEL_MAP[key] || ["beginner"];
}

function mapRestrictions(exercise: ExerciseDbExerciseDTO): string[] {
  const restrictions: string[] = [];
  const name = exercise.name.toLowerCase();
  const bodyParts = exercise.bodyParts.map((b) => b.toLowerCase());
  const targetMuscles = exercise.targetMuscles.map((m) => m.toLowerCase());

  if (name.includes("jump") || name.includes("plyometric")) {
    restrictions.push("no-jumping");
  }

  if (name.includes("plank") || name.includes("walk") || name.includes("march") ||
      name.includes("yoga") || name.includes("stretch")) {
    restrictions.push("low-impact");
  }

  if (bodyParts.includes("cardio") && (name.includes("run") || name.includes("jump") ||
      name.includes("burpee") || name.includes("sprint"))) {
    restrictions.push("no-jumping");
  }

  if (targetMuscles.includes("lower back") || name.includes("back extension")) {
    restrictions.push("back-sensitive");
  }

  if (name.includes("crunch") || name.includes("sit-up") || name.includes("situp")) {
    restrictions.push("no-crunch");
  }

  return restrictions;
}

function classifyExerciseMode(exercise: ExerciseDbExerciseDTO): "reps" | "duration" | "both" {
  const name = exercise.name.toLowerCase();
  const bodyParts = exercise.bodyParts.map((b) => b.toLowerCase());

  if (bodyParts.includes("cardio")) return "duration";
  if (name.includes("plank") || name.includes("hold") || name.includes("stretch")) return "duration";
  if (name.includes("jumping jack") || name.includes("mountain climber")) return "both";
  return "reps";
}

function classifyJumping(exercise: ExerciseDbExerciseDTO): boolean {
  const name = exercise.name.toLowerCase();
  return name.includes("jump") || name.includes("plyometric") ||
         name.includes("bounding") || name.includes("hop");
}

function classifyLowImpact(exercise: ExerciseDbExerciseDTO): boolean {
  const name = exercise.name.toLowerCase();
  const bodyParts = exercise.bodyParts.map((b) => b.toLowerCase());
  if (bodyParts.includes("cardio") && (name.includes("run") || name.includes("jump") ||
      name.includes("burpee") || name.includes("sprint"))) return false;
  if (name.includes("walk") || name.includes("march") || name.includes("yoga") ||
      name.includes("stretch") || name.includes("swim")) return true;
  return true;
}

export function normalizeExercise(dto: ExerciseDbExerciseDTO): NormalizedExercise {
  return {
    external_source: "exercisedb",
    external_exercise_id: dto.exerciseId,
    name: normalizeName(dto.name),
    description: null,
    instructions: dto.instructions || [],
    animation_url: dto.gifUrl || null,
    thumbnail_url: null,
    video_url: null,
    media_source: "exercisedb",
    exercise_mode: classifyExerciseMode(dto),
    is_low_impact: classifyLowImpact(dto),
    requires_jumping: classifyJumping(dto),
    is_active: true,
    equipment_slugs: mapEquipment(dto.equipments),
    target_muscle_slugs: mapMuscles(dto.targetMuscles),
    secondary_muscle_slugs: mapMuscles(dto.secondaryMuscles),
    focus_area_slugs: mapFocusAreas(dto.bodyParts, dto.targetMuscles),
    level_slugs: mapLevels(dto),
    restriction_slugs: mapRestrictions(dto),
  };
}

export function normalizeExercises(dtos: ExerciseDbExerciseDTO[]): NormalizedExercise[] {
  return dtos.map(normalizeExercise);
}
