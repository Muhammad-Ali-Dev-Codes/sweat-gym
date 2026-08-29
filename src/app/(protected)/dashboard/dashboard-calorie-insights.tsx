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

type DailyCalories = {
  label: string;
  calories: number;
};

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
  const bestDayIndex = calories.indexOf(Math.max(...calories));
  const bestDayCalories = calories[bestDayIndex] ?? 0;
  const bestDayLabel =
    activeDays > 0
      ? days[bestDayIndex].toLocaleDateString("en-US", { weekday: "long", timeZone })
      : null;
  const dailyCalories: DailyCalories[] = days.map((day, index) => ({
    label: day.toLocaleDateString("en-US", { weekday: "short", timeZone }),
    calories: calories[index] ?? 0,
  }));

  return (
    <section aria-label="Calorie insights" className="titan-card overflow-hidden bg-[#f6efe8] text-[#1f1a17] shadow-[0_18px_40px_-28px_rgba(120,76,22,0.45)] dark:bg-[#1a1715] dark:text-foreground">
      <div className="border-b border-[#e7d8c9] bg-linear-to-br from-[#f4d4a5]/40 via-[#fffaf4]/80 to-[#f7d1a8]/35 px-6 py-7 sm:px-8 sm:py-9 dark:border-[#3a2d26] dark:from-orange-500/10 dark:via-transparent dark:to-amber-400/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25">
              <Flame className="size-5" fill="currentColor" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-700 dark:text-orange-300">Training fuel</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#2a1e1a] dark:text-foreground">Calorie insights</h2>
            </div>
          </div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 transition-colors hover:text-[#2a1e1a] dark:text-orange-300 dark:hover:text-foreground"
          >
            Full report
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-sm font-semibold text-[#5b4c43] dark:text-muted-foreground">Burned this week</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-[#1f1a17] tabular-nums sm:text-5xl dark:text-foreground">
              {weekCalories.toLocaleString()} <span className="text-lg font-bold text-[#6f5c54] sm:text-xl dark:text-muted-foreground">kcal</span>
            </p>
          </div>
          <p className="max-w-xs text-sm font-semibold leading-6 text-[#584d49] dark:text-muted-foreground">
            {activeDays > 0
              ? `${bestDayLabel} was your strongest day at ${bestDayCalories.toLocaleString()} kcal.`
              : "Complete a workout to start building your calorie history."}
          </p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-[#2a1e1a] dark:text-foreground">Daily calorie burn</p>
            <p className="mt-1 text-xs font-medium text-[#6b5e59] dark:text-muted-foreground">Calories burned across each day this week</p>
          </div>
          <span className="rounded-full bg-[#f4dfc4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6a4b2b] dark:bg-muted dark:text-foreground">{activeDays}/7 active</span>
        </div>

        <div className="mt-6 h-52 w-full sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyCalories}
              margin={{ top: 10, right: 6, left: 52, bottom: 0 }}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-[#e7d8c9] dark:text-border" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "currentColor" }}
                label={{ value: "Days", position: "insideBottom", offset: -2, fontSize: 11, fill: "currentColor" }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "currentColor" }}
                width={48}
                domain={[0, Math.max(maxCalories, 1)]}
                tickMargin={8}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value) => [`${Number(value).toLocaleString()} kcal`, "Burned"]}
              />
              <Bar
                dataKey="calories"
                fill="url(#calorieGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={72}
              />
              <defs>
                <linearGradient id="calorieGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7d8c9] pt-4 text-xs font-semibold text-[#5d4c45] dark:border-border dark:text-muted-foreground">
          <span>{totalCalories.toLocaleString()} kcal burned all time</span>
          <span className="font-extrabold text-[#2a1e1a] dark:text-foreground">Keep the flame moving</span>
        </div>
      </div>
    </section>
  );
}
