"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLocalDayKey, getLocalToday } from "@/lib/dates";
import { getOrCreateSession, getIncompleteSession } from "@/services/workout";
import { decideLockedDayStart } from "@/services/plan";
import { getReplacementExercise } from "@/services/discover";
import { finalizeWorkoutCompletion, type CompletionSummary } from "@/services/workout/completion";
import { getVerifiedUser } from "@/lib/supabase/auth-user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const StartSchema = z.object({
  workoutId: z.string().uuid(),
  source: z.enum(["plan", "discover", "custom"]),
  planDayId: z.string().uuid().optional(),
});

export interface WorkoutExerciseView {
  exerciseSessionId: string;
  workoutExerciseId: string;
  name: string;
  animationUrl: string | null;
  instructions: string[] | null;
  mode: string;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
}

export interface StartWorkoutResult {
  sessionId: string;
  exercises: WorkoutExerciseView[];
  error?: string;
}

interface ExerciseSessionRow {
  id: string;
  status: string;
  // PostgREST returns many-to-one embeds as a single object (or null when
  // the parent row is gone), never an array.
  workout_exercises: {
    id: string;
    exercise_order: number;
    sets: number;
    reps: number | null;
    duration_seconds: number | null;
    rest_seconds: number;
    exercises: {
      id: string;
      name: string;
      animation_url: string | null;
      instructions: string[] | null;
      exercise_mode: string;
      is_low_impact: boolean;
      requires_jumping: boolean;
    } | null;
  } | null;
}

/** Fetch exercise-session rows for a session, ordered deterministically. */
async function fetchOrderedExerciseViews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<WorkoutExerciseView[]> {
  const { data } = await supabase
    .from("workout_exercise_sessions")
    .select(`
      id, status,
      workout_exercises (
        id, exercise_order, sets, reps, duration_seconds, rest_seconds,
        exercises (id, name, animation_url, instructions, exercise_mode, is_low_impact, requires_jumping)
      )
    `)
    .eq("workout_session_id", sessionId);

  const rows = ((data as unknown as ExerciseSessionRow[] | null) ?? []).sort(
    (a, b) =>
      (a.workout_exercises?.exercise_order ?? Number.MAX_SAFE_INTEGER) -
      (b.workout_exercises?.exercise_order ?? Number.MAX_SAFE_INTEGER)
  );

  return rows.map(toView);
}

function toView(row: ExerciseSessionRow): WorkoutExerciseView {
  const we = row.workout_exercises;
  const ex = we?.exercises ?? null;
  return {
    exerciseSessionId: row.id,
    workoutExerciseId: we?.id ?? "",
    name: ex?.name ?? "Exercise",
    animationUrl: ex?.animation_url ?? null,
    instructions: ex?.instructions ?? null,
    mode: ex?.exercise_mode ?? "reps",
    sets: we?.sets ?? 3,
    reps: we?.reps ?? null,
    durationSeconds: we?.duration_seconds ?? null,
    restSeconds: we?.rest_seconds ?? 30,
  };
}

/**
 * Start (or resume) a workout session.
 *
 * - Verifies plan-day availability server-side (available, in_progress, or
 *   completed — completed days run as repeat sessions for extra burn).
 * - Resumes an incomplete session when one exists instead of duplicating it.
 * - Applies physical-restriction replacements for discover workouts.
 * - Returns per-exercise session ids so completions can be tracked later.
 */
