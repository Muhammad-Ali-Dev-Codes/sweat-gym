"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Flame } from "lucide-react";
import { CHART_TOOLTIP_STYLE } from "../reports/chart-theme";

export function DashboardCalorieInsights({
  days,
  calories,
  maxCalories,
  totalCalories,
  timeZone,
}: {
  days: Date[];
  calories: number[];
  maxCalories: number;
  totalCalories: number;
  timeZone: string;
}) {
  const weekCalories = calories.reduce((sum, value) => sum + value, 0);
  const activeDays = calories.filter((value) => value > 0).length;
  const averageCalories = activeDays > 0 ? Math.round(weekCalories / activeDays) : 0;
  const bestDayIndex = calories.indexOf(Math.max(...calories));
  const bestDayCalories = calories[bestDayIndex] ?? 0;
  const bestDayLabel =
    activeDays > 0
      ? days[bestDayIndex].toLocaleDateString("en-US", { weekday: "long", timeZone })
      : null;

  return (
    <section aria-label="Calorie insights" className="titan-card overflow-hidden">
      <div className="border-b border-border bg-linear-to-br from-orange-500/8 via-transparent to-amber-400/8 px-6 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">
              <Flame className="size-5" fill="currentColor" aria-hidden />
            </span>
          <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-400">Training fuel</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground">Calorie insights</h2>
          </div>
        </div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 text-xs font-bold text-energy transition-colors hover:text-foreground"
          >
            Full report
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Burned this week</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-foreground tabular-nums sm:text-5xl">
              {weekCalories.toLocaleString()} <span className="text-lg font-bold text-muted-foreground sm:text-xl">kcal</span>
            </p>
          </div>
          <p className="max-w-xs text-sm font-semibold leading-6 text-muted-foreground">
            {activeDays > 0
              ? `${bestDayLabel} was your strongest day at ${bestDayCalories.toLocaleString()} kcal.`
              : "Complete a workout to start building your calorie history."}
          </p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-foreground">Your week in motion</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{averageCalories.toLocaleString()} kcal average on active days</p>
        </div>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">{activeDays}/7 active</span>
      </div>

      <div className="mt-6 h-52 w-full sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={days.map((day, index) => ({
              label: day.toLocaleDateString("en-US", { weekday: "short", timeZone }),
              calories: calories[index] ?? 0,
            }))}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} domain={[0, maxCalories]} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value) => [`${Number(value).toLocaleString()} kcal`, "Burned"]}
            />
            <Bar
              dataKey="calories"
              stroke="var(--energy)"
              fill="var(--energy)"
              radius={[7, 7, 0, 0]}
              maxBarSize={52}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
        <span>{totalCalories.toLocaleString()} kcal burned all time</span>
        <span className="text-foreground">Keep the flame moving</span>
      </div>
      </div>
    </section>
  );
}
