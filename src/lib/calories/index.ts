import { estimateSessionBurnKcal } from "@/lib/weight-loss";

/**
 * Uniform product burn rate: a full 60-minute session = 1,100 kcal.
 * Deliberately weight- and intensity-independent — this is the single
 * source of truth used for session records, completion screens, and
 * daily capping. Delegates to the shared session-rate helper.
 */
export function estimateCalories(durationSeconds: number): number {
  return estimateSessionBurnKcal(durationSeconds);
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
