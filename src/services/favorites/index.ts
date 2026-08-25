import { createClient } from "@/lib/supabase/client";
import type { FavoriteWorkout } from "@/lib/types";

export async function getFavorites(userId: string): Promise<FavoriteWorkout[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("favorite_workouts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching favorites:", error.message);
    return [];
  }

  return (data ?? []) as FavoriteWorkout[];
}

export async function toggleFavorite(
  userId: string,
  workoutId: string
): Promise<boolean> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("favorite_workouts")
    .select("user_id")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("favorite_workouts")
      .delete()
      .eq("user_id", userId)
      .eq("workout_id", workoutId);

    if (error) {
      console.error("Error removing favorite:", error.message);
      return false;
    }
    return false;
  } else {
    const { error } = await supabase.from("favorite_workouts").insert({
      user_id: userId,
      workout_id: workoutId,
    });

    if (error) {
      console.error("Error adding favorite:", error.message);
      return false;
    }
    return true;
  }
}
