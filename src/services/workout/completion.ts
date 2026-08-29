import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/onboarding";
import { getWorkoutStats } from "@/services/stats";
import { recordAchievements, type EarnedAchievement } from "@/services/achievement";
import { estimateCalories } from "@/lib/calories";
import { recognizeExerciseCalories } from "@/lib/weight-loss";
import { getLocalDayKey } from "@/lib/dates";

export interface CompletionSummary {
  alreadyCompleted: boolean;
  planDayCompleted: boolean;
  nextDayUnlocked: boolean;
  planCompleted: boolean;
  currentStreak: number;
  calories: number;
  newAchievements: EarnedAchievement[];
  /** Present when completion failed and the summary is a fallback result. */
  error?: string;
}

interface RpcResult {
  error?: string;
  already_completed?: boolean;
  plan_day_completed?: boolean;
  next_day_unlocked?: boolean;
  plan_completed?: boolean;
  current_streak?: number;
}

/**
 * The ONE authoritative workout-completion path.
 *
 * Used by both the online server action and the offline /api/sync endpoint so
 * business rules can never diverge. Delegates atomic state changes to the
 * complete_workout_session_rpc database function (idempotent, ownership-
 * checked) and then evaluates achievements against freshly aggregated stats.
 */
export async function finalizeWorkoutCompletion(params: {
  userId: string;
  sessionId: string;
  /** Client-measured duration; server recomputes calories when omitted. */
  durationSeconds?: number | null;
  weightKg?: number | null;
}): Promise<CompletionSummary> {
  const supabase = await createClient();

  // Load the session (RLS scopes to owner) to source duration/weight inputs.
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, started_at, completed_at, duration_seconds, estimated_calories")
    .eq("id", params.sessionId)
    .single();

  if (!session) {
    throw new Error("Session not found");
  }

  const profile = await getProfile(params.userId);
  const timeZone = profile?.timezone || "UTC";

  const durationSeconds =
    params.durationSeconds && params.durationSeconds > 0
      ? Math.floor(params.durationSeconds)
      : session.duration_seconds ??
        (session.started_at
          ? Math.max(
              60,
              Math.floor(
                (Date.now() - new Date(session.started_at).getTime()) / 1000
              )
            )
          : 60);

  // Uniform product burn rate: a full 60-minute session = 1,100 kcal.
  const rawCalories = estimateCalories(durationSeconds);

  // Keep the full estimated burn for this session. The dashboard and reports
  // should reflect the actual workout effort without imposing a synthetic
  // 1,000 kcal daily ceiling.
  const recognizedCalories = recognizeExerciseCalories(rawCalories);

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "complete_workout_session_rpc",
    {
      p_session_id: params.sessionId,
      p_duration_seconds: durationSeconds,
      p_estimated_calories: recognizedCalories,
      p_timezone: timeZone,
    }
  );

  if (rpcError) {
    console.error("complete_workout_session_rpc failed:", rpcError.message);
    throw new Error("Failed to complete workout");
  }

  const rpc = (rpcData as RpcResult) ?? {};

  const stats = await getWorkoutStats(params.userId, timeZone);
  const newAchievements = await recordAchievements(params.userId, {
    totalCompletedWorkouts: stats.totalCompletedWorkouts,
    currentStreak: stats.currentStreak,
    totalCalories: stats.totalCalories,
    totalMinutes: stats.totalMinutes,
    plansCompleted: stats.plansCompleted,
  });

  return {
    alreadyCompleted: Boolean(rpc.already_completed),
    planDayCompleted: Boolean(rpc.plan_day_completed),
    nextDayUnlocked: Boolean(rpc.next_day_unlocked),
    planCompleted: Boolean(rpc.plan_completed),
    currentStreak: rpc.current_streak ?? stats.currentStreak,
    calories: recognizedCalories,
    newAchievements,
  };
}

