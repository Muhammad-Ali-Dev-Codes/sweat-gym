/**
 * SWEAT weight-loss product rules — single source of truth.
 *
 * SWEAT supports weight-loss and fitness goals ONLY. There is no weight-gain
 * pathway anywhere in the product: not in onboarding, plan generation,
 * validation, reports, or recommendations. Every rule below is enforced by
 * pure, testable functions so frontend, server actions, and services share
 * exactly one meaning.
 *
 * Rules implemented here (see product spec):
 *   §2  Supported plan durations: 30 / 60 / 90 days
 *   §5  Exactly three plans: 4 kg/30 d · 8 kg/60 d · 12 kg/90 d — no fourth option
 *   §6  Exact target/duration matching; arbitrary combinations rejected
 *   §12 Hard 12 kg total planned-loss limit
 *   §3  7,700 kcal ≈ 1 kg PLANNING EQUIVALENT (estimate, never a law)
 *   §6  1,000 kcal/day exercise-recognition hard data cap
 *   §8  Planned-loss validation before plan generation
 *   §9  Low-target (BMI) safety screening
 *   §10 Zero weight-gain path: target above current weight is always rejected
 */

import { calculateBMI } from "@/lib/calories";

/** Supported plan durations, in days. */
export const SUPPORTED_PLAN_DURATIONS = [30, 60, 90] as const;
export type PlanDurationDays = (typeof SUPPORTED_PLAN_DURATIONS)[number];

/** Safety/planning cap: maximum planned loss per 30 days (4 kg). */
const MAX_LOSS_KG_PER_30_DAYS = 4;

/**
 * §5 The ONLY supported plans. SWEAT has exactly three tiers and no others:
 *   4 kg → 30 days · 8 kg → 60 days · 12 kg → 90 days.
 * Every surface (onboarding UI, server validation, plan generation, tests)
 * must derive from this single configuration — never re-declare the mapping.
 */
export interface SupportedPlan {
  /** Planned weight loss in kg (exact tier). */
  lossKg: 4 | 8 | 12;
  /** Plan length in days (exact tier). */
  durationDays: PlanDurationDays;
}

export const SUPPORTED_PLANS: readonly [SupportedPlan, SupportedPlan, SupportedPlan] = [
  { lossKg: 4, durationDays: 30 },
  { lossKg: 8, durationDays: 60 },
  { lossKg: 12, durationDays: 90 },
];

/** Hard product boundary: no plan anywhere may target more than 12 kg. */
export const ABSOLUTE_MAX_PLANNED_LOSS_KG = 12;

/**
 * §6 Exact matching rule: the planned loss must correspond to exactly one
 * supported tier. Returns that tier, or null for anything unsupported
 * (2 kg, 3 kg, 5 kg, 10 kg, >12 kg, …). Zero is not a tier here — a zero-loss
 * goal is a non-loss fitness goal handled separately by the validators.
 */
export function resolvePlanForLoss(
  plannedLossKg: number,
  toleranceKg = 0.05
): SupportedPlan | null {
  if (!Number.isFinite(plannedLossKg) || plannedLossKg <= 0) return null;
  return (
    SUPPORTED_PLANS.find(
      (p) => Math.abs(plannedLossKg - p.lossKg) <= toleranceKg
    ) ?? null
  );
}

/**
 * §8 Map a planned loss to its required plan length (inverse lookup).
 * Returns null when the loss does not exactly match one of the three tiers.
 */
export function requiredDurationForLoss(plannedLossKg: number): PlanDurationDays | null {
  return resolvePlanForLoss(plannedLossKg)?.durationDays ?? null;
}

/**
 * §8 Maximum allowed planned loss for a plan duration.
 * `maximumAllowedLoss = (planDays / 30) × 4`
 * A planning cap, never a promise or target to hit.
 */
export function maxPlannedLossKg(planDays: number): number {
  return (planDays / 30) * MAX_LOSS_KG_PER_30_DAYS;
}

/**
 * §3 Planning approximation: 7,700 kcal ≈ 1 kg.
 * Strictly an ESTIMATE for planning math — real weight change is dynamic.
 */
export const PLANNING_KCAL_PER_KG = 7700;

/**
 * §3 Daily planning deficit implied by a tier (loss over duration):
 *   4 kg/30 d · 8 kg/60 d · 12 kg/90 d all resolve to ≈ 1,027 kcal/day.
 * This is the TOTAL daily deficit (nutrition + activity combined) used for
 * pacing communication ONLY. It is never a single workout's burn and never
 * a guarantee. Returns null for non-loss (fitness) plans.
 */
