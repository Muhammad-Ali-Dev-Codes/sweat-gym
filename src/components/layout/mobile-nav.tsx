"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  Compass,
  Dumbbell,
  Ellipsis,
  LayoutDashboard,
  List,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/reports", label: "Reports", icon: ChartColumn },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: LucideIcon }>;

const MORE_NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/exercises", label: "Exercises", icon: List },
  { href: "/profile", label: "Profile", icon: User },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: LucideIcon }>;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_NAV_ITEMS.some(({ href }) => isActive(pathname, href));

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/85 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden"
    >
      <div className="relative mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)]">
        {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-16 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-medium transition-colors duration-200 outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full transition-all duration-300 ease-out group-active:scale-90",
                  active && "scale-110 bg-foreground/8"
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
        <div className="relative flex h-16 flex-col items-center justify-center">
          {moreOpen && (
            <div className="absolute right-1 bottom-[calc(100%-0.25rem)] w-44 overflow-hidden rounded-2xl border border-border bg-background p-1.5 shadow-xl" role="menu" aria-label="More navigation">
              {MORE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link key={href} href={href} role="menuitem" onClick={() => setMoreOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", active ? "bg-energy/10 text-energy" : "text-foreground hover:bg-secondary")}>
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
          <button type="button" aria-expanded={moreOpen} aria-haspopup="menu" aria-label="More navigation" onClick={() => setMoreOpen((open) => !open)} className={cn("group flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring", moreActive ? "text-energy" : "text-muted-foreground hover:text-foreground")}>
            <span className={cn("grid size-8 place-items-center rounded-full transition-all", moreActive && "scale-110 bg-energy/10")}>
              <Ellipsis className="size-[18px]" strokeWidth={moreActive ? 2.4 : 2} aria-hidden />
            </span>
            <span className="leading-none">More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
