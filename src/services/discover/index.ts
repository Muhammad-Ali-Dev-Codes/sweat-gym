import { createClient } from "@/lib/supabase/server";
import type { Workout } from "@/lib/types/database";

interface ExerciseCandidate {
  id: string;
  exercise_mode: string;
  requires_jumping: boolean;
  is_low_impact: boolean;
  name: string;
}

export async function getDiscoverWorkouts(): Promise<Workout[]> {
  const supabase = await createClient();
  // Only workouts that actually have exercises — an empty workout would
  // render a dead detail page with no animations to follow.
  const { data } = await supabase
    .from("workouts")
    .select(
      `
      *,
      workout_exercises ( id )
    `
    )
    .eq("is_active", true)
    .order("name");

  return ((data as (Workout & { workout_exercises: { id: string }[] })[]) ?? [])
    .filter((w) => (w.workout_exercises?.length ?? 0) > 0)
    .map(({ workout_exercises, ...w }) => {
      void workout_exercises;
      return w as Workout;
    });
}

export async function getDiscoverWorkoutWithExercises(workoutId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select(`
      *,
      workout_exercises (
        id, exercise_order, sets, reps, duration_seconds, rest_seconds,
        exercises (
          id, name, animation_url, instructions, exercise_mode,
          is_low_impact, requires_jumping
        )
      )
    `)
    .eq("id", workoutId)
    .single();

  return data;
}

export async function getReplacementExercise(
  exerciseId: string,
  restrictions: string[]
): Promise<string | null> {
  const supabase = await createClient();

  const { data: original } = await supabase
    .from("exercises")
    .select("id, exercise_mode, requires_jumping, is_low_impact")
    .eq("id", exerciseId)
    .single();

  if (!original) return null;

  const isCompatible = checkCompatibility(original, restrictions);
  if (isCompatible) return exerciseId;

  const { data: focusAreas } = await supabase
    .from("exercise_focus_areas")
    .select("focus_area_id")
    .eq("exercise_id", exerciseId);

  const focusAreaIds = focusAreas?.map((f) => f.focus_area_id) ?? [];

  let candidates;
  if (focusAreaIds.length > 0) {
    const { data: focusCandidates } = await supabase
      .from("exercise_focus_areas")
      .select("exercise_id")
      .in("focus_area_id", focusAreaIds);

    const candidateIds = [...new Set(focusCandidates?.map((f) => f.exercise_id) ?? [])];

    const { data: candidateExercises } = await supabase
      .from("exercises")
      .select("id, exercise_mode, requires_jumping, is_low_impact, name")
      .in("id", candidateIds)
      .eq("is_active", true);

    candidates = candidateExercises as ExerciseCandidate[];
  } else {
    const { data: allActive } = await supabase
      .from("exercises")
      .select("id, exercise_mode, requires_jumping, is_low_impact, name")
      .eq("is_active", true);

    candidates = (allActive as ExerciseCandidate[]) ?? [];
  }

  const compatible = candidates.filter((c: ExerciseCandidate) => {
    if (c.id === exerciseId) return false;
    return checkCompatibility(c, restrictions);
  });

  const sameMode = compatible.filter((c: ExerciseCandidate) => c.exercise_mode === original.exercise_mode);
  if (sameMode.length > 0) return sameMode[0].id;

  return compatible.length > 0 ? compatible[0].id : null;
}

function checkCompatibility(
  exercise: { exercise_mode: string; requires_jumping: boolean; is_low_impact: boolean },
  restrictions: string[]
): boolean {
  for (const restriction of restrictions) {
    if (restriction === "no_jumping" && exercise.requires_jumping) return false;
    if (restriction === "low_impact" && !exercise.is_low_impact) return false;
  }
  return true;
}
