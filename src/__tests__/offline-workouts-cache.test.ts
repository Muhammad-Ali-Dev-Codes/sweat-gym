import { describe, it, expect, beforeEach } from "vitest";
import {
  cacheWorkout,
  getCachedWorkout,
  deleteCachedWorkout,
  getAllCachedWorkouts,
} from "@/lib/offline/workouts";
import { db } from "@/lib/offline/db";

beforeEach(async () => {
  await db.cachedWorkouts.clear();
  await db.cachedExercises.clear();
});

const testWorkout = {
  workoutId: "w1",
  name: "Upper Body Blast",
  slug: "upper-body-blast",
  description: "A quick upper body session",
  durationSeconds: 600,
  estimatedCalories: 250,
  exercises: [
    {
      workoutExerciseId: "we1",
      exerciseId: "ex1",
      exerciseOrder: 1,
      sets: 3,
      reps: 10,
      durationSeconds: null,
      restSeconds: 60,
      name: "Bench Press",
      animationUrl: "https://example.com/bench.gif",
      instructions: ["Lie on bench", "Press bar up"],
      exerciseMode: "reps",
    },
  ],
};

describe("Workout caching (Dexie)", () => {
  it("should cache a workout", async () => {
    await cacheWorkout(testWorkout);
    const cached = await getCachedWorkout("w1");
    expect(cached).toBeDefined();
    expect(cached!.name).toBe("Upper Body Blast");
    expect(cached!.exercises.length).toBe(1);
  });

  it("should update an existing cached workout", async () => {
    await cacheWorkout(testWorkout);
    await cacheWorkout({ ...testWorkout, name: "Updated Name" });
    const cached = await getCachedWorkout("w1");
    expect(cached!.name).toBe("Updated Name");
  });

  it("should delete a cached workout", async () => {
    await cacheWorkout(testWorkout);
    await deleteCachedWorkout("w1");
    const cached = await getCachedWorkout("w1");
    expect(cached).toBeUndefined();
  });

  it("should return all cached workouts", async () => {
    await cacheWorkout(testWorkout);
    await cacheWorkout({ ...testWorkout, workoutId: "w2", name: "Leg Day" });
    const all = await getAllCachedWorkouts();
    expect(all.length).toBe(2);
  });

  it("should set cachedAt timestamp", async () => {
    const before = Date.now();
    await cacheWorkout(testWorkout);
    const cached = await getCachedWorkout("w1");
    expect(cached!.cachedAt).toBeGreaterThanOrEqual(before);
    expect(cached!.cachedAt).toBeLessThanOrEqual(Date.now());
  });
});
