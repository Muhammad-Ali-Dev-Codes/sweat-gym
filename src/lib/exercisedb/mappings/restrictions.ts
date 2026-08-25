export const EXERCISE_RESTRICTIONS_MAP: Record<string, string[]> = {};

export function classifyRestrictions(
  name: string,
  equipments: string[],
  bodyParts: string[]
): string[] {
  const restrictions: string[] = [];
  const nm = name.toLowerCase();
  const bp = bodyParts.map((b) => b.toLowerCase());

  if (nm.includes("jump") || nm.includes("plyometric") || nm.includes("bounding") || nm.includes("hop")) {
    restrictions.push("no-jumping");
  }

  if (bp.includes("cardio") && (nm.includes("run") || nm.includes("sprint") || nm.includes("burpee"))) {
    restrictions.push("no-jumping");
  }

  if (nm.includes("plank") || nm.includes("walk") || nm.includes("march") ||
      nm.includes("yoga") || nm.includes("stretch") || nm.includes("swim")) {
    restrictions.push("low-impact");
  }

  if (nm.includes("crunch") || nm.includes("sit-up") || nm.includes("situp")) {
    restrictions.push("no-crunch");
  }

  if (nm.includes("back extension") || nm.includes("superman") || nm.includes("hyperextension")) {
    restrictions.push("back-sensitive");
  }

  if (nm.includes("deep squat") || nm.includes("full squat") || nm.includes("hindu squat")) {
    restrictions.push("knee-sensitive");
  }

  return restrictions;
}

export const EXERCISE_RESTRICTION_SLUGS = [
  "no-jumping",
  "low-impact",
  "knee-sensitive",
  "back-sensitive",
  "no-crunch",
] as const;
