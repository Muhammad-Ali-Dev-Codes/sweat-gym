"use client"

import { animate, useMotionValue, useTransform, useMotionValueEvent } from "motion/react"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

type AnimatedNumberProps = {
  value: number
  duration?: number
  className?: string
  /** Decimal places to display (default 0). */
  decimals?: number
  /** Static text rendered after the number (e.g. " kg"). */
  suffix?: string
}

function AnimatedNumber({
  value,
  duration = 1000,
  className,
  decimals = 0,
  suffix,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0)
  const display = useTransform(motionValue, (latest) =>
    latest.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )
  // MotionValues can't be rendered as children alongside other nodes;
  // mirror the formatted value into state for plain-text rendering.
  const [text, setText] = useState(() => (0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }))
  useMotionValueEvent(display, "change", (v) => setText(v))

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: "easeOut",
    })
    return () => controls.stop()
  }, [value, duration, motionValue])

  return (
    <span data-slot="animated-number" className={cn("tabular-nums", className)}>
      {text}
      {suffix}
    </span>
  )
}

export { AnimatedNumber }
export type { AnimatedNumberProps }
