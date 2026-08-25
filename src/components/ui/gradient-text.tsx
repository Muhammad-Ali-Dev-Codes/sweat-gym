import { cn } from "@/lib/utils"

const GRADIENT_VARIANTS = {
  purple: "from-orange-500 via-amber-400 to-yellow-300",
  blue: "from-zinc-200 via-zinc-400 to-zinc-600",
  warm: "from-yellow-400 via-orange-500 to-red-500",
  success: "from-emerald-600 via-green-500 to-lime-500",
} as const

type GradientTextVariant = keyof typeof GRADIENT_VARIANTS

type GradientTextProps = {
  children: React.ReactNode
  variant?: GradientTextVariant
  className?: string
}

function GradientText({
  children,
  variant = "purple",
  className,
}: GradientTextProps) {
  return (
    <span
      data-slot="gradient-text"
      className={cn(
        "bg-gradient-to-r bg-clip-text font-[family-name:var(--font-geist-sans)] text-transparent",
        GRADIENT_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export { GradientText }
export type { GradientTextProps, GradientTextVariant }
