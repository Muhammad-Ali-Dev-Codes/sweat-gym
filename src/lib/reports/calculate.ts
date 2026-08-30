/**
 * Centralized report calculations — pure, zero-data-safe, timezone-aware.
 *
 * Every screen (Reports, Dashboard, Plan) consumes these functions so a
 * metric has exactly one meaning across the app. All functions accept plain
 * row shapes and never throw on empty input.
 */

import { computeStreaks, getLocalDayKey, getLocalToday, shiftDayKey } from "@/lib/dates";
import {
  dayKeysInRange,
  mondayIndex,
  type ReportRange,
} from "./ranges";

export interface ReportSession {
  id: string;
  workout_id?: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  estimated_calories: number | null;
  source?: string | null;
}

export interface CategoryCount {
  slug: string;
  label: string;
  count: number;
  minutes: number;
}

export interface LevelCount {
  slug: string;
  label: string;
  count: number;
}

export interface RangeSummary {
  /** Completed sessions in range. */
  workouts: number;
  minutes: number;
  calories: number;
  /** Local calendar days with >= 1 completed session. */
  activeDays: number;
  avgMinutes: number;
  longestSessionMinutes: number;
  shortestSessionMinutes: number | null;
}

export interface DailyPoint {
  key: string;
  label: string;
  minutes: number;
  calories: number;
  count: number;
}

export const EMPTY_SUMMARY: RangeSummary = {
  workouts: 0,
  minutes: 0,
  calories: 0,
  activeDays: 0,
  avgMinutes: 0,
  longestSessionMinutes: 0,
  shortestSessionMinutes: null,
};

export function sessionsInRange<T extends ReportSession>(
  sessions: readonly T[],
  range: Pick<ReportRange, "startDayKey" | "endDayKey">,
  timeZone: string
): T[] {
  if (range.startDayKey === null) {
    return sessions.filter((s) => s.completed_at);
  }
  return sessions.filter((s) => {
    if (!s.completed_at) return false;
    const key = getLocalDayKey(s.completed_at, timeZone);
    return key >= (range.startDayKey as string) && key <= range.endDayKey;
  });
}

export function sumEstimatedCalories(sessions: readonly Pick<ReportSession, "estimated_calories">[]): number {
  return sessions.reduce((sum, s) => sum + (s.estimated_calories ?? 0), 0);
}

export function summarizeSessions(
  sessions: readonly ReportSession[],
  range: Pick<ReportRange, "startDayKey" | "endDayKey" | "days" | "key">,
  timeZone: string
): RangeSummary {
  const scoped = sessionsInRange(sessions, range, timeZone);
  if (scoped.length === 0) return { ...EMPTY_SUMMARY };

  const durations = scoped.map((s) =>
    Math.max(0, Math.round((s.duration_seconds ?? 0) / 60))
  );
  const minutes = durations.reduce((a, b) => a + b, 0);

  const activeDays = new Set(
    scoped.map((s) => getLocalDayKey(s.completed_at as string, timeZone))
  ).size;

  // For partial periods (today / this week / this month) the average is
  // still per-workout — activeDays-based averages would mislead early.
  void range.days;

  return {
    workouts: scoped.length,
    minutes,
    calories: sumEstimatedCalories(scoped),
    activeDays,
    avgMinutes: Math.round(minutes / scoped.length),
    longestSessionMinutes: Math.max(...durations),
    shortestSessionMinutes: Math.min(...durations),
  };
}

function shortDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

export function shortDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Per-day activity series for bounded ranges. For unbounded ranges or very
 * long windows use monthlySeries instead.
 */
