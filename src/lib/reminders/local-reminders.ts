"use client";

/**
 * Local workout-reminder engine.
 *
 * No server-side scheduling exists in this architecture, so reminders are
 * generated on-device while the PWA is open:
 *
 *  1. Browser notification permission must be granted (never requested here).
 *  2. The user's `workout_reminders` preference must be enabled.
 *  3. Local time must be at/after the user's `reminder_time`.
 *  4. Fires at most once per local day per user (localStorage guard).
 *  5. Skipped when a workout was already completed today, or when the user
 *     has an active streak and `streak_reminders` is off.
 *
 * Delivery goes through the ServiceWorker registration so notifications
 * behave like real push messages (and deep-link via notificationclick).
 */

import { getLocalDayKey } from "@/lib/dates";

const GUARD_PREFIX = "titan-reminder";

export interface ReminderPrefs {
  workout_reminders: boolean;
  streak_reminders: boolean;
  reminder_time: string;
}

export interface ReminderContext {
  userId: string;
  timeZone: string;
  prefs: ReminderPrefs;
  /** Current streak length — powers the "don't break the chain" variant. */
  currentStreak?: number;
}

function hhmmNow(timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function swRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    // showNotification requires a push subscription-capable SW; guard anyway.
    if (!reg.showNotification) return null;
    return reg;
  } catch {
    return null;
  }
}

/**
 * Evaluate reminder conditions and (possibly) show today's reminder.
 * Safe to call often — every path is cheap and idempotent.
 */
export async function runDailyReminderCheck(
  ctx: ReminderContext
): Promise<void> {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (!ctx.prefs.workout_reminders) return;

  const todayKey = getLocalDayKey(new Date(), ctx.timeZone);
  const guardKey = `${GUARD_PREFIX}:${ctx.userId}:${todayKey}`;
  if (window.localStorage.getItem(guardKey)) return;

  if (hhmmNow(ctx.timeZone) < ctx.prefs.reminder_time) return;

  const { hasCompletedWorkoutToday } = await import("@/app/actions/notifications");
  if (await hasCompletedWorkoutToday()) {
    window.localStorage.setItem(guardKey, "done");
    return;
  }

  const reg = await swRegistration();
  if (!reg) return;

  const streakActive = (ctx.currentStreak ?? 0) > 0;

  // Streak-protection variant respects its own preference.
  if (streakActive && !ctx.prefs.streak_reminders) return;

  try {
    await reg.showNotification(
      streakActive ? "Don't break the chain" : "Time to train",
      {
        body: streakActive
          ? `You're on a ${ctx.currentStreak}-day streak. A quick session keeps it alive.`
          : "Your workout is waiting. A few minutes is all it takes.",
        tag: `${GUARD_PREFIX}:${ctx.userId}:${todayKey}`,
        data: { url: "/workout" },
      }
    );
    window.localStorage.setItem(guardKey, "sent");
  } catch {
    // Notification failures never break the app.
  }
}