export function plannedDailyDeficitKcal(
  plannedLossKg: number,
  durationDays: number
): number | null {
  if (
    !Number.isFinite(plannedLossKg) ||
    !Number.isFinite(durationDays) ||
    plannedLossKg <= 0 ||
    durationDays <= 0
  ) {
    return null;
  }
  return Math.round((plannedLossKg * PLANNING_KCAL_PER_KG) / durationDays);
}

/**
 * Product rule: every plan day is a fixed one-hour session worth
 * 1,100 kcal. The burn rate is uniform and derived from these two
 * numbers — change the hour's value here and everything follows.
 */
export const DAILY_SESSION_TARGET_SECONDS = 3600;
export const DAILY_SESSION_TARGET_KCAL = 1100;

/** Estimated burn for a session of the given length at the uniform rate. */
export function estimateSessionBurnKcal(
  durationSeconds: number = DAILY_SESSION_TARGET_SECONDS
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return Math.round(
    (durationSeconds * DAILY_SESSION_TARGET_KCAL) / DAILY_SESSION_TARGET_SECONDS
  );
}

/**
 * §3/§5 Convert a cumulative ESTIMATED energy deficit into a planning
 * equivalent in kg. This is NOT actual fat loss and must always be labeled
 * as an estimate in UI ("Estimated planning equivalent: ~X kg").
 */
export function planningEquivalentKg(
  cumulativeEstimatedDeficitKcal: number
): number {
  if (!Number.isFinite(cumulativeEstimatedDeficitKcal) || cumulativeEstimatedDeficitKcal <= 0) {
    return 0;
  }
  return cumulativeEstimatedDeficitKcal / PLANNING_KCAL_PER_KG;
}

/**
 * Exercise calories are tracked as the actual estimated burn for each session.
 * The app does not truncate values at a daily cap because the dashboard and
 * reports should reflect the user's true workout effort.
 */
export const EXERCISE_KCAL_DAILY_CAP = Number.POSITIVE_INFINITY;

/**
 * Recognized exercise contribution for a session, preserving the estimate as-is.
 * Any per-day aggregation happens in the reporting layer based on the actual
 * session totals, without forcing a synthetic 1,000 kcal ceiling.
 */
export function recognizeExerciseCalories(
  estimatedKcal: number,
  alreadyRecognizedTodayKcal = 0
): number {
  if (!Number.isFinite(estimatedKcal) || estimatedKcal <= 0) return 0;
  return Math.round(estimatedKcal);
}

/**
 * §6/§7 Cap a series of completed sessions per LOCAL day and return the
 * day-keyed recognized exercise energy. Exercise calories are NOT total
 * expenditure and NOT an energy deficit — this only caps what the app
 * recognizes from workouts.
 */
export function recognizedExerciseKcalByDay(
  sessions: readonly {
    completed_at: string | null;
    estimated_calories: number | null;
  }[],
  getDayKey: (completedAt: string) => string
): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const day = getDayKey(s.completed_at);
    const already = byDay.get(day) ?? 0;
    byDay.set(
      day,
      already + recognizeExerciseCalories(s.estimated_calories ?? 0, already)
    );
  }
  return byDay;
}

/** BMI screening floor for weight-loss targets (adult screening measure). */
export const MIN_TARGET_BMI = 18.5;

export const REJECT_ABOVE_CURRENT_MESSAGE =
  "SWEAT currently supports weight-loss and fitness plans only. Please choose a target weight at or below your current weight.";

export const REJECT_LOW_BMI_MESSAGE =
  "That target weight is below a healthy range for your height. Please choose a higher target weight. (BMI is a screening measure, not a diagnosis.)";

export function rejectPlannedLossMessage(planDays: number): string {
  const max = maxPlannedLossKg(planDays);
  const advice =
    planDays >= Math.max(...SUPPORTED_PLAN_DURATIONS)
      ? "Please choose a closer target weight."
      : "Please choose a longer plan duration or a closer target weight.";
  return `A ${planDays}-day plan supports a maximum planned loss of ${max} kg. ${advice}`;
}

export const REJECT_UNSUPPORTED_COMBO_MESSAGE =
  "SWEAT supports exactly three plans: 4 kg in 30 days, 8 kg in 60 days, or 12 kg in 90 days. Please choose one of them.";

