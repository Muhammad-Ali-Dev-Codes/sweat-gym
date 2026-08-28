export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  age: number;
  timezone: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FitnessProfile {
  id: string;
  user_id: string;
  fitness_level: string;
  push_up_ability: string;
  plank_ability: string;
  height_cm: number;
  target_weight_kg: number;
  plan_duration_days: number;
  created_at: string;
  updated_at: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  recorded_at: string;
  created_at: string;
}

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export type ExerciseType =
  | "strength"
  | "cardio"
  | "mobility"
  | "stretching"
  | "warm_up"
  | "cool_down"
  | "core"
  | "balance";

export interface Exercise {
  id: string;
  external_source: string | null;
  external_exercise_id: string | null;
  name: string;
  slug?: string;
  short_description?: string | null;
  description: string | null;
  instructions: string[] | null;
  animation_url: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  media_source: string;
  exercise_mode: string;
  difficulty?: ExerciseDifficulty;
  exercise_type?: ExerciseType;
  is_low_impact: boolean;
  requires_jumping: boolean;
  is_active: boolean;
  is_featured?: boolean;
  default_sets?: number | null;
  default_reps?: number | null;
  default_rest_seconds?: number | null;
  duration_seconds?: number | null;
  calories_estimate?: number | null;
  form_tips?: string[] | null;
  safety_notes?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseWithRelations extends Exercise {
  exercise_muscles: {
    muscle_id: string;
    is_primary: boolean;
    muscles: { name: string; slug: string } | null;
  }[];
  exercise_focus_areas: {
    focus_areas: { name: string; slug: string } | null;
  }[];
  exercise_levels: {
    levels: { name: string; slug: string } | null;
  }[];
  exercise_equipment: {
    equipment: { name: string; slug: string } | null;
  }[];
}

export interface ExerciseFavorite {
  user_id: string;
  exercise_id: string;
  created_at: string;
}

export type ExerciseSortOption = "name" | "difficulty" | "newest";

export interface ExerciseFilters {
  search?: string;
  category?: string;
  difficulty?: ExerciseDifficulty;
  muscle?: string;
  equipment?: string;
  exerciseType?: string;
  favoritesOnly?: boolean;
  sort?: ExerciseSortOption;
}

export interface Workout {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_seconds: number;
  estimated_calories: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_order: number;
  sets: number;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number;
  created_at: string;
}

export interface PlanTemplate {
  id: string;
  name: string;
  fitness_level_id: string;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanTemplateDay {
  id: string;
  plan_template_id: string;
  day_number: number;
  workout_id: string;
  target_duration_seconds: number;
  target_calories: number;
  created_at: string;
  updated_at: string;
}

export interface UserPlan {
  id: string;
  user_id: string;
  plan_template_id: string;
  /** Exact supported length: 30 / 60 / 90 days. */
  plan_duration_days: number;
  /** Planned-loss tier in kg: 0 (fitness), 4, 8, or 12. Hard max 12. */
  planned_loss_kg: number;
  starting_weight_kg: number | null;
  target_weight_kg: number | null;
  started_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UserPlanDay {
  id: string;
  user_plan_id: string;
  day_number: number;
  workout_id: string;
  target_duration_seconds: number;
  target_calories: number;
  status: string;
  unlocked_at: string | null;
  completed_at: string | null;
  actual_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

/** One video inside a composed plan day (ordered sequence filling the hour). */
export interface UserPlanDayBlock {
  id: string;
  user_plan_day_id: string;
  workout_id: string;
  position: number;
  duration_seconds: number;
  calories: number;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string;
  source: string;
  user_plan_day_id: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  estimated_calories: number | null;
  status: string;
  client_operation_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExerciseSession {
  id: string;
  workout_session_id: string;
  workout_exercise_id: string;
  status: string;
  completed_sets: number;
  actual_reps: number | null;
  actual_duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FavoriteWorkout {
  user_id: string;
  workout_id: string;
  created_at: string;
}

export type NotificationType =
  | "workout_completed"
  | "streak_milestone"
  | "achievement"
  | "plan_progress"
  | "recommendation"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  earned_at: string;
}

export interface PhysicalRestrictionRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface UserPhysicalRestriction {
  user_id: string;
  restriction_id: string;
}

export interface FocusArea {
  id: string;
  name: string;
  slug: string;
}

export interface Level {
  id: string;
  name: string;
  slug: string;
}

export interface Equipment {
  id: string;
  name: string;
  slug: string;
}

export interface WorkoutCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Muscle {
  id: string;
  name: string;
  slug: string;
}

export interface WorkoutExerciseSessionWithJoins extends WorkoutExerciseSession {
  workout_exercises: {
    id: string;
    exercise_order: number;
    sets: number;
    reps: number | null;
    duration_seconds: number | null;
    rest_seconds: number;
    exercises: {
      id: string;
      name: string;
      animation_url: string | null;
      instructions: string[] | null;
      exercise_mode: string;
      is_low_impact?: boolean;
      requires_jumping?: boolean;
    } | null;
  } | null;
}

export interface PlanDayWithWorkout extends UserPlanDay {
  workouts: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    duration_seconds: number;
    estimated_calories: number;
    workout_exercises: {
      id: string;
      exercise_order: number;
      sets: number;
      reps: number | null;
      duration_seconds: number | null;
      rest_seconds: number;
      exercises: {
        id: string;
        name: string;
        animation_url: string | null;
        instructions: string[] | null;
        exercise_mode: string;
        is_low_impact: boolean;
        requires_jumping: boolean;
        exercise_focus_areas: {
          focus_areas: { name: string; slug: string } | null;
        }[];
      };
    }[];
  };
}

export interface ExerciseFocusArea {
  exercise_id: string;
  focus_area_id: string;
}

export interface UserRestrictionRow {
  restriction_id: string;
  physical_restrictions: { slug: string }[] | null;
}

export interface RestrictionSlugRow {
  slug: string;
}

export interface SupabaseQueryRow {
  id: string;
  [key: string]: unknown;
}

export interface ExerciseSessionWithOrder {
  workout_session_id: string;
  workout_exercises: { exercise_order: number } | null;
}

export interface PlanDayWithWorkoutName extends UserPlanDay {
  workouts: { name: string } | null;
}
