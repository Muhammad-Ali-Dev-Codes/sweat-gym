/**
 * Centralized report date-range logic.
 *
 * Every range is expressed in the user's LOCAL calendar (IANA timezone)
 * using "YYYY-MM-DD" day keys from lib/dates — never raw UTC timestamps —
 * so Reports, Dashboard, and streaks always agree on period boundaries.
 */

import { getLocalToday, shiftDayKey } from "@/lib/dates";

export type ReportRangeKey =
  | "today"
  | "thisWeek"
  | "last7Days"
  | "thisMonth"
  | "last30Days"
  | "last90Days"
  | "allTime";

export interface ReportRange {
  key: ReportRangeKey;
  /** Inclusive local start day key; null means "beginning of history". */
  startDayKey: string | null;
  /** Inclusive local end day key (today in the user's timezone). */
  endDayKey: string;
  /** Days covered; null when unbounded. */
  days: number | null;
}

export const REPORT_RANGE_OPTIONS: readonly {
  value: ReportRangeKey;
  label: string;
}[] = [
  { value: "today", label: "Today" },
  { value: "thisWeek", label: "This Week" },
  { value: "last7Days", label: "7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "last30Days", label: "30 Days" },
  { value: "last90Days", label: "90 Days" },
  { value: "allTime", label: "All Time" },
] as const;

/** Monday-start week: 0 = Monday … 6 = Sunday for a "YYYY-MM-DD" key. */
export function mondayIndex(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Resolve a range key against the user's local calendar. */
export function resolveReportRange(
  key: ReportRangeKey,
  timeZone: string
): ReportRange {
  const today = getLocalToday(timeZone);

  switch (key) {
    case "today":
      return { key, startDayKey: today, endDayKey: today, days: 1 };
    case "thisWeek": {
      const start = shiftDayKey(today, -mondayIndex(today));
      return { key, startDayKey: start, endDayKey: today, days: 7 };
    }
    case "last7Days":
      return {
        key,
        startDayKey: shiftDayKey(today, -6),
        endDayKey: today,
        days: 7,
      };
    case "thisMonth": {
      const start = `${today.slice(0, 7)}-01`;
      return {
        key,
        startDayKey: start,
        endDayKey: today,
        days: monthLength(start),
      };
    }
    case "last30Days":
      return {
        key,
        startDayKey: shiftDayKey(today, -29),
        endDayKey: today,
        days: 30,
      };
    case "last90Days":
      return {
        key,
        startDayKey: shiftDayKey(today, -89),
        endDayKey: today,
        days: 90,
      };
    case "allTime":
      return { key, startDayKey: null, endDayKey: today, days: null };
  }
}

function monthLength(monthStart: string): number {
  const [y, m] = monthStart.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * The equal-length window immediately BEFORE the given range — used only
 * for meaningful like-for-like comparisons. Returns null for all-time.
 */
export function previousReportRange(
  range: ReportRange
): ReportRange | null {
  if (range.key === "allTime" || range.startDayKey === null) return null;

  const span = range.days ?? 0;
  if (span <= 0) return null;

  // Calendar-aligned periods compare against their true previous period.
  if (range.key === "thisWeek") {
    const start = shiftDayKey(range.startDayKey, -7);
    return {
      key: range.key,
      startDayKey: start,
      endDayKey: shiftDayKey(start, 6),
      days: 7,
    };
  }
  if (range.key === "thisMonth") {
    const [y, m] = range.startDayKey.split("-").map(Number);
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    const mm = String(prevMonth).padStart(2, "0");
    const start = `${prevYear}-${mm}-01`;
    return {
      key: range.key,
      startDayKey: start,
      endDayKey: shiftDayKey(start, monthLength(start) - 1),
      days: monthLength(start),
    };
  }

  const start = shiftDayKey(range.startDayKey, -span);
  return {
    key: range.key,
    startDayKey: start,
    endDayKey: shiftDayKey(range.startDayKey, -1),
    days: span,
  };
}

/** Inclusive test: does a day key fall within the range? */
export function dayKeyInRange(dayKey: string, range: ReportRange): boolean {
  if (range.endDayKey && dayKey > range.endDayKey) return false;
  if (range.startDayKey !== null && dayKey < range.startDayKey) return false;
  return true;
}

/** Enumerate every day key in the range (oldest first). Null start => []. */
export function dayKeysInRange(range: ReportRange): string[] {
  if (range.startDayKey === null) return [];
  const keys: string[] = [];
  let cursor = range.startDayKey;
  while (cursor <= range.endDayKey) {
    keys.push(cursor);
    cursor = shiftDayKey(cursor, 1);
  }
  return keys;
}

export function reportRangeLabel(key: ReportRangeKey): string {
  return (
    REPORT_RANGE_OPTIONS.find((o) => o.value === key)?.label ?? "All Time"
  );
}
