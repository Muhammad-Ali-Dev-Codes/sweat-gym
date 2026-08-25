"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  Compass,
  Dumbbell,
  LayoutDashboard,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FireMark } from "@/components/brand/fire-mark";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/reports", label: "Reports", icon: ChartColumn },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: LucideIcon }>;

const SECONDARY_NAV_ITEMS = [
  { href: "/profile", label: "Profile", icon: User },
] as const satisfies ReadonlyArray<{ href: string; label: string; icon: LucideIcon }>;

export type ShellUser = {
  name?: string | null;
  email?: string | null;
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 items-center gap-3.5 rounded-xl text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        active
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 -left-[18px] h-6 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all duration-300 ease-out",
          active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
        )}
      />
      <Icon
        className={cn(
          "size-5 shrink-0 transition-transform duration-200",
          !active && "group-hover/sidebar:scale-110"
        )}
        strokeWidth={active ? 2.4 : 2}
      />
      <span className="translate-x-1 truncate whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100">
        {label}
      </span>
    </Link>
  );
}

export function DesktopSidebar({ user }: { user?: ShellUser | null }) {
  const pathname = usePathname();
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Athlete";
  const initials = getInitials(displayName);

  return (
    <aside className="group/sidebar fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col overflow-hidden border-r border-white/10 bg-sidebar transition-[width] duration-300 ease-out hover:w-[240px] lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full bg-white/6 blur-3xl"
      />

      <div className="flex h-16 shrink-0 items-center px-[18px]">
        <Link
          href="/"
          aria-label="SWEAT home"
          className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white shadow-lg">
            <FireMark className="size-5 text-[#ff5a1f]" />
          </span>
          <span className="translate-x-2 whitespace-nowrap font-[family-name:var(--font-geist-sans)] text-lg font-extrabold tracking-widest text-white opacity-0 transition-all duration-200 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100">
            SWEAT
          </span>
        </Link>
      </div>

      <nav
        aria-label="Primary"
        className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-[18px] py-4"
      >
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(pathname, href)}
          />
        ))}

        <div aria-hidden className="my-3 h-px shrink-0 bg-white/10" />

        {SECONDARY_NAV_ITEMS.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(pathname, href)}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-[18px]">
        <Link
          href="/profile"
          aria-label="Open profile"
          className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-black shadow-md">
            {initials}
          </span>
          <span className="min-w-0 translate-x-1 opacity-0 transition-all duration-200 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100">
            <span className="block truncate whitespace-nowrap text-sm font-semibold text-zinc-100">
              {displayName}
            </span>
            <span className="block whitespace-nowrap text-xs text-zinc-500">Member</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
