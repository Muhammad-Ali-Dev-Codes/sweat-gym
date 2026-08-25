import { describe, it, expect } from "vitest";
import {
  ABSOLUTE_MAX_PLANNED_LOSS_KG,
  EXERCISE_KCAL_DAILY_CAP,
  buildPlanOptions,
  maxPlannedLossKg,
  plannedDailyDeficitKcal,
  DAILY_SESSION_TARGET_KCAL,
  DAILY_SESSION_TARGET_SECONDS,
  estimateSessionBurnKcal,
  planningEquivalentKg,
  PLANNING_KCAL_PER_KG,
  REJECT_ABOVE_CURRENT_MESSAGE,
  REJECT_LOW_BMI_MESSAGE,
  REJECT_MAX_LOSS_MESSAGE,
  REJECT_UNSUPPORTED_COMBO_MESSAGE,
  recognizeExerciseCalories,
  recognizedExerciseKcalByDay,
  requiredDurationForLoss,
  resolvePlanForLoss,
  SUPPORTED_PLANS,
  SUPPORTED_PLAN_DURATIONS,
  validatePlanSelection,
  validateTargetWeight,
} from "@/lib/weight-loss";

describe("plan duration caps (§2/§8)", () => {
  it("supports exactly 30/60/90-day plans", () => {
    expect(SUPPORTED_PLAN_DURATIONS).toEqual([30, 60, 90]);
  });

  it("caps planned loss at (days/30) x 4 kg", () => {
    expect(maxPlannedLossKg(30)).toBe(4);
    expect(maxPlannedLossKg(60)).toBe(8);
    expect(maxPlannedLossKg(90)).toBe(12);
  });
});

describe("the three supported tiers (§5)", () => {
  it("defines exactly three plans with the exact mapping", () => {
    expect(SUPPORTED_PLANS).toEqual([
      { lossKg: 4, durationDays: 30 },
      { lossKg: 8, durationDays: 60 },
      { lossKg: 12, durationDays: 90 },
    ]);
  });

  it("hard-caps planned loss at 12 kg (§12)", () => {
    expect(ABSOLUTE_MAX_PLANNED_LOSS_KG).toBe(12);
    expect(Math.max(...SUPPORTED_PLANS.map((p) => p.lossKg))).toBe(
      ABSOLUTE_MAX_PLANNED_LOSS_KG
    );
  });

  it("resolves exact losses to their tier and rejects everything else", () => {
    expect(resolvePlanForLoss(4)?.durationDays).toBe(30);
    expect(resolvePlanForLoss(8)?.durationDays).toBe(60);
    expect(resolvePlanForLoss(12)?.durationDays).toBe(90);
    for (const loss of [0, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 20]) {
      expect(resolvePlanForLoss(loss)).toBeNull();
    }
    expect(resolvePlanForLoss(Number.NaN)).toBeNull();
  });

  it("maps a tier loss to its required duration (§8)", () => {
    expect(requiredDurationForLoss(4)).toBe(30);
    expect(requiredDurationForLoss(8)).toBe(60);
    expect(requiredDurationForLoss(12)).toBe(90);
    expect(requiredDurationForLoss(5)).toBeNull();
    expect(requiredDurationForLoss(-2)).toBeNull();
  });
});

