import { describe, it, expect } from "vitest";
import type {
  Exercise,
  ExerciseWithRelations,
  ExerciseFilters,
  ExerciseDifficulty,
  ExerciseType,
  ExerciseFavorite,
} from "@/lib/types/database";

describe("Exercise Library types", () => {
  it("Exercise interface has all library fields", () => {
    const exercise: Exercise = {
      id: "test-id",
      external_source: null,
      external_exercise_id: null,
      name: "Push-Up",
      slug: "push-up",
      short_description: "A classic upper-body exercise",
      description: "Full description",
      instructions: ["Step 1", "Step 2"],
      animation_url: null,
      thumbnail_url: null,
      video_url: null,
      media_source: "seed",
      exercise_mode: "reps",
      difficulty: "beginner",
      exercise_type: "strength",
      is_low_impact: true,
      requires_jumping: false,
      is_active: true,
      is_featured: false,
      default_sets: 3,
      default_reps: 12,
      default_rest_seconds: 45,
      duration_seconds: null,
      calories_estimate: 8,
      form_tips: ["Keep core tight"],
      safety_notes: ["Stop if pain"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    expect(exercise.slug).toBe("push-up");
    expect(exercise.difficulty).toBe("beginner");
    expect(exercise.exercise_type).toBe("strength");
    expect(exercise.is_featured).toBe(false);
    expect(exercise.form_tips).toHaveLength(1);
    expect(exercise.safety_notes).toHaveLength(1);
  });

  it("Exercise supports optional new fields for backward compatibility", () => {
    const legacy: Exercise = {
      id: "test-id",
      external_source: null,
      external_exercise_id: null,
      name: "Push-Up",
      description: null,
      instructions: null,
      animation_url: null,
      thumbnail_url: null,
      video_url: null,
      media_source: "seed",
      exercise_mode: "reps",
      is_low_impact: true,
      requires_jumping: false,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    expect(legacy.slug).toBeUndefined();
    expect(legacy.difficulty).toBeUndefined();
    expect(legacy.exercise_type).toBeUndefined();
  });

  it("ExerciseWithRelations includes M2M junction data", () => {
    const exercise: ExerciseWithRelations = {
      id: "test-id",
      external_source: null,
      external_exercise_id: null,
      name: "Push-Up",
      slug: "push-up",
      description: null,
      instructions: null,
      animation_url: null,
      thumbnail_url: null,
      video_url: null,
      media_source: "seed",
      exercise_mode: "reps",
      is_low_impact: true,
      requires_jumping: false,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      exercise_muscles: [
        { muscle_id: "m1", is_primary: true, muscles: { name: "Chest", slug: "chest" } },
        { muscle_id: "m2", is_primary: false, muscles: { name: "Triceps", slug: "triceps" } },
      ],
      exercise_focus_areas: [
        { focus_areas: { name: "Chest", slug: "chest" } },
      ],
      exercise_levels: [
        { levels: { name: "Beginner", slug: "beginner" } },
      ],
      exercise_equipment: [
        { equipment: { name: "None", slug: "none" } },
      ],
    };

    expect(exercise.exercise_muscles).toHaveLength(2);
    expect(exercise.exercise_muscles[0].is_primary).toBe(true);
    expect(exercise.exercise_muscles[0].muscles?.slug).toBe("chest");
    expect(exercise.exercise_focus_areas[0].focus_areas?.name).toBe("Chest");
  });

  it("ExerciseFavorite has correct shape", () => {
    const fav: ExerciseFavorite = {
      user_id: "user-1",
      exercise_id: "ex-1",
      created_at: "2024-01-01T00:00:00Z",
    };

    expect(fav.user_id).toBe("user-1");
    expect(fav.exercise_id).toBe("ex-1");
  });
});

describe("ExerciseFilters", () => {
  it("supports all filter fields", () => {
    const filters: ExerciseFilters = {
      search: "push",
      category: "chest",
      difficulty: "beginner",
      muscle: "pectorals",
      equipment: "none",
      exerciseType: "strength",
      favoritesOnly: false,
      sort: "name",
    };

    expect(filters.search).toBe("push");
    expect(filters.difficulty).toBe("beginner");
    expect(filters.sort).toBe("name");
  });

  it("all filter fields are optional", () => {
    const filters: ExerciseFilters = {};
    expect(filters.search).toBeUndefined();
    expect(filters.category).toBeUndefined();
    expect(filters.difficulty).toBeUndefined();
  });
});

describe("Exercise type constraints", () => {
  it("ExerciseDifficulty accepts only valid values", () => {
    const valid: ExerciseDifficulty[] = ["beginner", "intermediate", "advanced"];
    expect(valid).toHaveLength(3);
  });

  it("ExerciseType accepts only valid values", () => {
    const valid: ExerciseType[] = [
      "strength",
      "cardio",
      "mobility",
      "stretching",
      "warm_up",
      "cool_down",
      "core",
      "balance",
    ];
    expect(valid).toHaveLength(8);
  });
});
