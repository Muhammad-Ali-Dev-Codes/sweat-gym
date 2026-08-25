import { createClient } from "@/lib/supabase/server";
import type { UserPlan, UserPlanDay, PlanTemplateDay } from "@/lib/types/database";
import { getLocalDayKey, getLocalToday } from "@/lib/dates";
import {
  inferGoal,
  scoreWorkouts,
  type LevelSlug,
  type ScorableWorkout,
} from "@/lib/personalization/scoring";
import {
  DAILY_SESSION_TARGET_SECONDS,
  estimateSessionBurnKcal,
  isSupportedPlanDuration,
  resolvePlanForLoss,
  SUPPORTED_PLANS,
  type PlanDurationDays,
} from "@/lib/weight-loss";
import {
  composeDayBlocks,
  type ComposedBlock,
} from "@/lib/plan-blocks";

export async function getActivePlan(userId: string): Promise<UserPlan | null> {
  const supabase = await createClient();
  // Tolerant read: newest active row wins. The unique partial index added in
  // migration 0027 makes duplicates impossible going forward; this keeps
  // legacy databases rendering instead of erroring (.single() would throw
  // on >1 rows and blank the dashboard).
  const { data } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as UserPlan) ?? null;
}

export async function getPlanDays(userPlanId: string): Promise<UserPlanDay[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_plan_days")
    .select("*")
    .eq("user_plan_id", userPlanId)
    .order("day_number");

  return (data as UserPlanDay[]) ?? [];
}

export async function getCurrentPlanDay(userId: string): Promise<UserPlanDay | null> {
  const plan = await getActivePlan(userId);
  if (!plan) return null;

  const { data } = await createClient().then(s => s
    .from("user_plan_days")
    .select("*")
    .eq("user_plan_id", plan.id)
    .eq("status", "available")
    .order("day_number")
    .limit(1)
    .single()
  );

  return (data as UserPlanDay) ?? null;
}

export async function getPlanDayWithWorkout(dayId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_plan_days")
    .select(`
      *,
      workouts (
        id, name, slug, description, duration_seconds, estimated_calories,
        workout_exercises (
          id, exercise_order, sets, reps, duration_seconds, rest_seconds,
          exercises (
            id, name, animation_url, instructions, exercise_mode,
            is_low_impact, requires_jumping
          )
        )
      )
    `)
    .eq("id", dayId)
    .single();

  return data;
}

// ---------------------------------------------------------------------------
// Personalized generation
// ---------------------------------------------------------------------------

interface CatalogEntry extends ScorableWorkout {
  duration_seconds: number;
  estimated_calories: number;
}

interface PersonalizationInputs {
  goal: ReturnType<typeof inferGoal>;
  fitnessLevel: LevelSlug;
  /** Median completed-session length once real history exists; null before that. */
  preferredDurationSeconds: number | null;
  /** Supported plan length: 30 / 60 / 90 days (§2). */
  planDurationDays: PlanDurationDays;
}

