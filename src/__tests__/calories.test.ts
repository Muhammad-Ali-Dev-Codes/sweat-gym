import { describe, it, expect } from "vitest";
import { estimateCalories, calculateBMI } from "@/lib/calories";

describe("estimateCalories (uniform 5 s = 1 kcal rule)", () => {
  it("returns 0 for 0 seconds", () => {
    expect(estimateCalories(0)).toBe(0);
  });

  it("burns exactly 1,100 kcal per hour", () => {
    expect(estimateCalories(3600)).toBe(1100);
  });

  it("scales linearly with duration", () => {
    expect(estimateCalories(1800)).toBe(550);
    expect(estimateCalories(600)).toBe(183);
    expect(estimateCalories(60)).toBe(18);
    expect(estimateCalories(5)).toBe(2);
  });

  it("rounds to nearest integer", () => {
    expect(Number.isInteger(estimateCalories(117))).toBe(true);
  });

  it("returns 0 for invalid input", () => {
    expect(estimateCalories(-30)).toBe(0);
    expect(estimateCalories(Number.NaN)).toBe(0);
    expect(estimateCalories(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("calculateBMI", () => {
  it("calculates normal BMI", () => {
    const bmi = calculateBMI(70, 175);
    expect(bmi).toBe(22.9);
  });

  it("calculates overweight BMI", () => {
    const bmi = calculateBMI(95, 175);
    expect(bmi).toBe(31);
  });

  it("rounds to one decimal", () => {
    const bmi = calculateBMI(60, 170);
    const parts = String(bmi).split(".");
    expect(parts[1]?.length).toBeLessThanOrEqual(1);
  });
});
