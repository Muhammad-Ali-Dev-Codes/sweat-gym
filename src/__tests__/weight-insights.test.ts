import { describe, expect, it } from "vitest";
import { filterWeightEntries, weightChange, weightTrendInsight } from "@/lib/weight-insights";

const now = new Date("2026-08-27T12:00:00Z");
const entries = [
  { recorded_at: "2026-05-01T10:00:00Z", weight_kg: 85 },
  { recorded_at: "2026-08-01T10:00:00Z", weight_kg: 82.5 },
  { recorded_at: "2026-08-25T10:00:00Z", weight_kg: 81.8 },
];

describe("weight insights", () => {
  it("filters the requested history range", () => {
    expect(filterWeightEntries(entries, "30", now)).toHaveLength(2);
    expect(filterWeightEntries(entries, "all", now)).toHaveLength(3);
  });

  it("calculates change from the earliest to latest entry", () => {
    expect(weightChange(entries)).toBe(-3.2);
    expect(weightChange([entries[0]])).toBeNull();
  });

  it("returns deterministic trend insights", () => {
    expect(weightTrendInsight([], 75)).toContain("first weigh-in");
    expect(weightTrendInsight(entries, 75)).toContain("trending down 3.2 kg");
    expect(weightTrendInsight([{ recorded_at: "2026-08-27T10:00:00Z", weight_kg: 75 }, { recorded_at: "2026-08-27T11:00:00Z", weight_kg: 75 }], 75)).toContain("target weight");
  });
});