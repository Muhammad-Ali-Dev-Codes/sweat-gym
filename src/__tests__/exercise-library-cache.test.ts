import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  cacheExerciseLibrary,
  getCachedExerciseBySlug,
  getCachedExerciseById,
  getAllCachedExercises,
  searchCachedExercises,
  clearExerciseLibraryCache,
} from "@/lib/offline/exercise-library";
import type { CachedLibraryExercise } from "@/lib/offline/db";

const MOCK_EXERCISES: CachedLibraryExercise[] = [
  {
    id: "ex-1",
    name: "Push-Up",
    slug: "push-up",
    shortDescription: "A classic upper-body exercise",
    description: "Full description of push-up",
    instructions: ["Step 1", "Step 2"],
    animationUrl: null,
    exerciseType: "strength",
    difficulty: "beginner",
    exerciseMode: "reps",
    isLowImpact: true,
    requiresJumping: false,
    isFeatured: true,
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSeconds: 45,
    durationSeconds: null,
    caloriesEstimate: 8,
    formTips: ["Keep core tight"],
    safetyNotes: ["Stop if pain"],
    primaryMuscle: "Chest",
    primaryMuscleSlug: "chest",
    focusArea: "Chest",
    focusAreaSlug: "chest",
    level: "Beginner",
    levelSlug: "beginner",
    equipment: "No Equipment",
    equipmentSlug: "none",
    cachedAt: Date.now(),
  },
  {
    id: "ex-2",
    name: "Bodyweight Squat",
    slug: "bodyweight-squat",
    shortDescription: "A lower-body exercise",
    description: "Full description of squat",
    instructions: ["Step 1"],
    animationUrl: null,
    exerciseType: "strength",
    difficulty: "beginner",
    exerciseMode: "reps",
    isLowImpact: true,
    requiresJumping: false,
    isFeatured: false,
    defaultSets: 3,
    defaultReps: 15,
    defaultRestSeconds: 45,
    durationSeconds: null,
    caloriesEstimate: 10,
    formTips: null,
    safetyNotes: null,
    primaryMuscle: "Quadriceps",
    primaryMuscleSlug: "quadriceps",
    focusArea: "Butt & Legs",
    focusAreaSlug: "butt_legs",
    level: "Beginner",
    levelSlug: "beginner",
    equipment: "No Equipment",
    equipmentSlug: "none",
    cachedAt: Date.now(),
  },
  {
    id: "ex-3",
    name: "Dumbbell Bench Press",
    slug: "dumbbell-bench-press",
    shortDescription: "A chest exercise with dumbbells",
    description: "Full description",
    instructions: null,
    animationUrl: null,
    exerciseType: "strength",
    difficulty: "intermediate",
    exerciseMode: "reps",
    isLowImpact: true,
    requiresJumping: false,
    isFeatured: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSeconds: 60,
    durationSeconds: null,
    caloriesEstimate: 10,
    formTips: null,
    safetyNotes: null,
    primaryMuscle: "Chest",
    primaryMuscleSlug: "chest",
    focusArea: "Chest",
    focusAreaSlug: "chest",
    level: "Intermediate",
    levelSlug: "intermediate",
    equipment: "Dumbbells",
    equipmentSlug: "dumbbells",
    cachedAt: Date.now(),
  },
];

describe("Offline Exercise Library Cache", () => {
  beforeEach(async () => {
    await clearExerciseLibraryCache();
  });

  it("caches and retrieves exercises by slug", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const pushUp = await getCachedExerciseBySlug("push-up");
    expect(pushUp).toBeDefined();
    expect(pushUp!.name).toBe("Push-Up");
    expect(pushUp!.primaryMuscle).toBe("Chest");
  });

  it("caches and retrieves exercises by id", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const exercise = await getCachedExerciseById("ex-2");
    expect(exercise).toBeDefined();
    expect(exercise!.name).toBe("Bodyweight Squat");
  });

  it("returns undefined for non-existent slug", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const result = await getCachedExerciseBySlug("non-existent");
    expect(result).toBeUndefined();
  });

  it("returns all cached exercises", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const all = await getAllCachedExercises();
    expect(all).toHaveLength(3);
  });

  it("searches exercises by name", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const results = await searchCachedExercises("push");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Push-Up");
  });

  it("searches exercises by muscle", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const results = await searchCachedExercises("chest");
    expect(results).toHaveLength(2);
  });

  it("searches exercises by focus area", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const results = await searchCachedExercises("legs");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Bodyweight Squat");
  });

  it("clears the cache", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);
    expect(await getAllCachedExercises()).toHaveLength(3);

    await clearExerciseLibraryCache();
    expect(await getAllCachedExercises()).toHaveLength(0);
  });

  it("overwrites exercises on re-cache (idempotent)", async () => {
    await cacheExerciseLibrary(MOCK_EXERCISES);
    await cacheExerciseLibrary(MOCK_EXERCISES);

    const all = await getAllCachedExercises();
    expect(all).toHaveLength(3);
  });
});
