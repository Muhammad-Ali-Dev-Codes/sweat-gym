import { describe, it, expect } from "vitest";
import { groupNotifications } from "@/lib/notifications/grouping";
import type { AppNotification } from "@/lib/types/database";

function notification(id: string, createdAt: string): AppNotification {
  return {
    id,
    user_id: "u1",
    type: "workout_completed",
    title: "Workout complete",
    body: null,
    link: null,
    dedupe_key: null,
    read_at: null,
    created_at: createdAt,
  };
}

describe("groupNotifications", () => {
  it("splits Today / Yesterday / Earlier in the local calendar", () => {
    const now = new Date();
    const todayIso = new Date(now.getTime() - 2 * 3600_000).toISOString();
    const yesterdayIso = new Date(now.getTime() - 26 * 3600_000).toISOString();
    const earlierIso = new Date(now.getTime() - 80 * 3600_000).toISOString();

    const groups = groupNotifications(
      [
        notification("t", todayIso),
        notification("y", yesterdayIso),
        notification("e", earlierIso),
      ],
      "UTC"
    );

    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(groups[0].items[0].id).toBe("t");
  });

  it("keeps newest-first order inside a group", () => {
    const now = new Date();
    const older = new Date(now.getTime() - 3 * 3600_000).toISOString();
    const newer = new Date(now.getTime() - 1 * 3600_000).toISOString();

    const [today] = groupNotifications(
      [notification("older", older), notification("newer", newer)],
      "UTC"
    );
    expect(today.items.map((n) => n.id)).toEqual(["newer", "older"]);
  });

  it("omits empty groups entirely", () => {
    const groups = groupNotifications(
      [notification("old", "2024-01-01T10:00:00Z")],
      "UTC"
    );
    expect(groups.map((g) => g.label)).toEqual(["Earlier"]);
  });

  it("returns nothing for an empty feed", () => {
    expect(groupNotifications([], "UTC")).toEqual([]);
  });

  it("respects the timezone when deciding day boundaries (dateline)", () => {
    // 2026-08-22T12:00Z is already Aug 23 in Kiritimati (UTC+14).
    const now = new Date("2026-08-22T13:00:00Z"); // = Aug 23 03:00 local
    const groups = groupNotifications(
      [notification("k", "2026-08-22T12:00:00Z")],
      "Pacific/Kiritimati",
      now
    );
    expect(groups[0].label).toBe("Today");

    // Same instant in UTC is still Aug 22 — also "Today" there.
    const utcGroups = groupNotifications(
      [notification("u", "2026-08-22T12:00:00Z")],
      "UTC",
      now
    );
    expect(utcGroups[0].label).toBe("Today");
  });
});
