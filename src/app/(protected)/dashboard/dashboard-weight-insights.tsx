"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import type { WeightEntry } from "@/lib/types/database";
import { weightSummary } from "@/lib/reports/calculate";
import {
  filterWeightEntries,
  WEIGHT_RANGE_OPTIONS,
  weightChange,
  weightTrendInsight,
  type WeightRangeKey,
} from "@/lib/weight-insights";
import { cn } from "@/lib/utils";
import { CHART_TOOLTIP_STYLE } from "../reports/chart-theme";

export function DashboardWeightInsights({
  entries,
  targetWeight,
  timeZone,
}: {
  entries: WeightEntry[];
  targetWeight: number | null;
  timeZone: string;
}) {
  const [rangeKey, setRangeKey] = useState<WeightRangeKey>("30");
  const allSummary = useMemo(() => weightSummary(entries, targetWeight, timeZone), [entries, targetWeight, timeZone]);
  const rangeEntries = useMemo(() => filterWeightEntries(entries, rangeKey), [entries, rangeKey]);
  const rangeSummary = useMemo(() => weightSummary(rangeEntries, targetWeight, timeZone), [rangeEntries, targetWeight, timeZone]);
  const chartData = (rangeSummary?.entries ?? []).map((entry) => ({
    label: entry.label,
    weight: entry.weight,
    target: targetWeight ?? undefined,
  }));
  const change = weightChange(rangeEntries);

  return (
    <section aria-label="Weight insights" className="titan-card p-6 sm:p-8 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-energy/10 text-energy">
            <Scale className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-foreground">Weight insights</h2>
            <p className="text-xs font-medium text-muted-foreground">{weightTrendInsight(rangeEntries, targetWeight)}</p>
          </div>
        </div>
        <div className="flex rounded-xl bg-muted p-1" role="tablist" aria-label="Weight history range">
          {WEIGHT_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={rangeKey === option.value}
              onClick={() => setRangeKey(option.value)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors sm:px-3",
                rangeKey === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {allSummary ? (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Current", `${allSummary.currentWeight.toFixed(1)} kg`],
            ["Start", `${allSummary.startWeight.toFixed(1)} kg`],
            ["Target", targetWeight === null ? "—" : `${targetWeight.toFixed(1)} kg`],
            ["Change", `${allSummary.totalChange > 0 ? "+" : ""}${allSummary.totalChange.toFixed(1)} kg`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-secondary/70 px-3 py-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-bold text-foreground">No weight entries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Log your first weigh-in from Reports to start tracking.</p>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="mt-5 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={chartData.length > 12 ? Math.floor(chartData.length / 8) : 0} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [`${Number(value)} kg`, name === "weight" ? "Weight" : "Target"]} />
              <Line type="monotone" dataKey="weight" stroke="var(--foreground)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: "var(--foreground)" }} activeDot={{ r: 5 }} />
              {targetWeight !== null && <Line type="monotone" dataKey="target" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="6 6" dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {rangeSummary && rangeSummary.entries.length > 0 && (
        <details className="mt-4 group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-secondary/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span>History</span>
            <span className="tabular-nums">{rangeSummary.entries.length} entries</span>
          </summary>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {[...rangeSummary.entries].reverse().map((entry) => (
              <li key={entry.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{entry.label}</span>
                <span className="font-bold tabular-nums text-foreground">{entry.weight} <span className="text-xs font-semibold text-muted-foreground">kg</span></span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{rangeEntries.length} entr{rangeEntries.length === 1 ? "y" : "ies"} in range</span>
        {change !== null && change !== 0 && (
          <span className={cn("inline-flex items-center gap-1 font-bold tabular-nums", change < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {change < 0 ? <ArrowDownRight className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}
            {Math.abs(change).toFixed(1)} kg in range
          </span>
        )}
      </div>
    </section>
  );
}