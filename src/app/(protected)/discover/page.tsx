import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import type { Workout } from "@/lib/types/database";
import {
  inferGoal,
  scoreWorkouts,
  type LevelSlug,
  type ScorableWorkout,
} from "@/lib/personalization/scoring";
import { DiscoverClient, type DiscoverWorkout } from "./discover-client";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .single();

  // Guard against onboarding loop: if the flag is missing but an active plan
  // exists, the user completed onboarding but the flag wasn't persisted.
  if (profileData && !profileData.onboarding_completed_at) {
    const { data: hasPlan } = await supabase
      .from("user_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!hasPlan) redirect("/onboarding");
  }

  const [workoutsResult, favoritesResult, fpResult, weightResult, sessionsResult, resumeResult] =
    await Promise.all([
      supabase
        .from("workouts")
        .select(
          `
          *,
          workout_category_map (
            workout_categories (
              name,
              slug
            )
          ),
          workout_levels (
            levels (
              slug
            )
          )
        `
        )
        .eq("is_active", true)
        .order("name"),
      supabase.from("favorite_workouts").select("workout_id").eq("user_id", user.id),
      supabase
        .from("fitness_profiles")
        .select("fitness_level, target_weight_kg")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("weight_entries")
        .select("weight_kg")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Recent history powers repetition penalty, novelty, and duration fit.
      supabase
        .from("workout_sessions")
        .select("workout_id, duration_seconds")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20),
      // Most recent unfinished session powers the Resume strip.
      supabase
        .from("workout_sessions")
        .select("workout_id, started_at, workouts(name)")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const loadError = Boolean(workoutsResult.error);
  if (workoutsResult.error) {
    console.error("Discover workouts query failed:", workoutsResult.error.message);
  }

  interface WorkoutRow extends Workout {
    workout_category_map: {
      workout_categories: { name: string; slug: string };
    }[];
    workout_levels: { levels: { slug: LevelSlug } }[];
  }

  const rows =
    (workoutsResult.data as unknown as WorkoutRow[] | null) ?? [];

  const favoriteIds = new Set(
    (favoritesResult.data as { workout_id: string }[] | null)?.map(
      (f) => f.workout_id
    ) ?? []
  );

  // ---- Personalization context ---------------------------------------------
  const fitnessLevel = (fpResult.data?.fitness_level as LevelSlug | undefined) ?? null;
  const currentWeightKg = weightResult.data?.weight_kg != null
    ? Number(weightResult.data.weight_kg)
    : null;
  const targetWeightKg =
    fpResult.data?.target_weight_kg != null
      ? Number(fpResult.data.target_weight_kg)
      : null;

  const historyRows = (sessionsResult.data as { workout_id: string; duration_seconds: number | null }[] | null) ?? [];
  const recentCompletedWorkoutIds = [...new Set(historyRows.map((s) => s.workout_id))].slice(0, 10);

  const completedDurations = historyRows
    .map((s) => s.duration_seconds ?? 0)
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  const preferredDurationSeconds =
    completedDurations.length > 0
      ? completedDurations[Math.floor(completedDurations.length / 2)]
      : 600; // sensible default: 10 minutes

  const scorable: ScorableWorkout[] = rows.map((row) => ({
    id: row.id,
    duration_seconds: row.duration_seconds,
    categories: row.workout_category_map
      .map((c) => c.workout_categories?.slug)
      .filter((s): s is string => Boolean(s)),
    level: row.workout_levels[0]?.levels?.slug ?? null,
  }));

  const scored = scoreWorkouts(scorable, {
    fitnessLevel,
    goal: inferGoal(currentWeightKg, targetWeightKg),
    preferredDurationSeconds,
    favoriteWorkoutIds: favoriteIds,
    recentCompletedWorkoutIds,
  });

  const scoreById = new Map(scored.map((s) => [s.item.id, s.score]));

  const byId = new Map(rows.map((r) => [r.id, r]));
  const mapped = scored.map(({ item }): DiscoverWorkout | null => {
    const row = byId.get(item.id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      duration_seconds: row.duration_seconds,
      estimated_calories: row.estimated_calories,
      categories: row.workout_category_map
        .map((c) => c.workout_categories)
        .filter((c): c is { name: string; slug: string } => Boolean(c)),
      level: row.workout_levels[0]?.levels?.slug ?? "",
      score: Math.round(scoreById.get(row.id) ?? 0),
      isPick: false,
    };
  }).filter((w): w is DiscoverWorkout => w !== null);

  // "Picks for you" are the top-ranked workouts for this member.
  const pickIds = new Set(
    [...mapped].slice(0, 3).map((w) => w.id)
  );
  for (const w of mapped) w.isPick = pickIds.has(w.id);

  const resumeRow =
    (resumeResult.data as { workout_id: string; workouts: { name: string } | null } | null) ?? null;

  return (
    <DiscoverClient
      workouts={mapped}
      initialFavorites={favoriteIds}
      loadError={loadError}
      resumeWorkout={
        resumeRow ? { id: resumeRow.workout_id, name: resumeRow.workouts?.name ?? "Workout" } : null
      }
    />
  );
}
