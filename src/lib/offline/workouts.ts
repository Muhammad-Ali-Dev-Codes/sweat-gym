import { db, type CachedWorkout, type CachedExercise } from "./db";

export async function cacheWorkout(workout: {
  workoutId: string;
  name: string;
  slug: string;
  description: string | null;
  durationSeconds: number;
  estimatedCalories: number;
  exercises: {
    workoutExerciseId: string;
    exerciseId: string;
    exerciseOrder: number;
    sets: number;
    reps: number | null;
    durationSeconds: number | null;
    restSeconds: number;
    name: string;
    animationUrl: string | null;
    instructions: string[] | null;
    exerciseMode: string;
  }[];
}): Promise<void> {
  const cached: CachedWorkout = {
    workoutId: workout.workoutId,
    name: workout.name,
    slug: workout.slug,
    description: workout.description,
    durationSeconds: workout.durationSeconds,
    estimatedCalories: workout.estimatedCalories,
    exercises: workout.exercises.map(
      (e): CachedExercise => ({
        workoutExerciseId: e.workoutExerciseId,
        exerciseId: e.exerciseId,
        exerciseOrder: e.exerciseOrder,
        sets: e.sets,
        reps: e.reps,
        durationSeconds: e.durationSeconds,
        restSeconds: e.restSeconds,
        name: e.name,
        animationUrl: e.animationUrl,
        instructions: e.instructions,
        exerciseMode: e.exerciseMode,
      })
    ),
    cachedAt: Date.now(),
  };

  await db.cachedWorkouts.put(cached);
}

export async function getCachedWorkout(workoutId: string): Promise<CachedWorkout | undefined> {
  return db.cachedWorkouts.get(workoutId);
}

export async function deleteCachedWorkout(workoutId: string): Promise<void> {
  await db.cachedWorkouts.delete(workoutId);
}

export async function getAllCachedWorkouts(): Promise<CachedWorkout[]> {
  return db.cachedWorkouts.toArray();
}
