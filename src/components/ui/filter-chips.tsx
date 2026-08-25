"use client"

import { cn } from "@/lib/utils"

type FilterChipOption = {
  label: string
  value: string
}

type FilterChipsProps = {
  options: FilterChipOption[]
  selected: string
  onSelect: (value: string) => void
  className?: string
}

const CHIP_BASE =
  "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"

function FilterChips({ options, selected, onSelect, className }: FilterChipsProps) {
  return (
    <div
      data-slot="filter-chips"
      role="tablist"
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === selected
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(option.value)}
            className={cn(
              CHIP_BASE,
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { FilterChips }
export type { FilterChipsProps, FilterChipOption }
