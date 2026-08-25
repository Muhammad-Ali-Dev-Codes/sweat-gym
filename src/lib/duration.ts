/**
 * Format a duration in seconds as a clock string, everywhere durations
 * are displayed (plan rows, exercise cards, session history).
 *   45    -> "0:45"
 *   105   -> "1:45"
 *   3600  -> "60:00"
 *   5400  -> "1:30:00"
 */
export function formatClock(seconds: number | null | undefined): string {
  if (
    seconds == null ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0:00";
  }
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * Format an aggregate MINUTE total as hours + minutes for stats tiles:
 *   45  -> "45 min"
 *   156 -> "2 hr 36 min"
 *   120 -> "2 hr"
 */
export function formatMinutes(
  totalMinutes: number | null | undefined
): string {
  if (
    totalMinutes == null ||
    !Number.isFinite(totalMinutes) ||
    totalMinutes <= 0
  ) {
    return "0 min";
  }
  const m = Math.round(totalMinutes);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem} min`;
  if (rem === 0) return `${h} hr`;
  return `${h} hr ${rem} min`;
}