async function loadPersonalizationInputs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<PersonalizationInputs | null> {
  const { data: fp } = await supabase
    .from("fitness_profiles")
    .select("fitness_level, target_weight_kg, plan_duration_days")
    .eq("user_id", userId)
    .maybeSingle();
  if (!fp) return null;

  const [weightResult, durationsResult] = await Promise.all([
    supabase
      .from("weight_entries")
      .select("weight_kg")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("duration_seconds")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  const completedDurations = ((durationsResult.data as { duration_seconds: number | null }[] | null) ?? [])
    .map((r) => r.duration_seconds ?? 0)
    .filter((d) => d > 0)
    .sort((a, b) => a - b);

  // Pace preference needs REAL evidence: with fewer than 3 completed
  // sessions there is nothing to personalize, so days keep the template's
  // own full duration instead of collapsing toward a 10-minute default.
  const preferredDurationSeconds =
    completedDurations.length >= 3
      ? completedDurations[Math.floor(completedDurations.length / 2)]
      : null;

  return {
    goal: inferGoal(
      weightResult.data?.weight_kg != null ? Number(weightResult.data.weight_kg) : null,
      fp.target_weight_kg != null ? Number(fp.target_weight_kg) : null
    ),
    fitnessLevel: fp.fitness_level as LevelSlug,
    preferredDurationSeconds,
    planDurationDays: isSupportedPlanDuration(Number(fp.plan_duration_days))
      ? (Number(fp.plan_duration_days) as PlanDurationDays)
      : 30,
  };
}

/**
 * Choose the workout for a plan day.
 *
 * Same-level workouts (including the template's own) are ranked by the
 * personalization engine into a rotating pool: day N picks
 * pool[N % poolSize], keeping variety deterministic and biased toward the
 * user's goal and preferred pace.
 *
 * §31 Progression: 60/90-day plans move through phases — early days draw
 * from the lower-scored half of the pool (foundation), later days from the
 * stronger end (conditioning / advanced consistency). 30-day plans rotate
 * the whole pool as before.
 */
function pickDayWorkout(
  dayNumber: number,
  totalDays: number,
  pool: { entry: CatalogEntry; score: number }[]
): string {
  const usable = pool.filter((p) => p.score >= 30); // baseline relevance gate
  if (usable.length === 0) return "";

  const sorted = [...usable].sort((a, b) => a.score - b.score);
  const phaseCount = totalDays > 30 ? 3 : 1;
  const phase = Math.min(
    phaseCount - 1,
    Math.floor(((dayNumber - 1) / totalDays) * phaseCount)
  );
  const perPhase = Math.max(1, Math.ceil(sorted.length / phaseCount));
  const phasePool =
    sorted.slice(phase * perPhase, (phase + 1) * perPhase).length > 0
      ? sorted.slice(phase * perPhase, (phase + 1) * perPhase)
      : sorted;

  return phasePool[(dayNumber - 1) % Math.min(phasePool.length, 5)].entry.id;
}

/** The plan configuration a generated plan must encode. */
export interface PlanSelection {
  durationDays: PlanDurationDays;
  /** Planned-loss tier: 0 (fitness goal) or exactly 4 / 8 / 12. */
  plannedLossKg: number;
  startingWeightKg: number | null;
  targetWeightKg: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Rebuild a selection from stored data — used for recovery and
 * "start a new plan" flows where the user is NOT making a fresh choice.
 * The most recent plan's own tier/duration wins (that was the explicit
 * onboarding choice); otherwise infer from the fitness profile.
 */
async function derivePlanSelection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<PlanSelection> {
  const [{ data: fp }, { data: latestWeight }, { data: previousPlans }] =
    await Promise.all([
      supabase
        .from("fitness_profiles")
        .select("target_weight_kg, plan_duration_days")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("weight_entries")
        .select("weight_kg")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("user_plans")
        .select("plan_duration_days, planned_loss_kg, starting_weight_kg")
        .eq("user_id", userId)
        .neq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1),
    ]);

  const startWeight =
    latestWeight?.weight_kg != null
      ? Number(latestWeight.weight_kg)
      : previousPlans?.[0]?.starting_weight_kg != null
        ? Number(previousPlans[0].starting_weight_kg)
        : null;

  // Explicit prior choice beats inference every time.
  const prev = previousPlans?.[0];
  const prevDuration = Number(prev?.plan_duration_days ?? 0);
  if (
    prev &&
    isSupportedPlanDuration(prevDuration) &&
    Number(prev.planned_loss_kg) > 0 &&
    resolvePlanForLoss(Number(prev.planned_loss_kg))?.durationDays === prevDuration
  ) {
    return finalizeSelection(startWeight, prevDuration, Number(prev.planned_loss_kg));
  }

  const fpDuration = Number(fp?.plan_duration_days ?? 30);
  const duration: PlanDurationDays = isSupportedPlanDuration(fpDuration) ? fpDuration : 30;

  const rawLoss =
    startWeight != null && fp?.target_weight_kg != null
      ? round1(startWeight - Number(fp.target_weight_kg))
      : 0;
  let loss: number;
  if (startWeight == null) {
    // No weigh-ins yet — nothing to compare against, so restore the tier
    // that matches the stored duration (validated when onboarding chose it).
    // A missing target means a non-loss fitness goal.
    loss =
      fp?.target_weight_kg != null
        ? SUPPORTED_PLANS.find((p) => p.durationDays === duration)?.lossKg ?? 0
        : 0;
  } else {
    const exactTier = resolvePlanForLoss(rawLoss);
    loss =
      exactTier && exactTier.durationDays === duration
        ? rawLoss
        : rawLoss <= 0
          ? 0
          : SUPPORTED_PLANS.find((p) => p.durationDays === duration)?.lossKg ?? 0;
  }

  return finalizeSelection(startWeight, duration, loss);
}

function finalizeSelection(
  startingWeightKg: number | null,
  durationDays: PlanDurationDays,
  plannedLossKg: number
): PlanSelection {
  const loss = plannedLossKg > 0 ? plannedLossKg : 0;
  return {
    durationDays,
    plannedLossKg: loss,
    startingWeightKg,
    targetWeightKg:
      startingWeightKg != null ? round1(startingWeightKg - loss) : null,
  };
}

export async function generateUserPlan(
  userId: string,
  selection?: PlanSelection
): Promise<{ success: boolean; planId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: activePlan } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection) {
    // No explicit choice in play: an existing active plan IS the answer.
    // §19 Never regenerate merely because a screen loaded.
    if (activePlan) return { success: true, planId: activePlan.id };
    selection = await derivePlanSelection(supabase, userId);
  } else if (activePlan) {
    // §28 Idempotency with reconciliation: same config → keep the plan and
    // its progress. A genuinely different selection replaces it ONCE, here —
    // not on every dashboard load or login.
    if (Number(activePlan.plan_duration_days) === selection.durationDays) {
      return { success: true, planId: activePlan.id };
    }
    const { error: archiveError } = await supabase
      .from("user_plans")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", activePlan.id)
      .eq("status", "active");
    if (archiveError) return { success: false, error: archiveError.message };
  }

  const inputs = await loadPersonalizationInputs(supabase, userId);
  if (!inputs) return { success: false, error: "No fitness profile found" };

  const { data: level } = await supabase
    .from("levels")
    .select("id")
    .eq("slug", inputs.fitnessLevel)
    .single();

  if (!level) return { success: false, error: "Invalid fitness level" };

  const { data: template } = await supabase
    .from("plan_templates")
    .select("id")
    .eq("is_active", true)
    .eq("fitness_level_id", level.id)
    .limit(1)
    .maybeSingle();

  if (!template) return { success: false, error: "No active plan template found" };

  // Catalog with levels + categories for goal-aware substitution.
  const [catalogResult, daysResult] = await Promise.all([
    supabase
      .from("workouts")
      .select(`
        id, name, duration_seconds, estimated_calories,
        workout_category_map ( workout_categories ( slug ) ),
        workout_levels ( levels ( slug ) )
      `)
      .eq("is_active", true),
    supabase
      .from("plan_template_days")
      .select("*")
      .eq("plan_template_id", template.id)
      .order("day_number"),
  ]);

  interface CatalogRow {
    id: string;
    duration_seconds: number;
    estimated_calories: number;
    workout_category_map: { workout_categories: { slug: string } | null }[];
    workout_levels: { levels: { slug: string } | null }[];
  }

  const catalogRows = (catalogResult.data as unknown as CatalogRow[] | null) ?? [];
  const catalog: CatalogEntry[] = catalogRows.map((row) => ({
    id: row.id,
    duration_seconds: row.duration_seconds,
    estimated_calories: row.estimated_calories,
    categories: row.workout_category_map
      .map((c) => c.workout_categories?.slug)
      .filter((s): s is string => Boolean(s)),
    level: (row.workout_levels[0]?.levels?.slug as LevelSlug | undefined) ?? null,
  }));

  // Same-level candidates ranked for this user's goal + pace.
  const scoredPool = scoreWorkouts(
    catalog.filter((c) => c.level === inputs.fitnessLevel),
    {
      fitnessLevel: inputs.fitnessLevel,
      goal: inputs.goal,
      preferredDurationSeconds: inputs.preferredDurationSeconds,
      favoriteWorkoutIds: new Set<string>(),
      recentCompletedWorkoutIds: [],
    }
  ).map((s) => ({ entry: s.item as CatalogEntry, score: s.score }));

  const templateDays = (daysResult.data as PlanTemplateDay[] | null) ?? [];
  if (templateDays.length === 0) {
    return { success: false, error: "No template days found" };
  }

  const durationDays = isSupportedPlanDuration(selection.durationDays)
    ? selection.durationDays
    : 30;

  // §2 Supported plan durations: tile the 30-day template to fill 60/90-day
  // plans. Day numbers continue across cycles so pacing and rotation flow.
  // §29/§30 Exactly durationDays rows are produced and verified below.
  const plannedDays: PlanTemplateDay[] = [];
  for (let day = 1; day <= durationDays; day++) {
    const templateDay = templateDays[(day - 1) % templateDays.length];
    plannedDays.push({ ...templateDay, day_number: day });
  }

  // §10 Absolute product rule — never generate a plan toward a weight-gain
  // target. Valid data cannot reach this state (onboarding rejects it), so a
  // hit here means legacy/corrupt data: fail closed, never assume a gain goal.
  const { data: weightRow } = await supabase
    .from("weight_entries")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentWeightKg =
    weightRow?.weight_kg != null ? Number(weightRow.weight_kg) : selection.startingWeightKg;
  const effectiveTarget =
    selection.targetWeightKg != null &&
    Number(selection.plannedLossKg) > 0 &&
    currentWeightKg != null
      ? round1(currentWeightKg - Math.min(Number(selection.plannedLossKg), 12))
      : selection.targetWeightKg;
  if (
    currentWeightKg != null &&
    effectiveTarget != null &&
    effectiveTarget > currentWeightKg
  ) {
    return {
      success: false,
      error:
        "SWEAT currently supports weight-loss and fitness plans only. Please choose a target weight at or below your current weight.",
    };
  }

  const now = new Date().toISOString();
  const { data: plan, error: planError } = await supabase
    .from("user_plans")
    .insert({
      user_id: userId,
      plan_template_id: template.id,
      plan_duration_days: durationDays,
      planned_loss_kg: Math.max(0, Math.min(Number(selection.plannedLossKg) || 0, 12)),
      starting_weight_kg: selection.startingWeightKg,
      target_weight_kg: effectiveTarget,
      status: "active",
      started_at: now,
    })
    .select("id")
    .single();

  if (planError || !plan) return { success: false, error: planError?.message };

  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const blockPool = scoredPool.map((s) => ({
    id: s.entry.id,
    durationSeconds: s.entry.duration_seconds,
  }));

  const dayRows: {
    user_plan_id: string;
    day_number: number;
    workout_id: string;
    target_duration_seconds: number;
    target_calories: number;
    status: string;
    unlocked_at: string | null;
  }[] = [];
  // Blocks per day, keyed by day_number, inserted after the days land.
  const blocksByDay = new Map<number, ComposedBlock[]>();

  for (const td of plannedDays) {
    // Phase-biased pick opens the day; composition then fills the hour
    // with different videos back-to-back (never repeating until the pool
    // is spent). The day's workout_id stays the FIRST block so the
    // player, sessions, and reports keep working unchanged.
    const chosenId =
      pickDayWorkout(td.day_number, durationDays, scoredPool) || td.workout_id;
    const orderedPool = [
      { id: chosenId, durationSeconds: catalogById.get(chosenId)?.duration_seconds ?? DAILY_SESSION_TARGET_SECONDS },
      ...blockPool.filter((b) => b.id !== chosenId),
    ];
    const blocks = composeDayBlocks(orderedPool, td.day_number);
    const finalBlocks: ComposedBlock[] =
      blocks.length > 0
        ? blocks
        : [
            {
              position: 1,
              workoutId: chosenId,
              durationSeconds: DAILY_SESSION_TARGET_SECONDS,
              calories: estimateSessionBurnKcal(DAILY_SESSION_TARGET_SECONDS),
            },
          ];

    blocksByDay.set(
      td.day_number,
      finalBlocks
    );
    dayRows.push({
      user_plan_id: plan.id,
      day_number: td.day_number,
      workout_id: finalBlocks[0].workoutId,
      target_duration_seconds: DAILY_SESSION_TARGET_SECONDS,
      // Uniform burn rate over a full hour — exact by construction.
      target_calories: estimateSessionBurnKcal(DAILY_SESSION_TARGET_SECONDS),
      status: td.day_number === 1 ? "available" : "locked",
      unlocked_at: td.day_number === 1 ? now : null,
    });
  }

  const inserted = await supabase
    .from("user_plan_days")
    .insert(dayRows)
    .select("id,day_number");

  const daysError = inserted.error;
  // §30 Verify the persisted day count equals the plan length before
  // reporting success — never surface a half-built plan.
  if (daysError || (inserted.data?.length ?? 0) !== durationDays) {
    await supabase.from("user_plans").delete().eq("id", plan.id);
    return {
      success: false,
      error: daysError?.message ?? "Plan days did not persist completely",
    };
  }

  // Persist the composed sequences for every day.
  const blockRows = ((inserted.data as { id: string; day_number: number }[] | null) ?? []).flatMap(
    (d) =>
      (blocksByDay.get(d.day_number) ?? []).map((b) => ({
        user_plan_day_id: d.id,
        workout_id: b.workoutId,
        position: b.position,
        duration_seconds: b.durationSeconds,
        calories: b.calories,
      }))
  );
  if (blockRows.length > 0) {
    const { error: blocksError } = await supabase
      .from("user_plan_day_blocks")
      .insert(blockRows);
    if (blocksError) {
      await supabase.from("user_plans").delete().eq("id", plan.id);
      return { success: false, error: blocksError.message };
    }
  }

  return { success: true, planId: plan.id };
}

