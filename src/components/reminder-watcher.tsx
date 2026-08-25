"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { runDailyReminderCheck, type ReminderPrefs } from "@/lib/reminders/local-reminders";

/**
 * Mounted once inside the protected shell. Evaluates local workout
 * reminders on navigation and when the tab becomes visible again.
 * All conditions are checked inside runDailyReminderCheck — this wrapper
 * only decides WHEN to evaluate.
 */
export function ReminderWatcher({
  userId,
  timeZone,
  prefs,
  currentStreak,
}: {
  userId: string;
  timeZone: string;
  prefs: ReminderPrefs;
  currentStreak?: number;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const ctx = { userId, timeZone, prefs, currentStreak };
    void runDailyReminderCheck(ctx);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void runDailyReminderCheck(ctx);
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () =>
      document.removeEventListener("visibilitychange", onVisible);
    // Evaluate on every route change; ctx is rebuilt each render.
  }, [userId, timeZone, prefs, currentStreak, pathname]);

  return null;
}
