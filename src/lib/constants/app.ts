export const APP_NAME = "Gym Member Fitness PWA";
export const APP_SHORT_NAME = "GymPWA";

export const WEIGHT_UNIT = "kg" as const;
export const HEIGHT_UNIT = "cm" as const;

export const PLAN_DURATION_DAYS = 30;
export const MIN_DAY_NUMBER = 1;
export const MAX_DAY_NUMBER = 30;

export const EXERCISE_DB_BASE_URL = "https://oss.exercisedb.dev/api/v1";

export const CACHE_KEYS = {
  profile: ["profile"],
  fitnessProfile: ["fitness-profile"],
  userPlan: ["user-plan"],
  planDays: ["plan-days"],
  discoverWorkouts: ["discover-workouts"],
  exercises: ["exercises"],
  weightEntries: ["weight-entries"],
  favorites: ["favorites"],
  notifications: ["notifications"],
} as const;

export const TOAST_DURATION = 3000;
