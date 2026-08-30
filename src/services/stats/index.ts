import { createClient } from "@/lib/supabase/server";
import { computeStreaks } from "@/lib/dates";
import { sumEstimatedCalories } from "@/lib/reports/calculate";

export interface WorkoutStats {
  totalCompletedWorkouts: number;
  totalCalories: number;
  totalMinutes: number;
  plansCompleted: number;
  /** completed_at timestamps, most recent first (capped). */
  completedAtTimestamps: string[];
  /** Completed workout ids, most recent first (capped ~10) for repetition penalties. */
  recentCompletedWorkoutIds: string[];
  currentStreak: number;
  longestStreak: number;
}

// Aligned with the reports service cap (1000) so achievements awarded from
// this aggregate agree with the progress shown on the reports screen.
const TIMESTAMP_CAP = 1000;

/**
 * Aggregate a user's authoritative workout history in a small number of
 * queries. Streaks are derived from real session timestamps using the user's
 * local calendar (timezone from profiles.timezone).
 */
export async function getWorkoutStats(
  userId: string,
  timeZone = "UTC"
): Promise<WorkoutStats> {
  const supabase = await createClient();

  const [sessionsResult, plansResult] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, workout_id, completed_at, duration_seconds, estimated_calories")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(TIMESTAMP_CAP),
    supabase
      .from("user_plans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);

  const sessions =
    (sessionsResult.data as {
      id: string;
      workout_id: string;
      completed_at: string | null;
      duration_seconds: number | null;
      estimated_calories: number | null;
    }[] | null) ?? [];

  const totalCalories = sumEstimatedCalories(sessions);
  const totalSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0
  );

  const streaks = computeStreaks(
    sessions.map((s) => s.completed_at).filter((d): d is string => Boolean(d)),
    timeZone
  );

  return {
    totalCompletedWorkouts: sessions.length,
    totalCalories,
    totalMinutes: Math.round(totalSeconds / 60),
    plansCompleted: plansResult.count ?? 0,
    completedAtTimestamps: sessions
      .map((s) => s.completed_at)
      .filter((d): d is string => Boolean(d)),
    recentCompletedWorkoutIds: [...new Set(sessions.map((s) => s.workout_id))].slice(0, 10),
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
  };
}
