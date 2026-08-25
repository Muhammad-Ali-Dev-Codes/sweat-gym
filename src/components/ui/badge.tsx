import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-full font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        purple: "bg-foreground text-background",
        blue: "bg-secondary text-secondary-foreground",
        green: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400",
        orange: "bg-energy/12 text-energy",
        pink: "bg-red-500/10 text-red-600 dark:bg-red-400/15 dark:text-red-400",
        yellow: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
export type { BadgeProps }
