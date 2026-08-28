"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getVerifiedUser } from "@/lib/supabase/auth-user";

const ExerciseEditSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100).nullable(),
  durationSeconds: z.number().int().min(1).max(3600).nullable(),
  restSeconds: z.number().int().min(0).max(600),
});

const ExerciseEditsSchema = z.array(ExerciseEditSchema).min(1).max(50);

export type PlanDayExerciseEdit = z.infer<typeof ExerciseEditSchema>;

export async function savePlanDayEdits(planDayId: string, exercises: PlanDayExerciseEdit[]) {
  if (!z.string().uuid().safeParse(planDayId).success) return { error: "Invalid plan day" };
  const parsed = ExerciseEditsSchema.safeParse(exercises);
  if (!parsed.success) return { error: "Check the exercise settings and try again." };

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { error: "Not authenticated" };

  const { data: workoutId, error } = await supabase.rpc("save_user_plan_day_workout", {
    p_plan_day_id: planDayId,
    p_exercises: parsed.data,
  });
  if (error || !workoutId) return { error: error?.message ?? "Unable to save plan edits" };

  revalidatePath(`/plan/${planDayId}`);
  revalidatePath("/plan");
  return { workoutId };
}

export async function resetPlanDayEdits(planDayId: string) {
  if (!z.string().uuid().safeParse(planDayId).success) return { error: "Invalid plan day" };

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { error: "Not authenticated" };

  const { data: workoutId, error } = await supabase.rpc("reset_plan_day_workout", {
    p_plan_day_id: planDayId,
  });
  if (error || !workoutId) return { error: error?.message ?? "Unable to reset plan edits" };

  revalidatePath(`/plan/${planDayId}`);
  revalidatePath("/plan");
  return { workoutId };
}

export async function getPlanExerciseRecommendations(planDayId: string, exerciseId: string) {
  if (!z.string().uuid().safeParse(planDayId).success || !z.string().uuid().safeParse(exerciseId).success) return { exercises: [], error: "Invalid exercise" };

  const supabase = await createClient();
  const user = await getAuthUser(supabase, 10_000);
  if (!user) return { exercises: [], error: "Not authenticated" };

  const { data: day } = await supabase
    .from("user_plan_days")
    .select("id, status, workout_id, user_plans!inner(user_id)")
    .eq("id", planDayId)
    .eq("user_plans.user_id", user.id)
    .single();
  if (!day || !["locked", "available", "completed"].includes(day.status)) return { exercises: [], error: "This plan day cannot be edited while a workout is in progress." };

  const [{ data: original }, { data: restrictions }, { data: selectedFocusAreas }, { data: planExercises }] = await Promise.all([
    supabase
      .from("exercises")
      .select("exercise_mode, requires_jumping, is_low_impact")
      .eq("id", exerciseId)
      .single(),
    supabase
      .from("user_physical_restrictions")
      .select("physical_restrictions(slug)")
      .eq("user_id", user.id),
    supabase
      .from("exercise_focus_areas")
      .select("focus_area_id")
      .eq("exercise_id", exerciseId),
    supabase
      .from("workout_exercises")
      .select("exercise_id")
      .eq("workout_id", day.workout_id),
  ]);
  if (!original) return { exercises: [], error: "The current exercise is no longer available." };

  const restrictionSlugs = (restrictions as { physical_restrictions?: { slug: string } | { slug: string }[] | null }[] | null)
    ?.flatMap((row) => {
      if (!row.physical_restrictions) return [];
      return Array.isArray(row.physical_restrictions)
        ? row.physical_restrictions.map((restriction) => restriction.slug)
        : [row.physical_restrictions.slug];
    }) ?? [];

  const planExerciseIds = [...new Set((planExercises ?? []).map((row) => row.exercise_id))];
  const { data: planFocusAreas } = planExerciseIds.length > 0
    ? await supabase
      .from("exercise_focus_areas")
      .select("focus_area_id")
      .in("exercise_id", planExerciseIds)
    : { data: [] as { focus_area_id: string }[] };
  const focusAreaIds = [...new Set([
    ...(selectedFocusAreas ?? []).map((row) => row.focus_area_id),
    ...(planFocusAreas ?? []).map((row) => row.focus_area_id),
  ])];

  let candidateQuery = supabase
    .from("exercises")
    .select("id, name, animation_url, exercise_mode, default_reps, duration_seconds, requires_jumping, is_low_impact, exercise_focus_areas!inner(focus_area_id)")
    .eq("is_active", true)
    .eq("exercise_mode", original.exercise_mode)
    .neq("id", exerciseId);
  if (focusAreaIds.length > 0) {
    candidateQuery = candidateQuery.in("exercise_focus_areas.focus_area_id", focusAreaIds);
  }
  const { data: candidates, error: candidatesError } = await candidateQuery;

  if (candidatesError) return { exercises: [], error: "Unable to load replacement exercises." };

  const exercises = (candidates ?? [])
    .filter((candidate) => !planExerciseIds.includes(candidate.id))
    .filter((candidate) => !restrictionSlugs.includes("no_jumping") || !candidate.requires_jumping)
    .filter((candidate) => !restrictionSlugs.includes("low_impact") || candidate.is_low_impact)
    .slice(0, 5)
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      animation_url: candidate.animation_url,
      exercise_mode: candidate.exercise_mode,
      default_reps: candidate.default_reps,
      duration_seconds: candidate.duration_seconds,
    }));
  return { exercises, error: null };
}