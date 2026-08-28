"use client";

import { Flame, TrendingUp, Zap } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { CHART_TOOLTIP_STYLE } from "../reports/chart-theme";

export function DashboardCalorieSummary({
  calories,
  totalCalories,
}: {
  calories: number[];
  totalCalories: number;
}) {
  const activeDays = calories.filter((value) => value > 0);
  const weekCalories = activeDays.reduce((sum, value) => sum + value, 0);
  const averageCalories = activeDays.length > 0 ? Math.round(weekCalories / activeDays.length) : 0;
  const bestCalories = Math.max(...calories, 0);
  const latestCalories = calories.at(-1) ?? 0;
  const previousCalories = calories.at(-2) ?? 0;
  const trend = latestCalories - previousCalories;
  const chartData = calories.map((value, index) => ({ label: `Day ${index + 1}`, calories: value }));

  return (
    <section aria-label="Calorie summary insights" className="titan-card p-6 sm:p-8 lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Flame className="size-5" fill="currentColor" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-foreground">Calorie insights</h2>
            <p className="text-xs font-medium text-muted-foreground">Your burn at a glance</p>
          </div>
        </div>
        <Zap className="size-4 text-energy" aria-hidden />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        {[
          ["This week", `${weekCalories.toLocaleString()} kcal`],
          ["Active average", `${averageCalories.toLocaleString()} kcal`],
          ["Best day", `${bestCalories.toLocaleString()} kcal`],
          ["All time", `${totalCalories.toLocaleString()} kcal`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-secondary/70 px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={36} domain={[0, "dataMax"]} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${Number(value).toLocaleString()} kcal`, "Burned"]} labelFormatter={(label) => label} />
            <Line type="monotone" dataKey="calories" stroke="var(--energy)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: "var(--energy)" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
        <span>{activeDays.length}/7 active days</span>
        {trend !== 0 && <span className={cn("inline-flex items-center gap-1 font-bold tabular-nums", trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}><TrendingUp className="size-3.5" aria-hidden />{trend > 0 ? "+" : ""}{trend.toLocaleString()} kcal</span>}
      </div>
    </section>
  );
}
