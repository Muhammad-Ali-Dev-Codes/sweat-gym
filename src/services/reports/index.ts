import { createClient } from "@/lib/supabase/server";
import type { ReportSession } from "@/lib/reports/calculate";

export interface ReportSessionWithMeta extends ReportSession {
  workoutName: string | null;
  categories: { name: string; slug: string }[];
  level: string | null;
}

export interface EarnedAchievementRow {
  key: string;
  earned_at: string;
}

export interface PlanDayRow {
  id: string;
  day_number: number;
  status: string;
}

export interface UserPlanRow {
  id: string;
  status: string;
  started_at: string;
}

export interface ReportsData {
  sessions: ReportSessionWithMeta[];
  weights: { recorded_at: string; weight_kg: number }[];
  targetWeight: number | null;
  timeZone: string;
  activePlan: UserPlanRow | null;
  planDays: PlanDayRow[];
  plansCompleted: number;
  earnedAchievements: EarnedAchievementRow[];
}

/**
 * All data required by the Reports experience in a single parallel batch.
 *
 * Queries are capped so huge histories cannot stall rendering:
 *  - last 1000 completed sessions cover >2 years of daily training,
 *    far beyond what charts/streaks (365-day window) need;
 *  - last 365 weight entries for trend/history views.
 * Authorization is enforced by RLS on every table (user_id = auth.uid()).
 */
const SESSION_CAP = 1000;

interface WorkoutMetaJoin {
  name: string;
  workout_category_map: {
    workout_categories: { name: string; slug: string };
  }[];
  workout_levels: { levels: { slug: string } }[];
}

export async function getReportsData(userId: string): Promise<ReportsData> {
  const supabase = await createClient();

  const [
    profileResult,
    sessionsResult,
    weightsResult,
    fpResult,
    planResult,
    plansCompletedResult,
    achievementsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("user_id", userId).single(),
    supabase
      .from("workout_sessions")
      .select(
        `
        id,
        workout_id,
        source,
        completed_at,
        duration_seconds,
        estimated_calories,
        workouts (
          name,
          workout_category_map (
            workout_categories ( name, slug )
          ),
          workout_levels (
            levels ( slug )
          )
        )
      `
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(SESSION_CAP),
    supabase
      .from("weight_entries")
      .select("recorded_at, weight_kg")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(365),
    supabase
      .from("fitness_profiles")
      .select("target_weight_kg")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_plans")
      .select("id, status, started_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("user_plans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("user_achievements")
      .select("achievement_key, earned_at")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false }),
  ]);

  const timeZone = profileResult.data?.timezone || "UTC";

  if (sessionsResult.error) {
    console.error(
      "getReportsData sessions failed:",
      sessionsResult.error.message
    );
  }

  const rows =
    (sessionsResult.data as unknown as
      | (ReportSession & { workouts: WorkoutMetaJoin | null })[]
      | null) ?? [];

  // Oldest-first ordering is friendlier for chart/trend math downstream.
  const sessions: ReportSessionWithMeta[] = [...rows]
    .reverse()
    .map((row) => ({
      id: row.id,
      workout_id: row.workout_id ?? null,
      completed_at: row.completed_at,
      duration_seconds: row.duration_seconds,
      estimated_calories: row.estimated_calories,
      source: row.source ?? null,
      workoutName: row.workouts?.name ?? null,
      categories:
        row.workouts?.workout_category_map
          ?.map((c) => c.workout_categories)
          .filter(
            (c): c is { name: string; slug: string } => Boolean(c)
          ) ?? [],
      level: row.workouts?.workout_levels?.[0]?.levels?.slug ?? null,
    }));

  const weights =
    (weightsResult.data as { recorded_at: string; weight_kg: number }[] | null) ??
    [];

  let planDays: PlanDayRow[] = [];
  if (planResult.data) {
    const { data: daysData } = await supabase
      .from("user_plan_days")
      .select("id, day_number, status")
      .eq("user_plan_id", planResult.data.id)
      .order("day_number");
    planDays = (daysData as PlanDayRow[] | null) ?? [];
  }

  return {
    sessions,
    weights: [...weights].reverse(),
    targetWeight:
      fpResult.data?.target_weight_kg != null
        ? Number(fpResult.data.target_weight_kg)
        : null,
    timeZone,
    activePlan: (planResult.data as UserPlanRow | null) ?? null,
    planDays,
    plansCompleted: plansCompletedResult.count ?? 0,
    earnedAchievements: ((achievementsResult.data as
      | { achievement_key: string; earned_at: string }[]
      | null) ?? []).map((r) => ({
      key: r.achievement_key,
      earned_at: r.earned_at,
    })),
  };
}
