export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export type PushUpAbility =
  | "unable"
  | "0_5"
  | "5_10"
  | "10_20"
  | "20_plus";

export type PlankAbility =
  | "unable"
  | "0_30"
  | "30_60"
  | "60_120"
  | "120_plus";

export type PhysicalRestriction = "low_impact" | "no_jumping";

export type ExerciseMode = "reps" | "duration" | "both";

export type SessionSource = "plan" | "discover";

export type SessionStatus =
  | "in_progress"
  | "completed"
  | "abandoned"
  | "interrupted";

export type ExerciseSessionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type PlanDayStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed";

export type UserPlanStatus = "active" | "completed" | "archived";
