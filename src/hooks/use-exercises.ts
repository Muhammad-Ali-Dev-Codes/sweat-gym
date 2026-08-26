"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getVerifiedUser } from "@/lib/supabase/auth-user";
import type { ExerciseWithRelations, ExerciseFilters } from "@/lib/types/database";

const PAGE_SIZE = 20;

function buildExerciseQuery(filters: ExerciseFilters, page: number) {
  const supabase = createClient();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("exercises")
    .select(
      `*,
      exercise_muscles ( muscle_id, is_primary, muscles ( name, slug ) ),
      exercise_focus_areas ( focus_areas ( name, slug ) ),
      exercise_levels ( levels ( name, slug ) ),
      exercise_equipment ( equipment ( name, slug ) )`,
      { count: "exact" }
    )
    .eq("is_active", true);

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().replace(/[&|!():*]/g, " ");
    query = query.or(`name.ilike.%${s}%,short_description.ilike.%${s}%,description.ilike.%${s}%`);
  }
  if (filters.category) {
    query = query.eq("exercise_focus_areas.focus_areas.slug", filters.category);
  }
  if (filters.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }
  if (filters.muscle) {
    query = query.eq("exercise_muscles.muscles.slug", filters.muscle).eq("exercise_muscles.is_primary", true);
  }
  if (filters.equipment) {
    query = query.eq("exercise_equipment.equipment.slug", filters.equipment);
  }
  if (filters.exerciseType) {
    query = query.eq("exercise_type", filters.exerciseType);
  }

  const sort = filters.sort ?? "name";
  if (sort === "name") query = query.order("name", { ascending: true });
  else if (sort === "difficulty") query = query.order("difficulty", { ascending: true }).order("name", { ascending: true });
  else if (sort === "newest") query = query.order("created_at", { ascending: false });

  return query.range(from, to);
}

export function useExerciseLibrary(filters: ExerciseFilters) {
  return useInfiniteQuery({
    queryKey: ["exercises", filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, count } = await buildExerciseQuery(filters, pageParam);
      return {
        exercises: (data ?? []) as ExerciseWithRelations[],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        total: count ?? 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExerciseDetail(slug: string) {
  return useQuery({
    queryKey: ["exercise", slug],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("exercises")
        .select(
          `*,
          exercise_muscles ( muscle_id, is_primary, muscles ( name, slug ) ),
          exercise_focus_areas ( focus_areas ( name, slug ) ),
          exercise_levels ( levels ( name, slug ) ),
          exercise_equipment ( equipment ( name, slug ) )`
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data as ExerciseWithRelations;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRelatedExercises(
  exerciseId: string,
  primaryMuscleSlug: string | null,
  focusAreaSlug: string | null
) {
  return useQuery({
    queryKey: ["exercise-related", exerciseId],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("exercises")
        .select(
          `*,
          exercise_muscles ( muscle_id, is_primary, muscles ( name, slug ) ),
          exercise_focus_areas ( focus_areas ( name, slug ) ),
          exercise_levels ( levels ( name, slug ) ),
          exercise_equipment ( equipment ( name, slug ) )`
        )
        .eq("is_active", true)
        .neq("id", exerciseId)
        .limit(6);

      if (primaryMuscleSlug) {
        query = query.eq("exercise_muscles.muscles.slug", primaryMuscleSlug).eq("exercise_muscles.is_primary", true);
      } else if (focusAreaSlug) {
        query = query.eq("exercise_focus_areas.focus_areas.slug", focusAreaSlug);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ExerciseWithRelations[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!exerciseId,
  });
}

export function useExerciseFavorites(userId: string | null) {
  return useQuery({
    queryKey: ["exercise-favorites", userId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("favorite_exercises")
        .select("exercise_id")
        .eq("user_id", userId!);

      if (error) throw error;
      return new Set((data ?? []).map((r) => r.exercise_id));
    },
    staleTime: 60 * 1000,
    enabled: !!userId,
  });
}

export function useToggleExerciseFavorite(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ exerciseId, isFavorited }: { exerciseId: string; isFavorited: boolean }) => {
      const supabase = createClient();
      const user = userId ? { id: userId } : await getVerifiedUser(supabase);
      if (!user) throw new Error("Not authenticated");

      if (isFavorited) {
        const { error } = await supabase
          .from("favorite_exercises")
          .delete()
          .eq("user_id", user.id)
          .eq("exercise_id", exerciseId);
        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from("favorite_exercises")
          .insert({ user_id: user.id, exercise_id: exerciseId });
        if (error) throw error;
        return true;
      }
    },
    onMutate: async ({ exerciseId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ["exercise-favorites", userId] });
      const previous = queryClient.getQueryData<Set<string>>(["exercise-favorites", userId]);
      queryClient.setQueryData<Set<string>>(["exercise-favorites", userId], (old) => {
        const next = new Set(old ?? []);
        if (isFavorited) next.delete(exerciseId);
        else next.add(exerciseId);
        return next;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["exercise-favorites", userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-favorites", userId] });
    },
  });
}
