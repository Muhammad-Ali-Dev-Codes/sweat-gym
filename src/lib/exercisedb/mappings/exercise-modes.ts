export const EXERCISE_MODE_MAP: Record<string, string> = {};

export function classifyExerciseMode(
  name: string,
  bodyParts: string[]
): "reps" | "duration" | "both" {
  const nm = name.toLowerCase();
  const bp = bodyParts.map((b) => b.toLowerCase());

  if (bp.includes("cardio")) return "duration";
  if (nm.includes("plank") || nm.includes("hold") || nm.includes("stretch") ||
      nm.includes("wall sit")) return "duration";
  if (nm.includes("jumping jack") || nm.includes("mountain climber") ||
      nm.includes("burpee")) return "both";
  return "reps";
}