describe("validateTargetWeight (§8/§9/§10)", () => {
  const base = { heightCm: 175, planDays: 30 };

  it("rejects a target above current weight with the exact product message", () => {
    const result = validateTargetWeight({
      ...base,
      currentWeightKg: 70,
      targetWeightKg: 75,
    });
    expect(result).toEqual({
      ok: false,
      reason: "above-current",
      message: REJECT_ABOVE_CURRENT_MESSAGE,
    });
  });

  it("never silently modifies an above-current target (reject, not clamp)", () => {
    const result = validateTargetWeight({
      ...base,
      currentWeightKg: 70,
      targetWeightKg: 71,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts equal weight as a non-loss fitness goal", () => {
    const result = validateTargetWeight({
      ...base,
      currentWeightKg: 70,
      targetWeightKg: 70,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts the exact 4 kg / 30-day tier", () => {
    expect(
      validateTargetWeight({ ...base, currentWeightKg: 70, targetWeightKg: 66 })
    ).toEqual({ ok: true });
  });

  it("accepts the exact 8 kg / 60-day tier", () => {
    expect(
      validateTargetWeight({
        ...base,
        planDays: 60,
        currentWeightKg: 70,
        targetWeightKg: 62,
      })
    ).toEqual({ ok: true });
  });

  it("accepts the exact 12 kg / 90-day tier", () => {
    expect(
      validateTargetWeight({
        ...base,
        planDays: 90,
        currentWeightKg: 70,
        targetWeightKg: 58,
      })
    ).toEqual({ ok: true });
  });

  it("rejects targets below the BMI screening floor (§9)", () => {
    // 175 cm, 55 kg -> BMI ~17.96 (< 18.5)
    const result = validateTargetWeight({
      ...base,
      currentWeightKg: 80,
      targetWeightKg: 55,
    });
    expect(result).toEqual({
      ok: false,
      reason: "low-bmi",
      message: REJECT_LOW_BMI_MESSAGE,
    });
  });

  it("rejects a valid tier attached to the WRONG duration (§6)", () => {
    // 12 kg is a real tier — but never over 30 or 60 days.
    const wrong30 = validateTargetWeight({
      ...base,
      currentWeightKg: 82,
      targetWeightKg: 70,
    });
    expect(wrong30).toEqual({
      ok: false,
      reason: "unsupported-combo",
      message: REJECT_UNSUPPORTED_COMBO_MESSAGE,
    });
    expect(
      validateTargetWeight({
        ...base,
        planDays: 60,
        currentWeightKg: 82,
        targetWeightKg: 70,
      }).ok
    ).toBe(false);
  });

  it("hard-blocks any loss above 12 kg regardless of duration (§12)", () => {
    const result = validateTargetWeight({
      currentWeightKg: 75,
      targetWeightKg: 60,
      heightCm: 170,
      planDays: 90,
    });
    expect(result).toEqual({
      ok: false,
      reason: "max-loss",
      message: REJECT_MAX_LOSS_MESSAGE,
    });
  });

  it("rejects unsupported intermediate losses like 10 kg (§6)", () => {
    const result = validateTargetWeight({
      currentWeightKg: 70,
      targetWeightKg: 60,
      heightCm: 162,
      planDays: 90,
    });
    expect(result).toEqual({
      ok: false,
      reason: "unsupported-combo",
      message: REJECT_UNSUPPORTED_COMBO_MESSAGE,
    });
  });

  it("rejects custom durations outside 30/60/90 (§39)", () => {
    const result = validateTargetWeight({
      currentWeightKg: 70,
      targetWeightKg: 66,
      heightCm: 175,
      planDays: 45,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unsupported-combo");
    }
  });
});

describe("buildPlanOptions (§13/§15)", () => {
  it("derives exactly three cards from the current weight", () => {
    const options = buildPlanOptions({ currentWeightKg: 70, heightCm: 175 });
    expect(options.map((o) => [o.lossKg, o.durationDays])).toEqual([
      [4, 30],
      [8, 60],
      [12, 90],
    ]);
    expect(options.map((o) => o.targetWeightKg)).toEqual([66, 62, 58]);
    expect(options.every((o) => o.available)).toBe(true);
  });

  it("disables a tier whose implied target fails the BMI screen", () => {
    // 165 cm: 12 kg below a 62 kg start lands at BMI < 18.5.
    const options = buildPlanOptions({ currentWeightKg: 62, heightCm: 165 });
    expect(options[2].available).toBe(false);
    expect(options[2].unavailableReason).toBeTruthy();
  });
});

describe("validatePlanSelection invalid scenarios (§27/§39)", () => {
  const cases: [
    string,
    { currentWeightKg: number; targetWeightKg: number; planDurationDays: number },
  ][] = [
    ["70 -> 65 kg over 30 days", { currentWeightKg: 70, targetWeightKg: 65, planDurationDays: 30 }],
    ["70 -> 61 kg over 60 days", { currentWeightKg: 70, targetWeightKg: 61, planDurationDays: 60 }],
    ["70 -> 55 kg over 90 days", { currentWeightKg: 70, targetWeightKg: 55, planDurationDays: 90 }],
    ["12 kg over 60 days", { currentWeightKg: 82, targetWeightKg: 70, planDurationDays: 60 }],
    ["20 kg over 90 days", { currentWeightKg: 90, targetWeightKg: 70, planDurationDays: 90 }],
    ["weight-gain target", { currentWeightKg: 70, targetWeightKg: 75, planDurationDays: 30 }],
  ];

  for (const [name, input] of cases) {
    it(`rejects ${name}`, () => {
      const result = validatePlanSelection({
        ...input,
        heightCm: 178,
      });
      expect(result.ok).toBe(false);
    });
  }

  it("accepts every supported combination end-to-end", () => {
    expect(
      validatePlanSelection({ currentWeightKg: 70, targetWeightKg: 66, planDurationDays: 30, heightCm: 175 }).ok
    ).toBe(true);
    expect(
      validatePlanSelection({ currentWeightKg: 70, targetWeightKg: 62, planDurationDays: 60, heightCm: 175 }).ok
    ).toBe(true);
    expect(
      validatePlanSelection({ currentWeightKg: 70, targetWeightKg: 58, planDurationDays: 90, heightCm: 175 }).ok
    ).toBe(true);
  });
});

describe("planning equivalent (§3)", () => {
  it("treats 7,700 kcal as ~1.0 kg planning equivalent", () => {
    expect(planningEquivalentKg(7700)).toBeCloseTo(1.0);
    expect(PLANNING_KCAL_PER_KG).toBe(7700);
  });

  it("treats 3,850 kcal as ~0.5 kg planning equivalent", () => {
    expect(planningEquivalentKg(3850)).toBeCloseTo(0.5);
  });

  it("returns 0 for empty or invalid input", () => {
    expect(planningEquivalentKg(0)).toBe(0);
    expect(planningEquivalentKg(-100)).toBe(0);
    expect(planningEquivalentKg(Number.NaN)).toBe(0);
  });
});

describe("daily planning deficit (§3 pacing)", () => {
  it("paces every loss tier at the same ≈1,027 kcal/day total deficit", () => {
    expect(plannedDailyDeficitKcal(4, 30)).toBe(1027);
    expect(plannedDailyDeficitKcal(8, 60)).toBe(1027);
    expect(plannedDailyDeficitKcal(12, 90)).toBe(1027);
  });

  it("is not a single workout's burn and never applies to fitness plans", () => {
    expect(plannedDailyDeficitKcal(0, 30)).toBeNull();
    expect(plannedDailyDeficitKcal(-4, 30)).toBeNull();
    expect(plannedDailyDeficitKcal(Number.NaN, 90)).toBeNull();
  });
});

describe("one-hour session rule (60 min = 1,100 kcal)", () => {
  it("defaults to a 1-hour session worth 1,100 kcal", () => {
    expect(DAILY_SESSION_TARGET_SECONDS).toBe(3600);
    expect(DAILY_SESSION_TARGET_KCAL).toBe(1100);
  });

  it("burns 1,100 kcal per hour and scales linearly", () => {
    expect(estimateSessionBurnKcal()).toBe(1100);
    expect(estimateSessionBurnKcal(3600)).toBe(1100);
    expect(estimateSessionBurnKcal(1800)).toBe(550);
    expect(estimateSessionBurnKcal(600)).toBe(183);
    expect(estimateSessionBurnKcal(60)).toBe(18);
  });

  it("returns 0 for invalid input", () => {
    expect(estimateSessionBurnKcal(0)).toBe(0);
    expect(estimateSessionBurnKcal(-60)).toBe(0);
    expect(estimateSessionBurnKcal(Number.NaN)).toBe(0);
  });
});

describe("exercise calorie recognition cap (§6)", () => {
  it("caps a single 1,250 kcal workout at 1,000 recognized kcal", () => {
    expect(recognizeExerciseCalories(1250)).toBe(1000);
  });

  it("passes through estimates below the cap", () => {
    expect(recognizeExerciseCalories(350)).toBe(350);
  });

  it("reduces recognition by what earlier sessions already used today", () => {
    expect(recognizeExerciseCalories(600, 700)).toBe(300);
  });

  it("recognizes nothing once the day is fully capped", () => {
    expect(recognizeExerciseCalories(400, EXERCISE_KCAL_DAILY_CAP)).toBe(0);
  });

  it("never recognizes negative or invalid estimates", () => {
    expect(recognizeExerciseCalories(-50)).toBe(0);
    expect(recognizeExerciseCalories(Number.NaN)).toBe(0);
  });
});

describe("per-day recognition across sessions (§6/§7)", () => {
  const dayKey = (iso: string) => iso.slice(0, 10);

  it("caps each local day independently at 1,000 kcal", () => {
    const byDay = recognizedExerciseKcalByDay(
      [
        { completed_at: "2026-01-01T08:00:00Z", estimated_calories: 700 },
        { completed_at: "2026-01-01T18:00:00Z", estimated_calories: 600 },
        { completed_at: "2026-01-02T09:00:00Z", estimated_calories: 1250 },
      ],
      dayKey
    );
    expect(byDay.get("2026-01-01")).toBe(1000); // 700 + capped 300
    expect(byDay.get("2026-01-02")).toBe(1000); // 1250 capped to 1000
  });

  it("ignores sessions without a completion time", () => {
    const byDay = recognizedExerciseKcalByDay(
      [{ completed_at: null, estimated_calories: 500 }],
      dayKey
    );
    expect(byDay.size).toBe(0);
  });
});
