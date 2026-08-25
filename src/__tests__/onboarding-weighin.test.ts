import { describe, it, expect } from "vitest";
import { shouldReplaceStartingWeighIn } from "@/services/onboarding";

describe("shouldReplaceStartingWeighIn", () => {
  const now = "2026-03-15T14:30:00.000Z";

  it("appends when there is no prior weigh-in", () => {
    expect(shouldReplaceStartingWeighIn(null, now, "UTC")).toBe(false);
  });

  it("replaces when the latest entry is from the same local day", () => {
    // 09:00 UTC on the same calendar day as `now` (14:30 UTC).
    expect(
      shouldReplaceStartingWeighIn("2026-03-15T09:00:00.000Z", now, "UTC")
    ).toBe(true);
  });

  it("appends when the latest entry is from an earlier day", () => {
    expect(
      shouldReplaceStartingWeighIn("2026-03-14T09:00:00.000Z", now, "UTC")
    ).toBe(false);
  });

  it("follows the local calendar across timezones (Tokyo)", () => {
    // 2026-03-15T17:00Z is already March 16 in Tokyo (+9).
    expect(
      shouldReplaceStartingWeighIn(
        "2026-03-15T17:00:00.000Z",
        "2026-03-16T01:00:00.000Z",
        "Asia/Tokyo"
      )
    ).toBe(true);
    // But in New York the first instant is Mar 15 13:00 EDT and the second
    // is Mar 16 01:00 EDT — different local days.
    expect(
      shouldReplaceStartingWeighIn(
        "2026-03-15T17:00:00.000Z",
        "2026-03-16T05:00:00.000Z",
        "America/New_York"
      )
    ).toBe(false);
  });

  it("falls back to a strict UTC-day comparison for unknown timezones", () => {
    expect(
      shouldReplaceStartingWeighIn("2026-03-15T09:00:00.000Z", now, "Not/AZone")
    ).toBe(true);
    expect(
      shouldReplaceStartingWeighIn("2026-03-14T23:59:00.000Z", now, "Not/AZone")
    ).toBe(false);
  });
});
