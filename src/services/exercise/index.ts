import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", exerciseId)
    .single();

  if (error) {
    console.error("Error fetching exercise:", error.message);
    return null;
  }

  return data as Exercise;
}

export async function getExercisesByIds(
  exerciseIds: string[]
): Promise<Exercise[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .in("id", exerciseIds);

  if (error) {
    console.error("Error fetching exercises:", error.message);
    return [];
  }

  return (data ?? []) as Exercise[];
}
