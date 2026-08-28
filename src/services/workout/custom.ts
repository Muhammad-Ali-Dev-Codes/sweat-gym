import { createClient } from "@/lib/supabase/server";
import type { Exercise, Workout, WorkoutExercise } from "@/lib/types/database";

export type CustomWorkout = Workout & {
  owner_user_id: string;
  workout_exercises: (WorkoutExercise & { exercises: Pick<Exercise, "id" | "name" | "exercise_mode" | "default_reps" | "duration_seconds" | "animation_url"> | null })[];
};

export async function getCustomWorkouts(userId: string): Promise<CustomWorkout[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("id, name, slug, description, duration_seconds, estimated_calories, is_active, created_at, updated_at, owner_user_id, workout_exercises(id, workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds, created_at, exercises(id, name, exercise_mode, default_reps, duration_seconds, animation_url))")
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false });

  return (data as unknown as CustomWorkout[] | null) ?? [];
}

export async function getCustomWorkout(userId: string, workoutId: string): Promise<CustomWorkout | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("id, name, slug, description, duration_seconds, estimated_calories, is_active, created_at, updated_at, owner_user_id, workout_exercises(id, workout_id, exercise_id, exercise_order, sets, reps, duration_seconds, rest_seconds, created_at, exercises(id, name, exercise_mode, default_reps, duration_seconds, animation_url))")
    .eq("id", workoutId)
    .eq("owner_user_id", userId)
    .single();

  return (data as unknown as CustomWorkout) ?? null;
}