export const REJECT_MAX_LOSS_MESSAGE =
  "SWEAT supports a maximum planned weight loss of 12 kg. Choose the 4 kg, 8 kg, or 12 kg plan.";

export type TargetValidation =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "above-current"
        | "low-bmi"
        | "unsupported-combo"
        | "max-loss"
        | "planned-loss-cap";
      message: string;
    };

/**
 * §8/§9/§10 Validate a weight-loss target BEFORE generating a plan.
 *
 * Order matters:
 *   1. targetWeight > currentWeight  → hard reject (no weight-gain pathway,
 *      the target is never silently modified)
 *   2. target BMI below screening floor → reject low target
 *   3. plannedLoss must map EXACTLY to the selected duration's tier
 *      (4/30 · 8/60 · 12/90). A zero loss is valid as a non-loss fitness
 *      goal with any supported duration.
 *
 * currentWeight === targetWeight is VALID here (§10): it becomes a
 * non-loss fitness goal, not a weight-loss target.
 */
export function validateTargetWeight(input: {
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  planDays: number;
}): TargetValidation {
  return validatePlanSelection({
    currentWeightKg: input.currentWeightKg,
    targetWeightKg: input.targetWeightKg,
    heightCm: input.heightCm,
    planDurationDays: input.planDays,
  });
}

/**
 * §5/§6/§9/§12 Authoritative validation of a full plan selection.
 * The backend calls this — never trust duration/target from the browser.
 */
export function validatePlanSelection(input: {
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  planDurationDays: number;
}): TargetValidation {
  const { currentWeightKg, targetWeightKg, heightCm, planDurationDays } = input;

  // §10 Absolute direction rule.
  if (targetWeightKg > currentWeightKg) {
    return { ok: false, reason: "above-current", message: REJECT_ABOVE_CURRENT_MESSAGE };
  }

  // §9 Low-target safety screen.
  const targetBmi = calculateBMI(targetWeightKg, heightCm);
  if (targetBmi < MIN_TARGET_BMI) {
    return { ok: false, reason: "low-bmi", message: REJECT_LOW_BMI_MESSAGE };
  }

  if (!isSupportedPlanDuration(planDurationDays)) {
    return { ok: false, reason: "unsupported-combo", message: REJECT_UNSUPPORTED_COMBO_MESSAGE };
  }

  const plannedLoss = round1(currentWeightKg - targetWeightKg);

  // §10 Zero loss = non-loss fitness goal; any supported duration works.
  if (plannedLoss <= 0) return { ok: true };

  // §12 Hard 12 kg product boundary.
  if (plannedLoss > ABSOLUTE_MAX_PLANNED_LOSS_KG) {
    return { ok: false, reason: "max-loss", message: REJECT_MAX_LOSS_MESSAGE };
  }

  // §6 Exact tier matching — no arbitrary combinations.
  const tier = resolvePlanForLoss(plannedLoss);
  if (!tier || tier.durationDays !== planDurationDays) {
    return { ok: false, reason: "unsupported-combo", message: REJECT_UNSUPPORTED_COMBO_MESSAGE };
  }

  return { ok: true };
}

/** Round to one decimal (slider granularity) so 65.5 − 61.5 style inputs match tiers exactly. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Type guard for supported durations. */
export function isSupportedPlanDuration(days: number): days is PlanDurationDays {
  return (SUPPORTED_PLAN_DURATIONS as readonly number[]).includes(days);
}

/**
 * §13 The three plan choices rendered in onboarding, resolved against the
 * user's current weight: each card carries its exact target weight and
 * whether it passes the BMI safety screen at the user's height.
 * This is the ONLY source of plan options — the UI must not invent values.
 */
export function buildPlanOptions(input: {
  currentWeightKg: number;
  heightCm: number;
}): {
  lossKg: number;
  durationDays: PlanDurationDays;
  targetWeightKg: number;
  available: boolean;
  unavailableReason: string | null;
}[] {
  const { currentWeightKg, heightCm } = input;
  return SUPPORTED_PLANS.map((p) => {
    const targetWeightKg = round1(currentWeightKg - p.lossKg);
    const bmi = calculateBMI(targetWeightKg, heightCm);
    if (bmi < MIN_TARGET_BMI) {
      return {
        ...p,
        targetWeightKg,
        available: false,
        unavailableReason: REJECT_LOW_BMI_MESSAGE,
      };
    }
    return { ...p, targetWeightKg, available: true, unavailableReason: null };
  });
}