export async function unlockNextDay(userPlanId: string, completedDayNumber: number): Promise<void> {
  const supabase = await createClient();
  const nextDayNumber = completedDayNumber + 1;

  // Plans can be 30, 60, or 90 days long — stop at the plan's own length.
  const { data: plan } = await supabase
    .from("user_plan_days")
    .select("day_number")
    .eq("user_plan_id", userPlanId)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const maxDay = plan?.day_number ?? 30;
  if (nextDayNumber > maxDay) return;

  await supabase
    .from("user_plan_days")
    .update({
      status: "available",
      unlocked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_plan_id", userPlanId)
    .eq("day_number", nextDayNumber)
    .eq("status", "locked");
}

export async function completePlanDay(dayId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("user_plan_days")
    .update({
      status: "completed",
      completed_at: now,
      actual_activity_date: now.split("T")[0],
      updated_at: now,
    })
    .eq("id", dayId)
    .eq("status", "available");
}

/**
 * Daily pacing: the day_number that may NOT be started today because the
 * previous day was completed TODAY (user's local calendar) — one new
 * workout per calendar day so users can't binge through the plan. Returns
 * null when nothing is blocked. Repeating completed days is never blocked.
 */
export function getPacingBlockedDayNumber(
  days: Pick<UserPlanDay, "status" | "day_number" | "completed_at">[],
  timeZone: string
): number | null {
  const completed = days.filter(
    (d) => d.status === "completed" && d.completed_at
  );
  if (completed.length === 0) return null;

  const latest = completed.reduce((a, b) =>
    a.completed_at! > b.completed_at! ? a : b
  );
  if (getLocalDayKey(latest.completed_at!, timeZone) !== getLocalToday(timeZone)) {
    return null;
  }

  const nextNumber = latest.day_number + 1;
  const next = days.find((d) => d.day_number === nextNumber);
  return next && next.status !== "completed" ? nextNumber : null;
}

/**
 * UI variant: the locked day that opens tomorrow, or null.
 */
export function getGatedNextDay(
  days: Pick<UserPlanDay, "status" | "day_number" | "completed_at">[],
  timeZone: string
): number | null {
  const blocked = getPacingBlockedDayNumber(days, timeZone);
  if (blocked === null) return null;
  const day = days.find((d) => d.day_number === blocked);
  return day && day.status === "locked" ? blocked : null;
}

export type LockedDayDecision = "unlock" | "same-day" | "prev-incomplete";

/**
 * Decide whether a LOCKED plan day may open right now, purely from the
 * user's local calendar: completing day N opens day N+1 on the NEXT
 * calendar day.
 *
 *  - previous day completed before today -> "unlock" (its window arrived)
 *  - previous day completed today        -> "same-day" (daily pacing holds)
 *  - previous day missing / not completed -> "prev-incomplete"
 */
export function decideLockedDayStart(
  prevDay: Pick<UserPlanDay, "status" | "completed_at"> | null,
  timeZone: string,
  todayKey: string = getLocalToday(timeZone)
): LockedDayDecision {
  if (!prevDay || prevDay.status !== "completed" || !prevDay.completed_at) {
    return "prev-incomplete";
  }
  return getLocalDayKey(prevDay.completed_at, timeZone) === todayKey
    ? "same-day"
    : "unlock";
}

/**
 * Self-heals a stalled progression: if no day is actionable (available /
 * in_progress) but the plan isn't finished, unlock the next locked day.
 *
 * Also enforces DAILY PACING: the completion RPC unlocks day N+1
 * immediately, but it must only become available on the NEXT calendar day.
 * When today's workout is already done, this re-locks a same-day unlock and
 * skips healing until tomorrow.
 *
 * Covers cases where the completion RPC's unlock step never landed —
 * offline sync gaps, legacy completion paths, or partial failures — which
 * left every day locked (e.g. day 1 completed but day 2 still locked).
 */
export async function repairPlanProgression(
  userId: string,
  timeZone?: string | null
): Promise<void> {
  try {
    const plan = await getActivePlan(userId);
    if (!plan) return;

    let tz = timeZone || null;
    if (!tz) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", userId)
        .single();
      tz = (data as { timezone?: string } | null)?.timezone || "UTC";
    }

    const days = await getPlanDays(plan.id);
    if (days.length === 0) return;

    // ---- Orphaned-session sweep --------------------------------------------
    // A session still 'in_progress' but already carrying completed_at is a
    // crash / failed-sync orphan (the completion RPC never ran). Left alone
    // it strands its plan day in in_progress forever — the next day never
    // opens. Close the orphan and hand the day back. Sessions without
    // completed_at stay resumable (the 24h sweep in startWorkout owns those).
    const supabase = await createClient();
    const { data: orphanSessions } = await supabase
      .from("workout_sessions")
      .select("id, user_plan_day_id")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .not("completed_at", "is", null);

    if (orphanSessions && orphanSessions.length > 0) {
      await supabase
        .from("workout_sessions")
        .update({ status: "abandoned", updated_at: new Date().toISOString() })
        .in("id", orphanSessions.map((s) => s.id));

      const orphanDayIds = orphanSessions
        .map((s) => s.user_plan_day_id)
        .filter((id): id is string => Boolean(id));

      if (orphanDayIds.length > 0) {
        await supabase
          .from("user_plan_days")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .in("id", orphanDayIds)
          .eq("status", "in_progress");
        // Re-read so the pacing gate below sees the healed state.
        const healed = await getPlanDays(plan.id);
        days.splice(0, days.length, ...healed);
      }
    }

    // ---- Daily pacing gate -------------------------------------------------
    const blockedNumber = getPacingBlockedDayNumber(days, tz);
    if (blockedNumber !== null) {
      const next = days.find((d) => d.day_number === blockedNumber);

      if (
        next &&
        next.status === "available" &&
        next.unlocked_at &&
        getLocalDayKey(next.unlocked_at, tz) === getLocalToday(tz)
      ) {
        // The RPC pre-unlocked the next day today — take it back until tomorrow.
        await supabase
          .from("user_plan_days")
          .update({ status: "locked", updated_at: new Date().toISOString() })
          .eq("id", next.id);
      }
      // Whether we re-locked or it was already locked: gated until tomorrow.
      return;
    }

    // ---- Stall repair ------------------------------------------------------
    const hasActionable = days.some(
      (d) => d.status === "available" || d.status === "in_progress"
    );
    if (hasActionable) return;

    // Nothing actionable — either the plan is done or progression stalled.
    const allDone = days.every((d) => d.status === "completed");
    if (allDone) {
      await supabase
        .from("user_plans")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", plan.id)
        .eq("status", "active");
      return;
    }

    const lastCompleted = Math.max(
      0,
      ...days.filter((d) => d.status === "completed").map((d) => d.day_number)
    );
    await unlockNextDay(plan.id, lastCompleted);
  } catch {
    // Repair is best-effort; never block the page render.
  }
}