export async function startWorkout(input: {
  workoutId: string;
  source: "plan" | "discover" | "custom";
  planDayId?: string;
}): Promise<StartWorkoutResult> {
  const parsed = StartSchema.safeParse(input);
  if (!parsed.success) return { sessionId: "", exercises: [], error: "Invalid input" };

  const data = parsed.data;
  const supabase = await createClient();
  // Auth verification can be slower on a cold/dev Supabase connection. Keep
  // this mutation fail-closed, but avoid treating a valid session as logged
  // out after the shared 3-second default timeout.
  const user = await getVerifiedUser(supabase, 30_000);
  if (!user) return { sessionId: "", exercises: [], error: "Not authenticated" };
  let actualWorkoutId = data.workoutId;

  // Abandonment sweep: sessions left open >24h are closed out and any plan
  // day they held 'in_progress' is returned to 'available' so progression
  // cannot get stuck. Recent in_progress sessions stay resumable.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: staleSessions } = await supabase
    .from("workout_sessions")
    .select("id, user_plan_day_id")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .lt("started_at", cutoff);

  if (staleSessions && staleSessions.length > 0) {
    await supabase
      .from("workout_sessions")
      .update({ status: "abandoned", updated_at: new Date().toISOString() })
      .in("id", staleSessions.map((s) => s.id));

    const staleDayIds = staleSessions
      .map((s) => s.user_plan_day_id)
      .filter((id): id is string => Boolean(id));

    if (staleDayIds.length > 0) {
      await supabase
        .from("user_plan_days")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .in("id", staleDayIds)
        .eq("status", "in_progress");
    }
  }

  if (data.source === "plan") {
    if (!data.planDayId) return { sessionId: "", exercises: [], error: "Missing plan day" };

    const { data: day } = await supabase
      .from("user_plan_days")
      .select("id, status, workout_id, day_number, user_plan_id, unlocked_at")
      .eq("id", data.planDayId)
      .single();

    // RLS guarantees this day belongs to the caller; status gates progression.
    // Completed days may be repeated for extra burn — they simply don't
    // re-enter the in_progress state or re-trigger progression.
    if (
      !day ||
      !["available", "in_progress", "completed", "locked"].includes(day.status)
    ) {
      return { sessionId: "", exercises: [], error: "This day is not available yet" };
    }
    // The plan day is authoritative. The client may still hold the previous
    // workout id after a plan edit, so never create a session from that value.
    actualWorkoutId = day.workout_id;

    if (day.status !== "completed") {
      const { data: pacingProfile } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .single();
      const tz = pacingProfile?.timezone || "UTC";

      const { data: prevDay } = await supabase
        .from("user_plan_days")
        .select("status, completed_at")
        .eq("user_plan_id", day.user_plan_id)
        .eq("day_number", day.day_number - 1)
        .maybeSingle();

      // Calendar-driven unlock: completing a day opens the next one on the
      // NEXT local calendar day. If that window has already arrived, open
      // the locked day here instead of waiting for a /plan or /dashboard
      // visit to heal it.
      const prevCompletedToday =
        prevDay?.status === "completed" &&
        Boolean(prevDay.completed_at) &&
        getLocalDayKey(prevDay.completed_at!, tz) === getLocalToday(tz);

      if (day.status === "locked") {
        const decision = decideLockedDayStart(prevDay ?? null, tz);
        if (decision === "prev-incomplete") {
          return {
            sessionId: "",
            exercises: [],
            error: "Locked — complete the previous day first",
          };
        }

        // Daily pacing: only ONE new plan day may be started per calendar
        // day. If the previous day was completed today, this locked day
        // stays locked until tomorrow — reject BEFORE healing it open so
        // the plan screen never transiently shows an unavailable day.
        if (prevCompletedToday) {
          return {
            sessionId: "",
            exercises: [],
            error: "Locked until tomorrow — you've trained today. Recovery counts too.",
          };
        }

        const nowIso = new Date().toISOString();
        await supabase
          .from("user_plan_days")
          .update({ status: "available", unlocked_at: nowIso, updated_at: nowIso })
          .eq("id", day.id)
          .eq("status", "locked");
        day.status = "available";
        day.unlocked_at = nowIso;
      }

      // Daily pacing for already-open days: if the previous day was
      // completed today AND this day was unlocked today (i.e. it opened
      // because of that completion), it stays closed until tomorrow.
      // Repeating already-completed days is always allowed.
      const openedToday =
        Boolean(day.unlocked_at) &&
        getLocalDayKey(day.unlocked_at!, tz) === getLocalToday(tz);

      if (prevCompletedToday && openedToday) {
        return {
          sessionId: "",
          exercises: [],
          error: "Locked until tomorrow — you've trained today. Recovery counts too.",
        };
      }
    }

    // Mark in-progress so the plan screen reflects an active session
    // (never downgrade an already-completed day).
    if (day.status !== "completed") {
      await supabase
        .from("user_plan_days")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", data.planDayId)
        .in("status", ["available", "in_progress"]);
    }
  }

  // Resume an existing incomplete session for this workout when present.
  // Scoped to the same source (and plan day for plan workouts) so a plan
  // start cannot resume a leftover discover session for the same global
  // workout — that would strand the plan day in_progress forever.
  // Stale-session guard: sessions created before a re-import reference
  // workout_exercises rows that no longer exist, so their nested joins come
  // back empty (name "Exercise", sets/reps/duration defaults). Detect that
  // and rebuild the session against the current data instead of resuming it.
  const existing = await getIncompleteSession(user.id, data.workoutId, {
    source: data.source,
    planDayId: data.planDayId,
  });
  if (existing) {
    const views = await fetchOrderedExerciseViews(supabase, existing.id);
    const stale =
      views.length === 0 ||
      views.some((v) => v.workoutExerciseId === "" || v.name === "Exercise");
    if (!stale) {
      return { sessionId: existing.id, exercises: views };
    }
    await supabase
      .from("workout_exercise_sessions")
      .delete()
      .eq("workout_session_id", existing.id);
    await supabase.from("workout_sessions").delete().eq("id", existing.id);
  }

  // Restriction-aware replacement happens at session creation time.
  // Applied to BOTH sources: plan templates are pre-vetted per level but
  // not per member restriction, so a low-impact / no-jumping member must
  // never be served an incompatible exercise from their plan either.
  let restrictionSlugs: string[] = [];
  {
    const { data: restrictionRows } = await supabase
      .from("user_physical_restrictions")
      .select("restriction_id, physical_restrictions(slug)")
      .eq("user_id", user.id);

    restrictionSlugs = (restrictionRows as { physical_restrictions?: { slug: string }[] | null }[] | null)
      ?.flatMap((r) => r.physical_restrictions?.map((p) => p.slug) ?? []) ?? [];
  }

  const clientOperationId = `${user.id}-${actualWorkoutId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const session = await getOrCreateSession({
    userId: user.id,
    workoutId: actualWorkoutId,
    source: data.source,
    planDayId: data.planDayId,
    clientOperationId,
  });

  if (!session) return { sessionId: "", exercises: [], error: "Failed to create session" };

  let views = await fetchOrderedExerciseViews(supabase, session.id);

  if (restrictionSlugs.length > 0 && views.length > 0) {
    const replaced = await Promise.all(
      views.map(async (view) => {
        const originalExId = view.workoutExerciseId
          ? await resolveExerciseId(supabase, view.workoutExerciseId)
          : null;
        if (!originalExId) return view;

        const replacementId = await getReplacementExercise(originalExId, restrictionSlugs);
        if (!replacementId || replacementId === originalExId) return view;

        const { data: rep } = await supabase
          .from("exercises")
          .select("name, animation_url, instructions, exercise_mode")
          .eq("id", replacementId)
          .single();

        if (!rep) return view;
        return { ...view, name: rep.name, animationUrl: rep.animation_url, instructions: rep.instructions };
      })
    );
    views = replaced;
  }

  return { sessionId: session.id, exercises: views };
}

async function resolveExerciseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutExerciseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("workout_exercises")
    .select("exercise_id")
    .eq("id", workoutExerciseId)
    .maybeSingle();
  return data?.exercise_id ?? null;
}

// ---------------------------------------------------------------------------
// Finish
// ---------------------------------------------------------------------------

const FinishSchema = z.object({
  sessionId: z.string().regex(UUID_RE, "Invalid session id"),
  durationSeconds: z.number().int().positive().max(60 * 60 * 6).optional(),
  weightKg: z.number().positive().max(500).optional(),
  exercises: z
    .array(
      z.object({
        exerciseSessionId: z.string().regex(UUID_RE),
        status: z.enum(["completed", "skipped"]),
        completedSets: z.number().int().min(0).max(50),
        actualReps: z.number().int().positive().optional(),
        actualDurationSeconds: z.number().int().positive().optional(),
      })
    )
    .max(100)
    .optional(),
});

export type FinishWorkoutInput = z.infer<typeof FinishSchema>;

/**
 * Complete a workout session through the single authoritative path:
 * per-exercise results -> atomic RPC (session + plan progression +
 * notifications) -> achievement evaluation.
 *
 * Idempotent: repeating the call returns the same summary without creating
 * duplicates (guarded by the database function).
 */
export async function finishWorkout(
  input: FinishWorkoutInput
): Promise<CompletionSummary & { error?: string }> {
  const parsed = FinishSchema.safeParse(input);
  if (!parsed.success) {
    return {
      alreadyCompleted: false,
      planDayCompleted: false,
      nextDayUnlocked: false,
      planCompleted: false,
      currentStreak: 0,
      calories: 0,
      newAchievements: [],
      error: "Invalid completion payload",
    };
  }

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) {
    return {
      alreadyCompleted: false,
      planDayCompleted: false,
      nextDayUnlocked: false,
      planCompleted: false,
      currentStreak: 0,
      calories: 0,
      newAchievements: [],
      error: "Not authenticated",
    };
  }

  const { sessionId, durationSeconds, weightKg, exercises } = parsed.data;

  // Persist per-exercise outcomes before finalizing (RLS scopes to owner).
  if (exercises && exercises.length > 0) {
    const now = new Date().toISOString();
    for (const ex of exercises) {
      if (ex.status === "completed") {
        await supabase
          .from("workout_exercise_sessions")
          .update({
            status: "completed",
            completed_sets: ex.completedSets,
            actual_reps: ex.actualReps ?? null,
            actual_duration_seconds: ex.actualDurationSeconds ?? null,
            completed_at: now,
            updated_at: now,
          })
          .eq("id", ex.exerciseSessionId)
          .eq("workout_session_id", sessionId);
      } else {
        await supabase
          .from("workout_exercise_sessions")
          .update({ status: "skipped", skipped_at: now, updated_at: now })
          .eq("id", ex.exerciseSessionId)
          .eq("workout_session_id", sessionId);
      }
    }
  }

  try {
    const summary = await finalizeWorkoutCompletion({
      userId: user.id,
      sessionId,
      durationSeconds,
      weightKg,
    });

    if (!summary.alreadyCompleted) {
      // Event-driven refresh: reports, plan progress, dashboard stats and
      // the unread-notification badge all derive from this completion.
      revalidatePath("/reports");
      revalidatePath("/plan");
      revalidatePath("/notifications");
      revalidatePath("/dashboard");
    }

    return summary;
  } catch (err) {
    console.error("finishWorkout failed:", err instanceof Error ? err.message : err);
    return {
      alreadyCompleted: false,
      planDayCompleted: false,
      nextDayUnlocked: false,
      planCompleted: false,
      currentStreak: 0,
      calories: 0,
      newAchievements: [],
      error: "Could not complete workout. Check your connection and try again.",
    };
  }
}
