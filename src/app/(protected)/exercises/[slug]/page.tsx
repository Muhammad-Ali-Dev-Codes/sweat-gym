import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExerciseDetailClient } from "./exercise-detail-client";
import type { ExerciseWithRelations } from "@/lib/types/database";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    title: `${title} | Exercise Library`,
    description: `Learn how to perform the ${title} exercise with proper form, instructions, and tips.`,
  };
}

export default async function ExerciseDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const { data: exercise, error } = await supabase
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

  if (error || !exercise) notFound();

  // Fetch user's favorite state
  const { data: favData } = await supabase
    .from("favorite_exercises")
    .select("exercise_id")
    .eq("user_id", user.id)
    .eq("exercise_id", exercise.id)
    .maybeSingle();

  const isFavorited = Boolean(favData);

  // Fetch related exercises (same primary muscle or focus area)
  const primaryMuscle = exercise.exercise_muscles?.find(
    (m: { is_primary: boolean }) => m.is_primary
  )?.muscles?.slug;
  const focusArea = exercise.exercise_focus_areas?.[0]?.focus_areas?.slug;

  let relatedQuery = supabase
    .from("exercises")
    .select(
      `*,
      exercise_muscles ( muscle_id, is_primary, muscles ( name, slug ) ),
      exercise_focus_areas ( focus_areas ( name, slug ) ),
      exercise_levels ( levels ( name, slug ) ),
      exercise_equipment ( equipment ( name, slug ) )`
    )
    .eq("is_active", true)
    .neq("id", exercise.id)
    .limit(6);

  if (primaryMuscle) {
    relatedQuery = relatedQuery
      .eq("exercise_muscles.muscles.slug", primaryMuscle)
      .eq("exercise_muscles.is_primary", true);
  } else if (focusArea) {
    relatedQuery = relatedQuery.eq("exercise_focus_areas.focus_areas.slug", focusArea);
  }

  const { data: relatedData } = await relatedQuery;

  return (
    <ExerciseDetailClient
      exercise={exercise as unknown as ExerciseWithRelations}
      initialIsFavorited={isFavorited}
      userId={user.id}
      relatedExercises={(relatedData ?? []) as unknown as ExerciseWithRelations[]}
    />
  );
}
