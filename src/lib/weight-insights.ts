import type { WeightPointLike } from "./reports/calculate";

export const WEIGHT_RANGE_OPTIONS = [
  { value: "7", label: "7 days", days: 7 },
  { value: "30", label: "30 days", days: 30 },
  { value: "60", label: "60 days", days: 60 },
  { value: "90", label: "90 days", days: 90 },
  { value: "all", label: "All", days: null },
] as const;

export type WeightRangeKey = (typeof WEIGHT_RANGE_OPTIONS)[number]["value"];

export function filterWeightEntries(
  entries: readonly WeightPointLike[],
  rangeKey: WeightRangeKey,
  now = new Date()
): WeightPointLike[] {
  const range = WEIGHT_RANGE_OPTIONS.find((option) => option.value === rangeKey);
  if (!range || range.days === null) return [...entries];

  const cutoff = now.getTime() - range.days * 86_400_000;
  return entries.filter((entry) => Date.parse(entry.recorded_at) >= cutoff);
}

export function weightChange(
  entries: readonly WeightPointLike[]
): number | null {
  if (entries.length < 2) return null;
  const ordered = [...entries].sort(
    (a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)
  );
  return Number((ordered[ordered.length - 1].weight_kg - ordered[0].weight_kg).toFixed(1));
}

export function weightTrendInsight(
  entries: readonly WeightPointLike[],
  targetWeight: number | null
): string {
  if (entries.length === 0) return "Log your first weigh-in to start tracking your trend.";
  if (entries.length === 1) return "Log another weigh-in to reveal your trend.";

  const latestWeight = [...entries].sort(
    (a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at)
  )[0].weight_kg;
  if (targetWeight !== null && Math.abs(latestWeight - targetWeight) < 0.15) {
    return "You are at your target weight. Keep building consistency.";
  }

  const change = weightChange(entries) ?? 0;
  if (Math.abs(change) < 0.1) return "Your weight is holding steady across this range.";
  return change < 0
    ? `Your weight is trending down ${Math.abs(change).toFixed(1)} kg across this range.`
    : `Your weight is trending up ${change.toFixed(1)} kg across this range.`;
}