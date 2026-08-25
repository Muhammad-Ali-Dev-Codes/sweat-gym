"use client"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const GRADIENTS = {
  purple: "from-zinc-800 via-zinc-900 to-black",
  blue: "from-zinc-800 via-zinc-900 to-black",
  green: "from-zinc-800 via-zinc-900 to-black",
  orange: "from-orange-600 to-amber-500",
  pink: "from-zinc-800 via-zinc-900 to-black",
  yellow: "from-orange-600 to-amber-500",
} as const

type CategoryColor = keyof typeof GRADIENTS

type CategoryCardProps = {
  name: string
  icon: LucideIcon
  color?: CategoryColor
  count?: number
  onClick?: () => void
  className?: string
}

function CategoryCard({
  name,
  icon: Icon,
  color = "purple",
  count,
  onClick,
  className,
}: CategoryCardProps) {
  const interactive = typeof onClick === "function"

  return (
    <button
      type="button"
      data-slot="category-card"
      onClick={onClick}
      disabled={!interactive}
      className={cn(
        "group relative flex aspect-square w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white shadow-sm outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        GRADIENTS[color],
        interactive &&
          "cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 active:translate-y-0",
        !interactive && "cursor-default",
        className
      )}
    >
      <span
        aria-hidden
        className="absolute -top-6 -right-6 size-20 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150"
      />
      <span
        aria-hidden
        className="absolute -bottom-8 -left-4 size-16 rounded-full bg-black/10"
      />
      <span className="relative flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
        <Icon className="size-6 transition-transform duration-300 group-hover:scale-110" aria-hidden />
      </span>
      <span className="relative text-center">
        <span className="block font-[family-name:var(--font-geist-sans)] text-sm font-bold">
          {name}
        </span>
        {typeof count === "number" && (
          <span className="mt-0.5 block text-[11px] font-medium text-white/80">
            {count} workouts
          </span>
        )}
      </span>
    </button>
  )
}

export { CategoryCard }
export type { CategoryCardProps, CategoryColor }
