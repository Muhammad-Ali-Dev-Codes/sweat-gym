/**
 * Timezone-aware calendar-day utilities.
 *
 * All streak / daily-activity logic MUST use these helpers so every screen
 * derives identical results from the same authoritative timestamps.
 * Day keys are "YYYY-MM-DD" strings in the user's IANA timezone.
 */

const DAY_MS = 86_400_000;

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Convert a timestamp to a local calendar day key ("YYYY-MM-DD"). */
export function getLocalDayKey(date: Date | string, timeZone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatterFor(timeZone).format(d);
}

/** Today's day key in the given timezone. */
export function getLocalToday(timeZone: string): string {
  return getLocalDayKey(new Date(), timeZone);
}

/** Shift a day key by N days (N may be negative). */
export function shiftDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Difference in days between two day keys (a - b). */
export function diffDayKeys(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS
  );
}

export interface StreakResult {
  /** Consecutive active days ending today (or yesterday if today is not yet active). */
  current: number;
  /** Longest run of consecutive active days in the supplied history. */
  longest: number;
  /** Most recent active day key, or null when history is empty. */
  lastActiveDay: string | null;
}

/**
 * Compute current + longest streak from completed-workout timestamps.
 *
 * Rules:
 *  - Multiple workouts on one local day count once.
 *  - A missed day breaks the chain.
 *  - If today has no workout yet, the chain may still end yesterday
 *    (the streak is not broken until the day actually passes).
 */
export function computeStreaks(
  completedAtTimestamps: readonly (Date | string)[],
  timeZone: string
): StreakResult {
  if (completedAtTimestamps.length === 0) {
    return { current: 0, longest: 0, lastActiveDay: null };
  }

  const active = new Set(
    completedAtTimestamps.map((t) => getLocalDayKey(t, timeZone))
  );

  // Current streak: walk backwards from today (or yesterday).
  let cursor = getLocalToday(timeZone);
  if (!active.has(cursor)) cursor = shiftDayKey(cursor, -1);

  let current = 0;
  while (active.has(cursor)) {
    current += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  // Longest streak: scan sorted keys for the longest consecutive run.
  const sorted = [...active].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (diffDayKeys(sorted[i], sorted[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  return { current, longest, lastActiveDay: sorted[sorted.length - 1] };
}

/** Group timestamps into per-local-day minute totals. */
export function minutesByLocalDay(
  entries: readonly { at: Date | string; seconds: number }[],
  timeZone: string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = getLocalDayKey(e.at, timeZone);
    map.set(key, (map.get(key) ?? 0) + Math.round(e.seconds / 60));
  }
  return map;
}
