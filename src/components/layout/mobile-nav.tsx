"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  Compass,
  Dumbbell,
  LayoutDashboard,
  List,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/exercises", label: "Exercises", icon: List },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/reports", label: "Reports", icon: ChartColumn },
  { href: "/discover", label: "Discover", icon: Compass },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: LucideIcon }>;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/85 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-7 px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)]">
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
      </div>
    </nav>
  );
}
