"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartPie } from "lucide-react";
import type { CategoryCount, LevelCount } from "@/lib/reports/calculate";
import { CHART_TOOLTIP_STYLE, DONUT_COLORS } from "./chart-theme";

type CategoryAnalyticsCardProps = {
  categories: CategoryCount[];
  levels: LevelCount[];
};

export function CategoryAnalyticsCard({
  categories,
  levels,
}: CategoryAnalyticsCardProps) {
  const hasData = categories.length > 0 || levels.length > 0;

  if (!hasData) {
    return (
      <section
        aria-label="Workout mix"
        className="titan-card p-5 sm:p-6"
      >
        <Header />
        <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <ChartPie className="size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-foreground/80">
            No workouts in this period
          </p>
          <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
            Complete a workout to see what types of training you favor.
          </p>
        </div>
      </section>
    );
  }

  const total = categories.reduce((a, c) => a + c.count, 0);

  return (
    <section aria-label="Workout mix" className="titan-card p-5 sm:p-6">
      <Header />

      {categories.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No categorized workouts this period.
        </p>
      ) : (
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {categories.map((entry, i) => (
                    <Cell
                      key={entry.slug}
                      fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    `${Number(value)} session${Number(value) === 1 ? "" : "s"}`,
                    String(name),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="w-full min-w-0 space-y-1.5">
            {categories.map((c, i) => (
              <li key={c.slug} className="flex items-center gap-2.5 text-xs">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                  {c.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {c.minutes} min ·{" "}
                  {total > 0 ? Math.round((c.count / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {levels.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            By level
          </p>
          <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-muted">
            {levels.map((l, i) => {
              const totalSessions = levels.reduce((a, x) => a + x.count, 0);
              return (
                <div
                  key={l.slug}
                  role="meter"
                  aria-label={`${l.label}: ${l.count} workouts`}
                  aria-valuemin={0}
                  aria-valuemax={totalSessions}
                  aria-valuenow={l.count}
                  title={`${l.label}: ${l.count}`}
                  style={{
                    width: `${(l.count / totalSessions) * 100}%`,
                    background: DONUT_COLORS[i % DONUT_COLORS.length],
                  }}
                  className="first:rounded-l-full last:rounded-r-full"
                />
              );
            })}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {levels.map((l, i) => (
              <li key={l.slug} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="font-semibold text-foreground">{l.label}</span>
                <span className="tabular-nums">{l.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
            Levels reflect workout difficulty — match them to how you feel, not
            what looks best.
          </p>
        </div>
      )}
    </section>
  );
}

function Header() {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <ChartPie className="size-4.5" aria-hidden />
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground">Workout Mix</h3>
        <p className="text-xs text-muted-foreground">
          What you actually trained
        </p>
      </div>
    </div>
  );
}