export function dailyActivity(
  sessions: readonly ReportSession[],
  range: ReportRange,
  timeZone: string
): DailyPoint[] {
  const keys = dayKeysInRange(range);
  if (keys.length === 0) {
    // All-time fallback handled by monthlySeries; nothing sensible here.
    return [];
  }

  const byDay = new Map<string, { minutes: number; calories: number; count: number }>();
  for (const s of sessionsInRange(sessions, range, timeZone)) {
    const key = getLocalDayKey(s.completed_at as string, timeZone);
    const bucket = byDay.get(key) ?? { minutes: 0, calories: 0, count: 0 };
    bucket.minutes += Math.max(0, Math.round((s.duration_seconds ?? 0) / 60));
    bucket.calories += s.estimated_calories ?? 0;
    bucket.count += 1;
    byDay.set(key, bucket);
  }

  const sparseLabels = keys.length > 10;
  return keys.map((key) => {
    const b = byDay.get(key) ?? { minutes: 0, calories: 0, count: 0 };
    return {
      key,
      label: sparseLabels ? shortDateLabel(key).replace(" ", "\u2009") : key === range.endDayKey ? "Today" : shortDayLabel(key),
      minutes: b.minutes,
      calories: b.calories,
      count: b.count,
    };
  });
}

export interface MonthlyPoint {
  key: string; // "YYYY-MM"
  label: string;
  workouts: number;
  minutes: number;
  calories: number;
}

/** Month buckets over all completed history (oldest first). */
export function monthlySeries(
  sessions: readonly ReportSession[],
  timeZone: string,
  maxBuckets = 12
): MonthlyPoint[] {
  const byMonth = new Map<string, MonthlyPoint>();
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const key = getLocalDayKey(s.completed_at, timeZone).slice(0, 7);
    const bucket =
      byMonth.get(key) ??
      ({
        key,
        label: new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1)).toLocaleDateString(
          "en-US",
          { month: "short", year: "2-digit" }
        ),
        workouts: 0,
        minutes: 0,
        calories: 0,
      } satisfies MonthlyPoint);
    bucket.workouts += 1;
    bucket.minutes += Math.max(0, Math.round((s.duration_seconds ?? 0) / 60));
    bucket.calories += s.estimated_calories ?? 0;
    byMonth.set(key, bucket);
  }
  return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-maxBuckets);
}

