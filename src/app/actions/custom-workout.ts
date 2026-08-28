"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-user";

const ExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100).nullable(),
  durationSeconds: z.number().int().min(1).max(3600).nullable(),
  restSeconds: z.number().int().min(0).max(600),
});

const WorkoutSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable(),
  exercises: z.array(ExerciseSchema).min(1).max(50),
});

export type CustomWorkoutInput = z.infer<typeof WorkoutSchema>;

function slugify(value: string): string {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom-workout"}-${crypto.randomUUID().slice(0, 8)}`;
}

async function verifyExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exercises: CustomWorkoutInput["exercises"]
) {
  const ids = exercises.map((exercise) => exercise.exerciseId);
  const { data } = await supabase.from("exercises").select("id, exercise_mode, default_reps, duration_seconds").in("id", ids).eq("is_active", true);
  if (!data || data.length !== new Set(ids).size) return null;
  return data;
}

export async function saveCustomWorkout(input: CustomWorkoutInput) {
  const parsed = WorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "Add at least one valid exercise and check the workout details." };

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { error: "Not authenticated" };

  const exercises = await verifyExercises(supabase, parsed.data.exercises);
  if (!exercises) return { error: "One or more exercises are no longer available." };

  const totalSeconds = parsed.data.exercises.reduce(
    (sum, exercise) => sum + (exercise.durationSeconds ?? 60) * exercise.sets + exercise.restSeconds * Math.max(0, exercise.sets - 1),
    0
  );
  const estimatedCalories = Math.max(1, Math.round(totalSeconds / 60 * 8));
  const workoutPayload = {
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    description: parsed.data.description || null,
    duration_seconds: Math.max(60, totalSeconds),
    estimated_calories: estimatedCalories,
    is_active: true,
    owner_user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  let workoutId = parsed.data.id;
  if (workoutId) {
    const { data: owned } = await supabase.from("workouts").select("id").eq("id", workoutId).eq("owner_user_id", user.id).single();
    if (!owned) return { error: "Workout not found" };
    const { error } = await supabase.from("workouts").update(workoutPayload).eq("id", workoutId).eq("owner_user_id", user.id);
    if (error) return { error: "Unable to update workout" };
    const { error: deleteError } = await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
    if (deleteError) return { error: "Unable to update exercises" };
  } else {
    const { data: created, error } = await supabase.from("workouts").insert(workoutPayload).select("id").single();
    if (error || !created) return { error: "Unable to save workout" };
    workoutId = created.id;
  }

  const rows = parsed.data.exercises.map((exercise, index) => ({
    workout_id: workoutId,
    exercise_id: exercise.exerciseId,
    exercise_order: index + 1,
    sets: exercise.sets,
    reps: exercise.reps,
    duration_seconds: exercise.durationSeconds,
    rest_seconds: exercise.restSeconds,
  }));
  const { error } = await supabase.from("workout_exercises").insert(rows);
  if (error) return { error: "Unable to save workout exercises" };

  revalidatePath("/workouts");
  return { workoutId };
}

export async function deleteCustomWorkout(workoutId: string) {
  if (!z.string().uuid().safeParse(workoutId).success) return { error: "Invalid workout" };
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId).eq("owner_user_id", user.id);
  if (error) return { error: "Unable to delete workout" };
  revalidatePath("/workouts");
  return { success: true };
}
