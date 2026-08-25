import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { finalizeWorkoutCompletion } from "@/services/workout/completion";
import { getVerifiedUser } from "@/lib/supabase/auth-user";
import { rateLimit } from "@/lib/rate-limit";

/** Sync ops are small writes; 60/min per user is far above real usage. */
const SYNC_OPS_PER_MINUTE = 60;
const SYNC_WINDOW_MS = 60_000;

const SyncPayloadSchema = z.object({
  operationId: z.string().min(8).max(128),
  operationType: z.enum([
    "WORKOUT_COMPLETED",
    "START_WORKOUT",
    "EXERCISE_COMPLETED",
    "EXERCISE_SKIPPED",
  ]),
  payload: z.unknown(),
});

const isoOrParsable = z
  .string()
  .max(64)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid timestamp");

const WorkoutCompletedSchema = z.object({
  workoutSessionId: z.string().uuid(),
  workoutId: z.string().uuid(),
  source: z.enum(["plan", "discover"]),
  userPlanDayId: z.string().uuid().nullish(),
  startedAt: isoOrParsable,
  completedAt: isoOrParsable,
  durationSeconds: z.number().int().positive().max(60 * 60 * 6),
  estimatedCalories: z.number().int().nonnegative().max(100_000),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().uuid(),
        workoutExerciseId: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "completed", "skipped"]),
        completedSets: z.number().int().min(0).max(50),
        actualReps: z.number().optional(),
        actualDurationSeconds: z.number().optional(),
      })
    )
    .max(100),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // Fail-closed: a sync op is a write, so the offline-tolerant identity
  // fallback must never apply here.
  const user = await getVerifiedUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limit = rateLimit(
    `sync:${user.id}`,
    SYNC_OPS_PER_MINUTE,
    SYNC_WINDOW_MS
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sync operations" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedBody = SyncPayloadSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Malformed sync payload" },
      { status: 400 }
    );
  }

  const { operationId, operationType, payload } = parsedBody.data;

  try {
    switch (operationType) {
      case "WORKOUT_COMPLETED": {
        const parsed = WorkoutCompletedSchema.safeParse(payload);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Invalid WORKOUT_COMPLETED payload" },
            { status: 400 }
          );
        }
        const p = parsed.data;

        // Replay guard: if this session was already finalized by a previous
        // delivery of the same operation, do not rewind or duplicate anything.
        const { data: existing } = await supabase
          .from("workout_sessions")
          .select("id, status")
          .eq("id", p.workoutSessionId)
          .maybeSingle();

        if (existing?.status === "completed") {
          break;
        }

        // Plan-day guard: a queued completion may only advance a plan day
        // that (a) belongs to the caller — RLS scopes the SELECT to the
        // owner's plans — and (b) is not locked. This blocks a crafted
        // payload from skipping ahead to future days via the sync path.
        if (p.userPlanDayId) {
          const { data: syncDay } = await supabase
            .from("user_plan_days")
            .select("id, status")
            .eq("id", p.userPlanDayId)
            .maybeSingle();

          if (!syncDay || syncDay.status === "locked") {
            return NextResponse.json(
              { error: "Invalid plan day for completion" },
              { status: 400 }
            );
          }
        }

        // 1. Persist the session row (client-generated UUID makes this
        //    idempotent by primary key; the queue operation id doubles as
        //    client_operation_id so replays of the SAME queued op collapse
        //    at the unique-index level as well).
        const { error: sessionErr } = await supabase
          .from("workout_sessions")
          .upsert(
            {
              id: p.workoutSessionId,
              user_id: user.id,
              workout_id: p.workoutId,
              source: p.source,
              user_plan_day_id: p.userPlanDayId ?? null,
              started_at: p.startedAt,
              completed_at: p.completedAt,
              duration_seconds: p.durationSeconds,
              estimated_calories: p.estimatedCalories,
              status: "in_progress",
              client_operation_id: operationId,
            },
            { onConflict: "id" }
          );

        if (sessionErr) {
          throw new Error(`Session upsert failed: ${sessionErr.message}`);
        }

        // 2. Persist per-exercise outcomes.
        for (const ex of p.exercises) {
          const { error: exErr } = await supabase
            .from("workout_exercise_sessions")
            .upsert(
              {
                workout_session_id: p.workoutSessionId,
                workout_exercise_id: ex.workoutExerciseId,
                status: ex.status,
                completed_sets: ex.completedSets,
                actual_reps: ex.actualReps ?? null,
                actual_duration_seconds: ex.actualDurationSeconds ?? null,
              },
              { onConflict: "workout_session_id,workout_exercise_id" }
            );

          if (exErr) {
            throw new Error(`Exercise upsert failed: ${exErr.message}`);
          }
        }

        // 3. Run the SAME authoritative completion path as the online flow:
        //    atomic RPC (plan progression, notifications) + achievements.
        const summary = await finalizeWorkoutCompletion({
          userId: user.id,
          sessionId: p.workoutSessionId,
          durationSeconds: p.durationSeconds,
        });

        // Post-sync refresh so reports/plan/dashboard reflect the synced
        // workout on the client's next navigation.
        if (!summary.alreadyCompleted) {
          revalidatePath("/reports");
          revalidatePath("/plan");
          revalidatePath("/notifications");
          revalidatePath("/dashboard");
        }

        break;
      }

      // Accepted for protocol compatibility; start/step events are captured
      // client-side and persisted in bulk at completion time.
      case "START_WORKOUT":
      case "EXERCISE_COMPLETED":
      case "EXERCISE_SKIPPED": {
        break;
      }
    }

    return NextResponse.json({ ok: true, operationId });
  } catch (err) {
    // Log the detail server-side only; the client gets a generic message so
    // database internals are never reflected in API responses.
    console.error("Sync operation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