/** Per-week minute totals ending today (oldest first) — used for long ranges. */
export function weeklyActivity(
  sessions: readonly ReportSession[],
  weeks: number,
  timeZone: string
): DailyPoint[] {
  const todayKey = getLocalToday(timeZone);
  const byDay = new Map<string, { minutes: number; calories: number; count: number }>();
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const key = getLocalDayKey(s.completed_at, timeZone);
    const bucket = byDay.get(key) ?? { minutes: 0, calories: 0, count: 0 };
    bucket.minutes += Math.max(0, Math.round((s.duration_seconds ?? 0) / 60));
    bucket.calories += s.estimated_calories ?? 0;
    bucket.count += 1;
    byDay.set(key, bucket);
  }

  const points: DailyPoint[] = [];
  // Anchor each bucket to a Monday so weeks align with the weekly report.
  const thisWeekMonday = shiftDayKey(todayKey, -mondayIndex(todayKey));
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = shiftDayKey(thisWeekMonday, -7 * i);
    let minutes = 0;
    let calories = 0;
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const bucket = byDay.get(shiftDayKey(weekStart, d));
      if (!bucket) continue;
      minutes += bucket.minutes;
      calories += bucket.calories;
      count += bucket.count;
    }
    points.push({
      key: weekStart,
      label: shortDateLabel(weekStart),
      minutes,
      calories,
      count,
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Category & level analytics
// ---------------------------------------------------------------------------

export function categoryDistribution(
  sessions: readonly (ReportSession & {
    categories?: readonly { name: string; slug: string }[] | null;
  })[],
  range: Pick<ReportRange, "startDayKey" | "endDayKey">,
  timeZone: string
): CategoryCount[] {
  const map = new Map<string, CategoryCount>();
  for (const s of sessionsInRange(sessions, range, timeZone)) {
    const minutes = Math.max(0, Math.round((s.duration_seconds ?? 0) / 60));
    for (const c of s.categories ?? []) {
      const entry = map.get(c.slug) ?? {
        slug: c.slug,
        label: c.name,
        count: 0,
        minutes: 0,
      };
      entry.count += 1;
      entry.minutes += minutes;
      map.set(c.slug, entry);
    }
  }
  // Deterministic order: sessions first, then minutes as tie-break.
  return [...map.values()].sort(
    (a, b) => b.count - a.count || b.minutes - a.minutes
  );
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function levelDistribution(
  sessions: readonly (ReportSession & {
    level?: string | null;
  })[],
  range: Pick<ReportRange, "startDayKey" | "endDayKey">,
  timeZone: string
): LevelCount[] {
  const counts = new Map<string, number>();
  for (const s of sessionsInRange(sessions, range, timeZone)) {
    const level = s.level?.trim();
    if (!level) continue;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return ["beginner", "intermediate", "advanced"]
    .filter((slug) => counts.has(slug))
    .map((slug) => ({
      slug,
      label: LEVEL_LABELS[slug] ?? slug,
      count: counts.get(slug) as number,
    }));
}

// ---------------------------------------------------------------------------
// Weight progress
// ---------------------------------------------------------------------------

export interface WeightPointLike {
  recorded_at: string;
  weight_kg: number;
}

export interface WeightSummary {
  startWeight: number;
  currentWeight: number;
  targetWeight: number | null;
  totalChange: number;
  remainingToTarget: number | null;
  direction: "up" | "down" | "flat";
  entries: { date: string; label: string; weight: number }[];
  lastLoggedAt: string | null;
}

/** Zero-entry => null; single entry => flat summary with no trend. */
export function weightSummary(
  weights: readonly WeightPointLike[],
  targetWeight: number | null,
  timeZone: string = "UTC"
): WeightSummary | null {
  if (weights.length === 0) return null;

  const ordered = [...weights].sort(
    (a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)
  );
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const totalChange = Number((last.weight_kg - first.weight_kg).toFixed(1));

  return {
    startWeight: first.weight_kg,
    currentWeight: last.weight_kg,
    targetWeight,
    totalChange,
    remainingToTarget:
      targetWeight !== null
        ? Number(Math.abs(last.weight_kg - targetWeight).toFixed(1))
        : null,
    direction:
      totalChange > 0.05 ? "up" : totalChange < -0.05 ? "down" : "flat",
    entries: ordered.map((w) => ({
      date: w.recorded_at,
      label: shortDateLabel(getLocalDayKey(w.recorded_at, timeZone)),
      weight: w.weight_kg,
    })),
    lastLoggedAt: ordered[ordered.length - 1]?.recorded_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// Plan progress
// ---------------------------------------------------------------------------

export interface PlanDayLike {
  status: string;
  day_number: number;
}

export interface PlanProgressInfo {
  completedDays: number;
  totalDays: number;
  percent: number;
  nextDayNumber: number | null;
  finished: boolean;
}

export function planProgress(planDays: readonly PlanDayLike[]): PlanProgressInfo {
  const totalDays = planDays.length;
  const completedDays = planDays.filter((d) => d.status === "completed").length;
  const percent =
    totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0;

  return {
    completedDays,
    totalDays,
    percent,
    nextDayNumber:
      planDays.find((d) => d.status !== "completed")?.day_number ?? null,
    finished: totalDays > 0 && completedDays >= totalDays,
  };
}

// ---------------------------------------------------------------------------
// Comparisons
// ---------------------------------------------------------------------------

export interface Comparison {
  delta: number;
  direction: "up" | "down" | "flat";
}

/**
 * Meaningful like-for-like change. Returns null when either period has no
 * data basis (e.g. comparing against nothing) to avoid fake percentages.
 */
export function compareMetric(
  current: number,
  previous: number
): Comparison | null {
  if (previous <= 0) return null;
  const delta = current - previous;
  return {
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

// ---------------------------------------------------------------------------
// Streak helpers shared by Reports & Dashboard
// ---------------------------------------------------------------------------

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDay: string | null;
  /** Milestones already within reach (for markers on the streak UI). */
  milestones: number[];
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100] as const;

export function streakInfo(
  completedAtTimestamps: readonly (Date | string)[],
  timeZone: string
): StreakInfo {
  const result = computeStreaks(completedAtTimestamps, timeZone);
  return {
    ...result,
    milestones: STREAK_MILESTONES.filter((m) => m <= Math.max(result.current, result.longest)),
  };
}
