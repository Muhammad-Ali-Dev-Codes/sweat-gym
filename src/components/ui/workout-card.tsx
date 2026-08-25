"use client"

import { Clock, Flame, Play } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"

import { Badge, type BadgeProps } from "./badge"

const LEVEL_VARIANTS: Record<string, BadgeProps["variant"]> = {
  beginner: "green",
  intermediate: "orange",
  advanced: "pink",
}

type WorkoutCardProps = {
  title: string
  duration: string
  calories: number
  level: string
  image?: string
  onClick?: () => void
  className?: string
}

function WorkoutCard({
  title,
  duration,
  calories,
  level,
  image,
  onClick,
  className,
}: WorkoutCardProps) {
  const levelVariant = LEVEL_VARIANTS[level.toLowerCase()] ?? "purple"
  const interactive = typeof onClick === "function"

  return (
    <div
      data-slot="workout-card"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!interactive) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        "group flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        interactive &&
          "cursor-pointer hover:-translate-y-1 hover:border-muted-foreground/40 hover:shadow-lg hover:shadow-black/10",
        className
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="96px"
            loading="lazy"
            className="absolute inset-0 object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-90 transition-opacity group-hover:opacity-100">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/95 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-0.5 size-4 fill-foreground text-foreground" aria-hidden />
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-[family-name:var(--font-geist-sans)] text-base font-semibold text-foreground">
            {title}
          </h3>
          <Badge variant={levelVariant} size="sm" className="capitalize">
            {level}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-ring" aria-hidden />
            {duration}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Flame className="size-3.5 text-energy" aria-hidden />
            {calories.toLocaleString()} kcal
          </span>
        </div>
      </div>
    </div>
  )
}

export { WorkoutCard }
export type { WorkoutCardProps }
