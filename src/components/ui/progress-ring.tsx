"use client"

import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const RING_COLORS = {
  ink: "#18181B",
  gray: "#71717A",
  energy: "#EA580C",
  green: "#059669",
  white: "#FFFFFF",
} as const

type RingColor = keyof typeof RING_COLORS

type ProgressRingProps = {
  value: number
  size?: number
  strokeWidth?: number
  color?: RingColor
  trackColor?: string
  showLabel?: boolean
  className?: string
}

function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = "ink",
  trackColor,
  showLabel = true,
  className,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      data-slot="progress-ring"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn(
        "relative inline-flex items-center justify-center font-[family-name:var(--font-geist-sans)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor ?? "var(--muted)"}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={RING_COLORS[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute inset-0 flex items-center justify-center font-bold tabular-nums text-foreground"
          style={{ fontSize: Math.max(12, size / 5.5) }}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  )
}

export { ProgressRing }
export type { ProgressRingProps, RingColor }
