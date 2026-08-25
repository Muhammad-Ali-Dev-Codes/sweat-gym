import { describe, it, expect } from "vitest";
import { formatClock, formatMinutes } from "@/lib/duration";

describe("formatClock", () => {
  it("formats seconds under a minute with a zero minute", () => {
    expect(formatClock(45)).toBe("0:45");
    expect(formatClock(5)).toBe("0:05");
  });

  it("formats minutes:seconds", () => {
    expect(formatClock(105)).toBe("1:45");
    expect(formatClock(480)).toBe("8:00");
    expect(formatClock(3599)).toBe("59:59");
  });

  it("uses hours for sessions over an hour", () => {
    expect(formatClock(5400)).toBe("1:30:00");
  });

  it("rounds fractional seconds and handles invalid input", () => {
    expect(formatClock(105.6)).toBe("1:46");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(null)).toBe("0:00");
    expect(formatClock(undefined)).toBe("0:00");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });
});

describe("formatMinutes (aggregate totals)", () => {
  it("shows plain minutes under an hour", () => {
    expect(formatMinutes(45)).toBe("45 min");
  });

  it("splits hours and minutes like a human would say it", () => {
    expect(formatMinutes(156)).toBe("2 hr 36 min");
    expect(formatMinutes(60)).toBe("1 hr");
    expect(formatMinutes(120)).toBe("2 hr");
  });

  it("handles invalid input", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(null)).toBe("0 min");
    expect(formatMinutes(Number.NaN)).toBe("0 min");
  });
});
