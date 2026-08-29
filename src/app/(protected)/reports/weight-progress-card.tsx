"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import { Scale, Check, Loader2 } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { WeightSummary } from "@/lib/reports/calculate";
import { logWeight, autoUpdateWeightFromCalories } from "@/app/actions/weight";
import { CHART_TOOLTIP_STYLE } from "./chart-theme";
import { cn } from "@/lib/utils";

type WeightCardProps = {
  summary: WeightSummary | null;
  estimatedWeightLoss?: number;
};

const HISTORY_PREVIEW = 8;

export function WeightProgressCard({ summary, estimatedWeightLoss }: WeightCardProps) {
  const router = useRouter();
  const [weightInput, setWeightInput] = useState("");
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [weightLogged, setWeightLogged] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [autoUpdateAttempted, setAutoUpdateAttempted] = useState(false);
  const [, startTransition] = useTransition();

  // Auto-update weight on mount if estimated loss available
  useEffect(() => {
    // Only attempt once per component mount
    if (autoUpdateAttempted) return;
    if (!summary || estimatedWeightLoss == null || estimatedWeightLoss <= 0) return;

    setAutoUpdateAttempted(true);

    const performAutoUpdate = async () => {
      try {
        const result = await autoUpdateWeightFromCalories();
        if (result.success && result.newWeight) {
          console.log("Auto-updated weight to:", result.newWeight);
          startTransition(() => router.refresh());
        } else {
          console.log("Auto-update result:", result.error);
        }
      } catch (err) {
        console.error("Auto-update error:", err);
      }
    };

    performAutoUpdate();
  }, []);

  const chartData = useMemo(
    () =>
      (summary?.entries ?? []).map((e) => ({
        label: e.label,
        weight: e.weight,
        target: summary?.targetWeight ?? undefined,
      })),
    [summary]
  );

  async function submitWeight(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(weightInput);
    if (Number.isNaN(value)) {
      setWeightError("Enter a valid number");
      return;
    }

    setLoggingWeight(true);
    setWeightError(null);

    const result = await logWeight(value);

    if (!result.success) {
      setWeightError(result.error ?? "Could not save weight");
      setLoggingWeight(false);
      return;
    }

    setWeightInput("");
    setWeightLogged(true);
    setLoggingWeight(false);
    startTransition(() => router.refresh());
    window.setTimeout(() => setWeightLogged(false), 2500);
  }

  return (
    <section
      aria-label="Weight progress"
      className="titan-card p-5 sm:p-6 lg:col-span-2"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Scale className="size-4.5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Weight Progress
            </h3>
            <p className="text-xs text-muted-foreground">
              {summary?.targetWeight != null
                ? summary.remainingToTarget !== null && summary.remainingToTarget < 0.15
                  ? "Target reached 🎉"
                  : `Goal ${summary.targetWeight} kg`
                : "Logged entries"}
            </p>
          </div>
        </div>

        {summary && Math.abs(summary.totalChange) >= 0.05 && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
              summary.totalChange <= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                : "bg-energy/10 text-energy"
            )}
          >
            {summary.totalChange > 0 ? "+" : ""}
            {summary.totalChange} kg since start
          </span>
        )}
      </div>

      {/* Summary strip */}
      {summary ? (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { term: "Start", value: `${summary.startWeight} kg` },
              { term: "Current", value: <AnimatedNumber value={summary.currentWeight} decimals={1} suffix=" kg" /> },
              {
                term: "Target",
                value:
                  summary.targetWeight !== null
                    ? `${summary.targetWeight} kg`
                    : "—",
              },
              {
                term: "To go",
                value:
                  summary.remainingToTarget !== null
                    ? summary.remainingToTarget < 0.15
                      ? "Reached 🎉"
                      : `${summary.remainingToTarget} kg`
                    : "—",
              },
              ...(estimatedWeightLoss && estimatedWeightLoss > 0 ? [{ term: "Est. loss*", value: `~${estimatedWeightLoss.toFixed(1)} kg` }] : []),
            ].map(({ term, value }) => (
              <div key={term} className="rounded-xl bg-secondary/70 px-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {term}
                </dt>
                <dd className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {estimatedWeightLoss && estimatedWeightLoss > 0 && (
            <p className="mb-4 text-xs font-medium text-muted-foreground italic">
              * Est. loss assumes 7,700 kcal ≈ 1 kg. Actual weight depends on diet, water retention, and time.
            </p>
          )}
        </>
      ) : null}

      {/* Trend chart / empty states */}
      {!summary ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <Scale className="size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-foreground/80">
            No weigh-ins yet
          </p>
          <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
            Log your first entry below to start the trend line.
          </p>
        </div>
      ) : chartData.length < 2 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <Scale className="size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-foreground/80">
            One entry logged
          </p>
          <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
            Add another weigh-in to reveal your trend.
          </p>
        </div>
      ) : (
        <div className="h-52 w-full sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                interval={chartData.length > 12 ? Math.floor(chartData.length / 8) : 0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={40}
                domain={["dataMin - 2", "dataMax + 2"]}
              />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value, name) =>
                  name === "weight"
                    ? [`${Number(value)} kg`, "Weight"]
                    : [`${Number(value)} kg`, "Target"]
                }
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--foreground)"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: "var(--foreground)" }}
                activeDot={{ r: 5 }}
              />
              {summary.targetWeight !== null && (
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      {summary && summary.entries.length > 0 && (
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-secondary/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            History
            <span className="tabular-nums normal-case">
              last {Math.min(HISTORY_PREVIEW, summary.entries.length)} of{" "}
              {summary.entries.length}
            </span>
          </summary>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {[...summary.entries]
              .reverse()
              .slice(0, HISTORY_PREVIEW)
              .map((entry, i) => (
                <motion.li
                  key={entry.date + i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">{entry.label}</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {entry.weight}{" "}
                    <span className="text-xs font-semibold text-muted-foreground">kg</span>
                  </span>
                </motion.li>
              ))}
          </ul>
        </details>
      )}

      {/* Log weight */}
      <form onSubmit={submitWeight} className="mt-4 flex items-center gap-2.5">
        <div className="relative flex-1">
          <Scale
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={30}
            max={300}
            value={weightInput}
            onChange={(e) => {
              setWeightInput(e.target.value);
              setWeightError(null);
            }}
            placeholder={summary ? String(summary.currentWeight) : "e.g. 72.5"}
            aria-label="Today's weight in kilograms"
            className="h-11 w-full rounded-xl border border-border bg-background pr-12 pl-10 text-sm font-semibold tabular-nums text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-foreground"
          />
          <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-muted-foreground">
            kg
          </span>
        </div>
        <button
          type="submit"
          disabled={loggingWeight || weightInput.trim() === ""}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          {loggingWeight ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : weightLogged ? (
            <Check className="size-4" strokeWidth={3} aria-hidden />
          ) : null}
          {weightLogged ? "Saved" : "Log"}
        </button>
      </form>
      {weightError && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {weightError}
        </p>
      )}
    </section>
  );
}
