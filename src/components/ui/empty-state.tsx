import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
        <Icon className="size-8 text-purple-600" aria-hidden />
      </div>
      <h3 className="mt-4 font-[family-name:var(--font-geist-sans)] text-base font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
