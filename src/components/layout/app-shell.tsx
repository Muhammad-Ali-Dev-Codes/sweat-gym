"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { DesktopSidebar, type ShellUser } from "./desktop-sidebar";
import { MobileNav } from "./mobile-nav";
import { HeaderSyncStatus } from "@/components/header-sync-status";
import { FireMark } from "@/components/brand/fire-mark";

type AppShellProps = {
  children: ReactNode;
  user?: ShellUser | null;
  unreadNotifications?: number;
};

export function AppShell({ children, user, unreadNotifications = 0 }: AppShellProps) {
  const showBadge = unreadNotifications > 0;
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to main content
      </a>
      <DesktopSidebar user={user} />

      <div className="lg:pl-[72px]">
        {/* Mobile top header */}
        <header role="banner" className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl lg:hidden">
          <Link
            href="/"
            aria-label="SWEAT home"
            className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#ffc247] to-[#ff5a1f] shadow-md">
              <FireMark className="size-4 text-white" />
            </span>
            <span className="font-[family-name:var(--font-geist-sans)] text-base font-extrabold tracking-widest text-foreground">
              SWEAT
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <HeaderSyncStatus />
            <Link
              href="/notifications"
              aria-label={
                showBadge
                  ? `Notifications (${unreadNotifications} unread)`
                  : "Notifications"
              }
              className="relative grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Bell className="size-5" />
              {showBadge && (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-energy ring-2 ring-background"
                />
              )}
            </Link>
          </div>
        </header>

        {/* Desktop context bar */}
        <div className="hidden h-14 items-center justify-end gap-2 px-10 lg:flex">
          <Link
            href="/notifications"
            aria-label={
              showBadge
                ? `Notifications (${unreadNotifications} unread)`
                : "Notifications"
            }
            className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Bell className="size-[18px]" />
            {showBadge && (
              <span
                aria-hidden
                className="absolute top-1 right-1 size-2.5 rounded-full bg-energy ring-2 ring-background"
              />
            )}
          </Link>
          <HeaderSyncStatus />
        </div>

        <main id="main-content" role="main" className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-2 lg:pb-12">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
