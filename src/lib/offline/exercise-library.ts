import { db, type CachedLibraryExercise } from "./db";

export async function cacheExerciseLibrary(exercises: CachedLibraryExercise[]): Promise<void> {
  await db.cachedExerciseLibrary.bulkPut(exercises);
}

export async function getCachedExerciseBySlug(slug: string): Promise<CachedLibraryExercise | undefined> {
  return db.cachedExerciseLibrary.where("slug").equals(slug).first();
}

export async function getCachedExerciseById(id: string): Promise<CachedLibraryExercise | undefined> {
  return db.cachedExerciseLibrary.get(id);
}

export async function getAllCachedExercises(): Promise<CachedLibraryExercise[]> {
  return db.cachedExerciseLibrary.toArray();
}

export async function searchCachedExercises(query: string): Promise<CachedLibraryExercise[]> {
  const lower = query.toLowerCase();
  const all = await db.cachedExerciseLibrary.toArray();
  return all.filter(
    (e) =>
      e.name.toLowerCase().includes(lower) ||
      (e.shortDescription && e.shortDescription.toLowerCase().includes(lower)) ||
      (e.description && e.description.toLowerCase().includes(lower)) ||
      (e.primaryMuscle && e.primaryMuscle.toLowerCase().includes(lower)) ||
      (e.focusArea && e.focusArea.toLowerCase().includes(lower))
  );
}

export async function clearExerciseLibraryCache(): Promise<void> {
  await db.cachedExerciseLibrary.clear();
}
