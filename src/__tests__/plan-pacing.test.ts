import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { decideLockedDayStart } from "@/services/plan";

describe("decideLockedDayStart (next day opens on next calendar day)", () => {
  const tz = "Asia/Karachi";

  it("unlocks when previous day was completed on an earlier local day", () => {
    const decision = decideLockedDayStart(
      { status: "completed", completed_at: "2026-08-22T14:30:00Z" },
      tz,
      "2026-08-23"
    );
    expect(decision).toBe("unlock");
  });

  it("holds until tomorrow when previous day was completed today", () => {
    // 2026-08-23T10:00Z == 15:00 PKT on Aug 23 -> same local day.
    const decision = decideLockedDayStart(
      { status: "completed", completed_at: "2026-08-23T10:00:00Z" },
      tz,
      "2026-08-23"
    );
    expect(decision).toBe("same-day");
  });

  it("waits when previous day is not completed yet", () => {
    expect(
      decideLockedDayStart({ status: "available", completed_at: null }, tz, "2026-08-23")
    ).toBe("prev-incomplete");
    expect(
      decideLockedDayStart({ status: "locked", completed_at: null }, tz, "2026-08-23")
    ).toBe("prev-incomplete");
  });

  it("waits when there is no previous day row", () => {
    expect(decideLockedDayStart(null, tz, "2026-08-23")).toBe("prev-incomplete");
  });

  it("crosses the local-midnight boundary in the user's timezone", () => {
    // Completed 23:50 PKT Aug 22 (= 18:50 UTC); now 00:05 PKT Aug 23.
    expect(
      decideLockedDayStart(
        { status: "completed", completed_at: "2026-08-22T18:50:00Z" },
        tz,
        "2026-08-23"
      )
    ).toBe("unlock");

    // Same instant, but still Aug 22 locally -> same-day hold.
    expect(
      decideLockedDayStart(
        { status: "completed", completed_at: "2026-08-22T18:50:00Z" },
        tz,
        "2026-08-22"
      )
    ).toBe("same-day");
  });
});
