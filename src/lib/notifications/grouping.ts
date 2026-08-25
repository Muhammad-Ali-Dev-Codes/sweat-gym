/**
 * Notification feed grouping — Today / Yesterday / Earlier,
 * computed in the user's local calendar so groups match the user's day.
 */

import { getLocalDayKey, shiftDayKey } from "@/lib/dates";
import type { AppNotification } from "@/lib/types/database";

export interface NotificationGroup {
  label: string;
  items: AppNotification[];
}

export function groupNotifications(
  notifications: readonly AppNotification[],
  timeZone: string,
  now: Date = new Date()
): NotificationGroup[] {
  const today = getLocalDayKey(now, timeZone);
  const yesterday = shiftDayKey(today, -1);

  const groups: NotificationGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const n of notifications) {
    const key = getLocalDayKey(n.created_at, timeZone);
    if (key === today) groups[0].items.push(n);
    else if (key === yesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  }

  // Newest-first inside every group regardless of input order.
  for (const g of groups) {
    g.items.sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
    );
  }

  return groups.filter((g) => g.items.length > 0);
}
