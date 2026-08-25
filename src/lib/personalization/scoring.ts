/**
 * SWEAT personalization engine — deterministic, explainable workout scoring.
 *
 * The engine is pure: it takes a user fitness context plus a workout catalog
 * and returns ranked recommendations. No network, no AI — rule-based scoring
 * that is testable and configurable. Weights live in DEFAULT_SCORING_WEIGHTS
 * and can be tuned without touching UI code.
 *
 * Signals (additive):
 *   goalMatch        preferred categories coverage for the inferred goal
 *   levelMatch       difficulty proximity to the user's fitness level
 *   durationMatch    closeness to the user's preferred session duration
 *   favoriteSignal   favorited workouts get a boost
 *   noveltyBonus     never-completed workouts get a boost
 *   repetitionPenalty recently-completed workouts are demoted
 */

export const LEVEL_ORDER = ["beginner", "intermediate", "advanced"] as const;
export type LevelSlug = (typeof LEVEL_ORDER)[number];

export type GoalSlug =
  | "fat_burning"
  | "strength"
  | "general";

/** Category slugs (from workout_categories) ranked per goal. */
export const GOAL_CATEGORY_PREFERENCE: Record<GoalSlug, string[]> = {
  fat_burning: ["fat_burning", "strength_and_tone", "stretching_and_warmup"],
  strength: ["strength_and_tone", "fat_burning", "stretching_and_warmup"],
  general: ["strength_and_tone", "fat_burning", "stretching_and_warmup"],
};

export interface ScorableWorkout {
  id: string;
  duration_seconds: number;
  /** Category slugs attached to this workout. */
  categories: readonly string[];
  /** Level slug or null when unmapped (treated as closest-to-any). */
  level: LevelSlug | null;
}

export interface UserFitnessContext {
  fitnessLevel: LevelSlug | null;
  /** Inferred or declared goal driving category preference. */
  goal: GoalSlug;
  /** Target session duration in seconds (median of history or plan target). */
  /** Median completed-session length once real history exists; null before that (no duration bias). */
  preferredDurationSeconds: number | null;
  favoriteWorkoutIds: ReadonlySet<string>;
  /** Recently completed workout ids, most recent first (max ~10). */
  recentCompletedWorkoutIds: readonly string[];
}

export interface ScoringWeights {
  base: number;
  goalMatch: number;
  levelMatch: number;
  durationMatch: number;
  favoriteSignal: number;
  noveltyBonus: number;
  repetitionPenalty: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  base: 10,
  goalMatch: 30,
  levelMatch: 25,
  durationMatch: 20,
  favoriteSignal: 10,
  noveltyBonus: 10,
  repetitionPenalty: 15,
};

/**
 * Infer a training goal from onboarding body metrics.
 *
 * SWEAT is weight-loss/fitness only: a target BELOW current weight maps to
 * fat burning; equal-or-above targets are non-loss FITNESS goals (general).
 * There is deliberately no weight-gain branch — target > current is rejected
 * at validation (§10) and can only appear through legacy/corrupt data.
 */
export function inferGoal(
  currentWeightKg: number | null,
  targetWeightKg: number | null
): GoalSlug {
  if (
    currentWeightKg == null ||
    targetWeightKg == null ||
    currentWeightKg <= 0 ||
    targetWeightKg <= 0
  ) {
    return "general";
  }
  const delta = (targetWeightKg - currentWeightKg) / currentWeightKg;
  if (delta <= -0.02) return "fat_burning";
  return "general";
}

function levelDistance(a: LevelSlug | null, b: LevelSlug | null): number {
  if (!a || !b) return -1; // unknown → neutral-ish
  return Math.abs(LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
}

export interface ScoreBreakdown {
  total: number;
  goalMatch: number;
  levelMatch: number;
  durationMatch: number;
  favoriteSignal: number;
  noveltyBonus: number;
  repetitionPenalty: number;
}

export function scoreWorkout(
  workout: ScorableWorkout,
  ctx: UserFitnessContext,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoreBreakdown {
  // --- Goal match -----------------------------------------------------
  const prefs = GOAL_CATEGORY_PREFERENCE[ctx.goal];
  let goalRatio = 0;
  for (const cat of workout.categories) {
    const rank = prefs.indexOf(cat);
    if (rank === 0) goalRatio = Math.max(goalRatio, 1);
    else if (rank > 0) goalRatio = Math.max(goalRatio, 0.5);
  }

  // --- Level match ----------------------------------------------------
  const dist = levelDistance(workout.level, ctx.fitnessLevel);
  let levelRatio: number;
  if (dist === -1) levelRatio = 0.6; // unknown level: mild fit anywhere
  else if (dist === 0) levelRatio = 1;
  else if (dist === 1) levelRatio = 0.4;
  else levelRatio = 0;

  // --- Duration match -------------------------------------------------
  // Without real session history there is no pace preference, so every
  // duration scores neutrally instead of collapsing toward short workouts.
  const pref =
    ctx.preferredDurationSeconds != null
      ? Math.max(ctx.preferredDurationSeconds, 60)
      : null;
  const durationRatio =
    pref == null ? 1 : Math.max(0, 1 - Math.abs(workout.duration_seconds - pref) / pref);

  // --- History signals ------------------------------------------------
  const isFavorite = ctx.favoriteWorkoutIds.has(workout.id);
  const recentIndex = ctx.recentCompletedWorkoutIds.indexOf(workout.id);
  const repetitionFactor =
    recentIndex === -1 ? 0 : 1 - recentIndex / Math.max(ctx.recentCompletedWorkoutIds.length, 5);

  const breakdown: ScoreBreakdown = {
    goalMatch: weights.goalMatch * goalRatio,
    levelMatch: weights.levelMatch * levelRatio,
    durationMatch: weights.durationMatch * durationRatio,
    favoriteSignal: isFavorite ? weights.favoriteSignal : 0,
    noveltyBonus: recentIndex === -1 ? weights.noveltyBonus : 0,
    repetitionPenalty: weights.repetitionPenalty * repetitionFactor,
    total: 0,
  };

  breakdown.total = Math.max(
    0,
    weights.base +
      breakdown.goalMatch +
      breakdown.levelMatch +
      breakdown.durationMatch +
      breakdown.favoriteSignal +
      breakdown.noveltyBonus -
      breakdown.repetitionPenalty
  );

  return breakdown;
}

export interface ScoredWorkout<T> {
  item: T;
  score: number;
  breakdown: Omit<ScoreBreakdown, "total">;
}

/** Score and sort a catalog (descending score; stable ties by original order). */
export function scoreWorkouts<T extends ScorableWorkout>(
  workouts: readonly T[],
  ctx: UserFitnessContext,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoredWorkout<T>[] {
  return workouts
    .map((item) => {
      const { total, ...rest } = scoreWorkout(item, ctx, weights);
      return { item, score: total, breakdown: rest };
    })
    .sort((a, b) => b.score - a.score);
}
