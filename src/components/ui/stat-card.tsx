import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

const ICON_COLORS = {
  purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  blue: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  orange: "bg-energy/10 text-energy",
  pink: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  yellow: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const

type StatColor = keyof typeof ICON_COLORS

type StatCardProps = {
  label: string
  value: ReactNode
  icon: LucideIcon
  color?: StatColor
  trend?: "up" | "down"
  trendValue?: string
  className?: string
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = "purple",
  trend,
  trendValue,
  className,
}: StatCardProps) {
  const trendUp = trend === "up"

  return (
    <div
      data-slot="stat-card"
      className={cn(
        "titan-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            ICON_COLORS[color]
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trendUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
            )}
          >
            {trendUp ? (
              <TrendingUp className="size-3" aria-hidden />
            ) : (
              <TrendingDown className="size-3" aria-hidden />
            )}
            {trendValue}
          </span>
        )}
      </div>
      <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

export { StatCard }
export type { StatCardProps, StatColor }
