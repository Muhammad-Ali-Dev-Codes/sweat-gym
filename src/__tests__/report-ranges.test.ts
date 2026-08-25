import { describe, it, expect } from "vitest";
import {
  resolveReportRange,
  previousReportRange,
  dayKeyInRange,
  dayKeysInRange,
  mondayIndex,
  reportRangeLabel,
  type ReportRangeKey,
} from "@/lib/reports/ranges";

describe("resolveReportRange", () => {
  it("today covers exactly the local day", () => {
    const r = resolveReportRange("today", "America/New_York");
    expect(r.startDayKey).toBe(r.endDayKey);
    expect(r.days).toBe(1);
  });

  it("thisWeek starts on Monday (local)", () => {
    const r = resolveReportRange("thisWeek", "UTC");
    expect(mondayIndex(r.startDayKey as string)).toBe(0);
    expect(r.days).toBe(7);
    // End is today; start never later than end.
    expect((r.startDayKey as string) <= r.endDayKey).toBe(true);
  });

  it("last7Days is a rolling window ending today", () => {
    const r = resolveReportRange("last7Days", "UTC");
    expect(r.days).toBe(7);
    expect(dayKeysInRange(r)).toHaveLength(7);
  });

  it("thisMonth starts on the 1st and spans the month length", () => {
    const r = resolveReportRange("thisMonth", "UTC");
    expect(r.startDayKey?.endsWith("-01")).toBe(true);
    expect((r.days as number) + (Number(r.startDayKey!.slice(8)) - 1)).toBeGreaterThanOrEqual(
      dayKeysInRange(r).length - 1
    );
  });

  it("handles UTC+14 dateline correctly (Kiritimati)", () => {
    // Late UTC instant may already be tomorrow in Kiritimati.
    const r = resolveReportRange("today", "Pacific/Kiritimati");
    expect(r.startDayKey).toBe(r.endDayKey);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(r.endDayKey)).toBe(true);
  });

  it("allTime has a null start", () => {
    const r = resolveReportRange("allTime", "UTC");
    expect(r.startDayKey).toBeNull();
    expect(r.days).toBeNull();
  });
});

describe("previousReportRange", () => {
  it("gives last week's Monday–Sunday for thisWeek", () => {
    const prev = previousReportRange({
      key: "thisWeek",
      startDayKey: "2026-08-17", // Monday
      endDayKey: "2026-08-22", // Saturday (today)
      days: 7,
    })!;
    expect(prev.startDayKey).toBe("2026-08-10"); // Monday
    expect(prev.endDayKey).toBe("2026-08-16"); // Sunday
    expect(prev.days).toBe(7);
  });

  it("gives the previous calendar month for thisMonth", () => {
    const prev = previousReportRange({
      key: "thisMonth",
      startDayKey: "2026-03-01",
      endDayKey: "2026-03-15",
      days: 31,
    });
    expect(prev?.startDayKey).toBe("2026-02-01");
    expect(prev?.endDayKey).toBe("2026-02-28");
    expect(prev?.days).toBe(28);
  });

  it("rolls back an equal-length window for rolling ranges", () => {
    const prev = previousReportRange({
      key: "last30Days",
      startDayKey: "2026-07-25",
      endDayKey: "2026-08-23",
      days: 30,
    });
    expect(prev?.days).toBe(30);
    expect(prev?.endDayKey).toBe("2026-07-24");
  });

  it("returns null for allTime", () => {
    const prev = previousReportRange(resolveReportRange("allTime", "UTC"));
    expect(prev).toBeNull();
  });
});

describe("dayKeyInRange", () => {
  const range = {
    key: "last7Days" as ReportRangeKey,
    startDayKey: "2026-08-16",
    endDayKey: "2026-08-22",
    days: 7,
  };

  it("includes boundaries", () => {
    expect(dayKeyInRange("2026-08-16", range)).toBe(true);
    expect(dayKeyInRange("2026-08-22", range)).toBe(true);
  });

  it("excludes outside days", () => {
    expect(dayKeyInRange("2026-08-15", range)).toBe(false);
    expect(dayKeyInRange("2026-08-23", range)).toBe(false);
  });

  it("unbounded start accepts any past day", () => {
    expect(
      dayKeyInRange("2000-01-01", { ...range, startDayKey: null })
    ).toBe(true);
  });
});

describe("labels", () => {
  it("maps every option to a label", () => {
    for (const opt of ["today", "thisWeek", "allTime"] as ReportRangeKey[]) {
      expect(reportRangeLabel(opt).length).toBeGreaterThan(0);
    }
  });
});
