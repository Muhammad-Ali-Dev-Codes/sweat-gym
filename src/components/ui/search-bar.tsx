"use client"

import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  return (
    <div data-slot="search-bar" className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Search..."}
        className="w-full rounded-full border border-border bg-muted/60 py-3.5 pr-5 pl-13 text-[15px] font-medium text-foreground transition-all outline-none placeholder:font-normal placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  )
}

export { SearchBar }
export type { SearchBarProps }
