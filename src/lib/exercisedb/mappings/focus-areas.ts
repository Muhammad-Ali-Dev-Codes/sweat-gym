export const BODY_PART_TO_FOCUS_AREA: Record<string, string> = {
  "chest": "chest",
  "back": "full-body",
  "upper arms": "arm",
  "lower arms": "arm",
  "waist": "abs",
  "upper legs": "butt-and-legs",
  "lower legs": "butt-and-legs",
  "cardio": "full-body",
  "shoulders": "arm",
  "neck": "full-body",
  "lower back": "full-body",
  "upper back": "full-body",
};

export const FOCUS_AREA_SLUGS = [
  "full-body",
  "abs",
  "arm",
  "chest",
  "butt-and-legs",
] as const;
