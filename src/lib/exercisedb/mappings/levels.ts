const BEGINNER_BODYWEIGHT = ["chest", "waist", "upper legs", "lower legs"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BEGINNER_EQUIPMENT = ["body weight", "mat"];

const ADVANCED_EQUIPMENT = ["barbell", "cable", "kettlebell"];
const ADVANCED_MOVEMENTS = ["pistol", "muscle-up", "handstand", "planche", "front lever", "dragon"];

export const EXERCISE_LEVEL_MAP: Record<string, string[]> = {};

export function classifyLevel(
  equipments: string[],
  bodyParts: string[],
  targetMuscles: string[],
  name: string
): string[] {
  const eq = equipments.map((e) => e.toLowerCase());
  const bp = bodyParts.map((b) => b.toLowerCase());
  const nm = name.toLowerCase();

  if (ADVANCED_MOVEMENTS.some((m) => nm.includes(m))) return ["intermediate", "advanced"];
  if (ADVANCED_EQUIPMENT.some((e) => eq.includes(e)) && bp.some((b) => ["shoulders", "back", "chest"].includes(b))) {
    return ["intermediate", "advanced"];
  }
  if (eq.includes("body weight") && BEGINNER_BODYWEIGHT.some((b) => bp.includes(b)) && nm.split(" ").length <= 3) {
    return ["beginner"];
  }
  if (eq.includes("dumbbell") && nm.includes("curl")) return ["beginner"];
  if (eq.includes("dumbbell") && nm.includes("press")) return ["beginner", "intermediate"];
  if (eq.includes("resistance band")) return ["beginner", "intermediate"];
  return ["beginner", "intermediate"];
}

export const LEVEL_SLUGS = ["beginner", "intermediate", "advanced"] as const;
