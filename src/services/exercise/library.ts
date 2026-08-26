import { createClient } from "@/lib/supabase/server";
import type { ExerciseWithRelations, ExerciseFilters } from "@/lib/types/database";

const PAGE_SIZE = 20;

export async function getExercises(
  filters: ExerciseFilters = {},
  page: number = 0
): Promise<{ data: ExerciseWithRelations[]; hasMore: boolean; count: number | null }> {
  const supabase = await createClient();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("exercises")
    .select(
      `
      *,
      exercise_muscles (
        muscle_id, is_primary,
        muscles ( name, slug )
      ),
      exercise_focus_areas (
        focus_areas ( name, slug )
      ),
      exercise_levels (
        levels ( name, slug )
      ),
      exercise_equipment (
        equipment ( name, slug )
      )
    `,
      { count: "exact" }
    )
    .eq("is_active", true);

  // Text search using full-text search
  if (filters.search && filters.search.trim()) {
    const sanitized = filters.search.trim().replace(/[&|!():*]/g, " ");
    query = query.or(
      `name.ilike.%${sanitized}%,short_description.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
    );
  }

  // Category filter (focus area slug)
  if (filters.category) {
    query = query.eq("exercise_focus_areas.focus_areas.slug", filters.category);
  }

  // Difficulty filter
  if (filters.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  // Muscle filter (primary muscle slug)
  if (filters.muscle) {
    query = query.eq("exercise_muscles.muscles.slug", filters.muscle).eq("exercise_muscles.is_primary", true);
  }

  // Equipment filter
  if (filters.equipment) {
    if (filters.equipment === "none") {
      query = query.eq("exercise_equipment.equipment.slug", "none");
    } else {
      query = query.eq("exercise_equipment.equipment.slug", filters.equipment);
    }
  }

  // Exercise type filter
  if (filters.exerciseType) {
    query = query.eq("exercise_type", filters.exerciseType);
  }

  // Sort
  const sort = filters.sort ?? "name";
  switch (sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "difficulty":
      query = query.order("difficulty", { ascending: true }).order("name", { ascending: true });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Exercise library query failed:", error.message);
    return { data: [], hasMore: false, count: null };
  }

  const exercises = (data ?? []) as ExerciseWithRelations[];
  const hasMore = exercises.length === PAGE_SIZE;

  return { data: exercises, hasMore, count };
}

export async function getExerciseBySlug(
  slug: string
): Promise<ExerciseWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exercises")
    .select(
      `
      *,
      exercise_muscles (
        muscle_id, is_primary,
        muscles ( name, slug )
      ),
      exercise_focus_areas (
        focus_areas ( name, slug )
      ),
      exercise_levels (
        levels ( name, slug )
      ),
      exercise_equipment (
        equipment ( name, slug )
      )
    `
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Exercise detail query failed:", error.message);
    return null;
  }

  return data as ExerciseWithRelations;
}

export async function getRelatedExercises(
  exerciseId: string,
  primaryMuscleSlug: string | null,
  focusAreaSlug: string | null,
  limit: number = 6
): Promise<ExerciseWithRelations[]> {
  const supabase = await createClient();

  let query = supabase
    .from("exercises")
    .select(
      `
      *,
      exercise_muscles (
        muscle_id, is_primary,
        muscles ( name, slug )
      ),
      exercise_focus_areas (
        focus_areas ( name, slug )
      ),
      exercise_levels (
        levels ( name, slug )
      ),
      exercise_equipment (
        equipment ( name, slug )
      )
    `
    )
    .eq("is_active", true)
    .neq("id", exerciseId)
    .limit(limit);

  // Prioritize same primary muscle, then same focus area
  if (primaryMuscleSlug) {
    query = query.eq("exercise_muscles.muscles.slug", primaryMuscleSlug).eq("exercise_muscles.is_primary", true);
  } else if (focusAreaSlug) {
    query = query.eq("exercise_focus_areas.focus_areas.slug", focusAreaSlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Related exercises query failed:", error.message);
    return [];
  }

  return (data ?? []) as ExerciseWithRelations[];
}

export async function getUserFavoriteExerciseIds(
  userId: string
): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorite_exercises")
    .select("exercise_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Fetch exercise favorites failed:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.exercise_id));
}

export async function addExerciseFavorite(
  userId: string,
  exerciseId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("favorite_exercises")
    .insert({ user_id: userId, exercise_id: exerciseId });

  if (error) {
    console.error("Add exercise favorite failed:", error.message);
    return false;
  }
  return true;
}

export async function removeExerciseFavorite(
  userId: string,
  exerciseId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("favorite_exercises")
    .delete()
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId);

  if (error) {
    console.error("Remove exercise favorite failed:", error.message);
    return false;
  }
  return true;
}
