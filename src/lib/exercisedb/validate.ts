import type { ExerciseDbExerciseDTO } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateExercise(exercise: ExerciseDbExerciseDTO): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!exercise.exerciseId || exercise.exerciseId.trim() === "") {
    errors.push("Missing exerciseId");
  }

  if (!exercise.name || exercise.name.trim() === "") {
    errors.push("Missing name");
  }

  if (!exercise.bodyParts || !Array.isArray(exercise.bodyParts) || exercise.bodyParts.length === 0) {
    errors.push("Missing or empty bodyParts");
  }

  if (!exercise.equipments || !Array.isArray(exercise.equipments) || exercise.equipments.length === 0) {
    errors.push("Missing or empty equipments");
  }

  if (!exercise.targetMuscles || !Array.isArray(exercise.targetMuscles) || exercise.targetMuscles.length === 0) {
    errors.push("Missing or empty targetMuscles");
  }

  if (!exercise.instructions || !Array.isArray(exercise.instructions) || exercise.instructions.length === 0) {
    warnings.push("Missing or empty instructions");
  }

  if (!exercise.gifUrl || exercise.gifUrl.trim() === "") {
    warnings.push("Missing gifUrl");
  } else if (!exercise.gifUrl.startsWith("http")) {
    warnings.push("Invalid gifUrl format");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateExercises(exercises: ExerciseDbExerciseDTO[]): {
  valid: ExerciseDbExerciseDTO[];
  invalid: { exercise: ExerciseDbExerciseDTO; errors: string[] }[];
} {
  const valid: ExerciseDbExerciseDTO[] = [];
  const invalid: { exercise: ExerciseDbExerciseDTO; errors: string[] }[] = [];

  for (const exercise of exercises) {
    const result = validateExercise(exercise);
    if (result.valid) {
      valid.push(exercise);
    } else {
      invalid.push({ exercise, errors: result.errors });
    }
  }

  return { valid, invalid };
}
