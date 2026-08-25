import { createClient } from "@/lib/supabase/server";
import type { WorkoutSession, WorkoutExerciseSessionWithJoins } from "@/lib/types/database";

export async function getOrCreateSession(data: {
  userId: string;
  workoutId: string;
  source: "plan" | "discover";
  planDayId?: string;
  clientOperationId: string;
}): Promise<WorkoutSession | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("client_operation_id", data.clientOperationId)
    .single();

  if (existing) return existing as WorkoutSession;

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: data.userId,
      workout_id: data.workoutId,
      source: data.source,
      user_plan_day_id: data.planDayId ?? null,
      started_at: new Date().toISOString(),
      status: "in_progress",
      client_operation_id: data.clientOperationId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error.message);
    return null;
  }

  const { data: exercises } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", data.workoutId)
    .order("exercise_order");

  if (exercises && exercises.length > 0) {
    const exerciseRows = exercises.map((e: { id: string }, i: number) => ({
      workout_session_id: session.id,
      workout_exercise_id: e.id,
      status: i === 0 ? "in_progress" : "pending",
      completed_sets: 0,
    }));

    await supabase.from("workout_exercise_sessions").insert(exerciseRows);
  }

  return session as WorkoutSession;
}

export async function getSession(sessionId: string): Promise<WorkoutSession | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  return (data as WorkoutSession) ?? null;
}

/**
 * Find the resumable open session for a workout. When `source` is given the
 * lookup is scoped so a plan start can never accidentally resume a leftover
 * discover session for the same global workout (and vice versa) — resuming
 * across sources would complete the wrong session shape and strand the plan
 * day in `in_progress` forever.
 */
export async function getIncompleteSession(
  userId: string,
  workoutId: string,
  opts?: { source?: "plan" | "discover"; planDayId?: string }
): Promise<WorkoutSession | null> {
  const supabase = await createClient();
  let query = supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("workout_id", workoutId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1);

  if (opts?.planDayId) {
    query = query.eq("user_plan_day_id", opts.planDayId);
  } else if (opts?.source === "plan") {
    // Plan sessions are always bound to a plan day; never match NULL-day rows.
    query = query.not("user_plan_day_id", "is", null);
  } else if (opts?.source === "discover") {
    query = query.is("user_plan_day_id", null);
  }

  const { data } = await query.single();

  return (data as WorkoutSession) ?? null;
}

export async function getExerciseSessions(sessionId: string): Promise<WorkoutExerciseSessionWithJoins[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_exercise_sessions")
    .select(`
      *,
      workout_exercises (
        id, exercise_order, sets, reps, duration_seconds, rest_seconds,
        exercises (
          id, name, animation_url, instructions, exercise_mode
        )
      )
    `)
    .eq("workout_session_id", sessionId)
    .order("workout_exercises(exercise_order)");

  return (data as WorkoutExerciseSessionWithJoins[]) ?? [];
}

export async function completeExerciseSession(
  exerciseSessionId: string,
  data: { completedSets: number; actualReps?: number; actualDurationSeconds?: number }
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("workout_exercise_sessions")
    .update({
      status: "completed",
      completed_sets: data.completedSets,
      actual_reps: data.actualReps ?? null,
      actual_duration_seconds: data.actualDurationSeconds ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", exerciseSessionId);
}

export async function skipExerciseSession(exerciseSessionId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("workout_exercise_sessions")
    .update({
      status: "skipped",
      skipped_at: now,
      updated_at: now,
    })
    .eq("id", exerciseSessionId);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function activateNextExercise(sessionId: string, currentOrder: number): Promise<void> {
  const supabase = await createClient();

  const { data: next } = await supabase
    .from("workout_exercise_sessions")
    .select("id")
    .eq("workout_session_id", sessionId)
    .eq("status", "pending")
    .order("workout_exercises(exercise_order)")
    .limit(1)
    .single();

  if (next) {
    await supabase
      .from("workout_exercise_sessions")
      .update({ status: "in_progress", started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", next.id);
  }
}

export async function completeWorkoutSession(
  sessionId: string,
  durationSeconds: number,
  estimatedCalories: number
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: now,
      duration_seconds: durationSeconds,
      estimated_calories: estimatedCalories,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("status", "in_progress");
}
