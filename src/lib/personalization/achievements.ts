/**
 * SWEAT achievement rules — centralized, pure, idempotent.
 *
 * `evaluateAchievements` receives aggregate stats and returns every achievement
 * key the user currently qualifies for. Persistence (insert-if-missing) is
 * handled by services/achievement; the unique constraint on
 * user_achievements(user_id, achievement_key) guarantees no duplicate awards
 * even if evaluation runs concurrently.
 *
 * `achievementProgress` powers "close to unlocking" UI by exposing the
 * metric each rule watches.
 */

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  /** Display grouping for the achievements gallery. */
  group:
    | "Getting Started"
    | "Consistency"
    | "Workouts"
    | "Calories"
    | "Time"
    | "Plans";
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    key: "first_workout",
    title: "First Rep",
    description: "Completed your very first workout.",
    group: "Getting Started",
  },
  {
    key: "streak_3",
    title: "Consistency",
    description: "Trained 3 days in a row.",
    group: "Consistency",
  },
  {
    key: "streak_7",
    title: "Week Warrior",
    description: "Trained 7 days in a row.",
    group: "Consistency",
  },
  {
    key: "streak_14",
    title: "Fortnight Flame",
    description: "Kept a streak alive for 14 days.",
    group: "Consistency",
  },
  {
    key: "workouts_10",
    title: "Double Digits",
    description: "Completed 10 workouts.",
    group: "Workouts",
  },
  {
    key: "workouts_25",
    title: "Quarter Century",
    description: "Completed 25 workouts.",
    group: "Workouts",
  },
  {
    key: "workouts_50",
    title: "Half Century",
    description: "Completed 50 workouts.",
    group: "Workouts",
  },
  {
    key: "calories_1000",
    title: "Furnace",
    description: "Burned an estimated 1,000 total calories.",
    group: "Calories",
  },
  {
    key: "calories_5000",
    title: "Inferno",
    description: "Burned an estimated 5,000 total calories.",
    group: "Calories",
  },
  {
    key: "minutes_60",
    title: "Hour of Power",
    description: "Trained for 60 total minutes.",
    group: "Time",
  },
  {
    key: "minutes_600",
    title: "Ten Hour Club",
    description: "Reached 10 hours of total training time.",
    group: "Time",
  },
  {
    key: "plan_complete",
    title: "Challenge Crusher",
    description: "Finished an entire training plan.",
    group: "Plans",
  },
] as const;

const ACHIEVEMENT_KEYS = new Set(ACHIEVEMENTS.map((a) => a.key));

export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

export interface AchievementStats {
  totalCompletedWorkouts: number;
  currentStreak: number;
  totalCalories: number;
  totalMinutes: number;
  plansCompleted: number;
}

/** Return all achievement keys currently earned for the given stats. */
export function evaluateAchievements(stats: AchievementStats): string[] {
  const keys: string[] = [];

  if (stats.totalCompletedWorkouts >= 1) keys.push("first_workout");
  if (stats.currentStreak >= 3) keys.push("streak_3");
  if (stats.currentStreak >= 7) keys.push("streak_7");
  if (stats.currentStreak >= 14) keys.push("streak_14");
  if (stats.totalCompletedWorkouts >= 10) keys.push("workouts_10");
  if (stats.totalCompletedWorkouts >= 25) keys.push("workouts_25");
  if (stats.totalCompletedWorkouts >= 50) keys.push("workouts_50");
  if (stats.totalCalories >= 1000) keys.push("calories_1000");
  if (stats.totalCalories >= 5000) keys.push("calories_5000");
  if (stats.totalMinutes >= 60) keys.push("minutes_60");
  if (stats.totalMinutes >= 600) keys.push("minutes_600");
  if (stats.plansCompleted >= 1) keys.push("plan_complete");

  // Defensive: never emit unknown keys.
  return keys.filter((k) => ACHIEVEMENT_KEYS.has(k));
}

/** Metric + threshold backing each achievement (for progress UI). */
const RULE_METRICS: Record<
  string,
  { metric: keyof AchievementStats; target: number }
> = {
  first_workout: { metric: "totalCompletedWorkouts", target: 1 },
  streak_3: { metric: "currentStreak", target: 3 },
  streak_7: { metric: "currentStreak", target: 7 },
  streak_14: { metric: "currentStreak", target: 14 },
  workouts_10: { metric: "totalCompletedWorkouts", target: 10 },
  workouts_25: { metric: "totalCompletedWorkouts", target: 25 },
  workouts_50: { metric: "totalCompletedWorkouts", target: 50 },
  calories_1000: { metric: "totalCalories", target: 1000 },
  calories_5000: { metric: "totalCalories", target: 5000 },
  minutes_60: { metric: "totalMinutes", target: 60 },
  minutes_600: { metric: "totalMinutes", target: 600 },
  plan_complete: { metric: "plansCompleted", target: 1 },
};

export interface AchievementProgress {
  current: number;
  target: number;
  percent: number;
  unlocked: boolean;
}

/**
 * Deterministic progress toward an achievement (clamped to [0, 100]).
 * Returns null only for unknown keys.
 */
export function achievementProgress(
  key: string,
  stats: AchievementStats
): AchievementProgress | null {
  const rule = RULE_METRICS[key];
  if (!rule) return null;

  const current = Math.max(0, stats[rule.metric]);
  const percent = Math.min(
    100,
    rule.target > 0 ? Math.round((current / rule.target) * 100) : 0
  );

  return {
    current,
    target: rule.target,
    percent,
    unlocked: current >= rule.target,
  };
}
