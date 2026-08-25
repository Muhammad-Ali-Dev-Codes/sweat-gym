import { cn } from "@/lib/utils"

type SkeletonProps = {
  className?: string
  lines?: number
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  )
}

function Skeleton({ className, lines }: SkeletonProps) {
  if (lines && lines > 0) {
    return (
      <div
        data-slot="skeleton"
        role="status"
        aria-label="Loading"
        className={cn("space-y-2.5", className)}
      >
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLine
            key={index}
            className={cn("h-4 w-full", index === lines - 1 && "w-3/4")}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-label="Loading"
      aria-hidden={false}
      className={cn("animate-pulse rounded-xl bg-muted", className)}
    />
  )
}

export { Skeleton, SkeletonLine }
export type { SkeletonProps }
