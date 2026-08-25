"use client";

/**
 * Reports activity charts.
 *
 * Kept in its own module so recharts (~heavy) is loaded lazily via
 * next/dynamic from reports-client instead of shipping in the route's
 * initial bundle. Rendered client-only (`ssr: false`).
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarCheck, Flame } from "lucide-react";
import { formatMinutes } from "@/lib/duration";
import type { DailyPoint } from "@/lib/reports/calculate";
import { CHART_TOOLTIP_STYLE } from "./chart-theme";

function xInterval(len: number): number {
  if (len > 16) return Math.ceil(len / 8) - 1;
  if (len > 8) return 1;
  return 0;
}

export function MinutesChart({ data }: { data: DailyPoint[] }) {
  const empty = data.length === 0 || data.every((p) => p.count === 0);

  if (empty) {
    return (
      <div className="flex h-56 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border text-center sm:h-64">
        <CalendarCheck className="size-8 text-muted-foreground/50" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-foreground/80">
          No workouts in this period
        </p>
        <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
          Try a wider range, or complete a workout to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            interval={xInterval(data.length)}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            cursor={{ fill: "currentColor", className: "text-muted/60", opacity: 0.6 }}
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value) => [formatMinutes(Number(value)), "Trained"]}
          />
          <Bar
            dataKey="minutes"
            fill="var(--foreground)"
            radius={[6, 6, 0, 0]}
            maxBarSize={data.length <= 7 ? 44 : 24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CaloriesChart({ data }: { data: DailyPoint[] }) {
  if (data.every((p) => p.calories === 0)) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center sm:h-56">
        <Flame className="size-8 text-muted-foreground/50" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-foreground/80">
          Nothing burned yet
        </p>
      </div>
    );
  }

  return (
    <div className="h-52 w-full sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--energy)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--energy)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            interval={data.length > 16 ? Math.ceil(data.length / 8) - 1 : 1}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value) => [`${Number(value).toLocaleString()} kcal`, "Burned"]}
          />
          <Area
            type="monotone"
            dataKey="calories"
            stroke="var(--energy)"
            strokeWidth={2.5}
            fill="url(#caloriesGradient)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
