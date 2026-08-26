import type { PlanDurationDays } from "@/lib/weight-loss";

/**
 * Get the thumbnail path for a specific day in a workout plan.
 * @param dayNumber - The day number (1-based)
 * @param planDuration - The plan duration in days (30, 60, or 90)
 * @returns The path to the thumbnail image
 */
export function getPlanDayThumbnail(
  dayNumber: number,
  planDuration: PlanDurationDays
): string {
  const paddedDay = String(dayNumber).padStart(2, "0");
  return `/images/thumbnails/${planDuration}-day/day-${paddedDay}.jpg`;
}

/**
 * Get the workout type label for a specific day.
 * @param dayNumber - The day number (1-based)
 * @returns The workout type label
 */
export function getWorkoutTypeLabel(dayNumber: number): string {
  const workoutTypes = [
    "Chest & Triceps",
    "Back & Biceps",
    "Legs & Glutes",
    "Shoulders & Abs",
    "Full Body",
    "Arms & Core",
    "Cardio & HIIT",
  ];
  return workoutTypes[(dayNumber - 1) % workoutTypes.length];
}
