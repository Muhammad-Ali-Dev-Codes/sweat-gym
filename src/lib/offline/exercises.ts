import { db, type CachedExercise } from "./db";

export async function getCachedExercise(exerciseId: string): Promise<CachedExercise | undefined> {
  return db.cachedExercises.get(exerciseId);
}

export async function getCachedExercisesByWorkout(workoutId: string): Promise<CachedExercise[]> {
  const workout = await db.cachedWorkouts.get(workoutId);
  return workout?.exercises ?? [];
}

export async function cacheExercises(exercises: CachedExercise[]): Promise<void> {
  await db.cachedExercises.bulkPut(exercises);
}

export async function deleteCachedExercise(exerciseId: string): Promise<void> {
  await db.cachedExercises.delete(exerciseId);
}
