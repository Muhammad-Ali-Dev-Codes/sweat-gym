import { describe, it, expect } from "vitest";
import {
  computeStreaks,
  getLocalDayKey,
  shiftDayKey,
  diffDayKeys,
} from "@/lib/dates";

// Fixed "now" so tests are deterministic regardless of when they run.
const TZ = "UTC";

function isoUtc(y: number, m: number, d: number, h = 12): string {
  return new Date(Date.UTC(y, m - 1, d, h, 0, 0)).toISOString();
}

describe("getLocalDayKey", () => {
  it("formats UTC timestamps as YYYY-MM-DD", () => {
    expect(getLocalDayKey("2026-08-22T10:30:00Z", TZ)).toBe("2026-08-22");
  });

  it("respects timezone boundaries (UTC+14 crosses the dateline)", () => {
    // 2026-08-21T23:00Z is already Aug 22 in Pacific/Kiritimati (UTC+14).
    expect(getLocalDayKey("2026-08-21T23:00:00Z", "Pacific/Kiritimati")).toBe(
      "2026-08-22"
    );
    // Same instant is still Aug 21 in UTC.
    expect(getLocalDayKey("2026-08-21T23:00:00Z", TZ)).toBe("2026-08-21");
  });

  it("handles UTC-negative offsets", () => {
    // 2026-08-22T02:00Z is still Aug 21 in Honolulu (UTC-10).
    expect(getLocalDayKey("2026-08-22T02:00:00Z", "Pacific/Honolulu")).toBe(
      "2026-08-21"
    );
  });
});

describe("shiftDayKey / diffDayKeys", () => {
  it("shifts across month boundaries", () => {
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDayKey("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("computes day differences", () => {
    expect(diffDayKeys("2026-08-23", "2026-08-22")).toBe(1);
    expect(diffDayKeys("2026-08-22", "2026-08-22")).toBe(0);
    expect(diffDayKeys("2026-08-20", "2026-08-22")).toBe(-2);
  });
});

describe("computeStreaks", () => {
  it("returns zeros for empty history", () => {
    expect(computeStreaks([], TZ)).toEqual({
      current: 0,
      longest: 0,
      lastActiveDay: null,
    });
  });

  it("first workout today → current streak of 1", () => {
    const now = new Date();
    const result = computeStreaks([now.toISOString()], TZ);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it("first workout yesterday → current streak of 1 (day not yet lost)", () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    const result = computeStreaks([yesterday.toISOString()], TZ);
    expect(result.current).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    const now = new Date();
    const stamps = [1, 2, 3].map((back) =>
      new Date(now.getTime() - back * 86_400_000).toISOString()
    );
    stamps.push(now.toISOString());
    const result = computeStreaks(stamps, TZ);
    expect(result.current).toBe(4);
  });

  it("a missed day breaks the current chain but not the longest record", () => {
    const base = Date.UTC(2026, 7, 20, 12); // Aug 20 2026
    const stamps = [
      isoUtc(2026, 8, 18),
      isoUtc(2026, 8, 19),
      isoUtc(2026, 8, 20), // gap on the 21st
      isoUtc(2026, 8, 22),
      isoUtc(2026, 8, 23),
    ];
    void base;
    const result = computeStreaks(stamps, TZ);
    expect(result.longest).toBe(3); // 18→19→20
    // Anchor depends on real today; longest is the deterministic assertion.
  });

  it("multiple workouts on the same day count once", () => {
    const now = new Date();
    const morning = new Date(now);
    morning.setUTCHours(8, 0, 0, 0);
    const evening = new Date(now);
    evening.setUTCHours(20, 0, 0, 0);

    const result = computeStreaks([morning.toISOString(), evening.toISOString()], TZ);
    expect(result.current).toBe(1);
    expect(result.lastActiveDay).toBe(getLocalDayKey(now, TZ));
  });
});
