-- Migration 0011: Row Level Security
-- Enables RLS on all tables and creates policies.
-- Private tables: user sees only their own data.
-- Public tables: any authenticated user can read.
-- Uses auth.uid() directly (Supabase provides this natively).

-- ============================================================
-- PRIVATE TABLES (user-owned, RLS enforced)
-- ============================================================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- FITNESS PROFILES
ALTER TABLE fitness_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fitness profile"
  ON fitness_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fitness profile"
  ON fitness_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fitness profile"
  ON fitness_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER PHYSICAL RESTRICTIONS
ALTER TABLE user_physical_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own physical restrictions"
  ON user_physical_restrictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own physical restrictions"
  ON user_physical_restrictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own physical restrictions"
  ON user_physical_restrictions FOR DELETE
  USING (auth.uid() = user_id);

-- WEIGHT ENTRIES
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight entries"
  ON weight_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries"
  ON weight_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries"
  ON weight_entries FOR DELETE
  USING (auth.uid() = user_id);

-- USER PLANS
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans"
  ON user_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON user_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON user_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER PLAN DAYS (access through user_plans join)
ALTER TABLE user_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan days"
  ON user_plan_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_plans.id = user_plan_days.user_plan_id
        AND user_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plan days"
  ON user_plan_days FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_plans.id = user_plan_days.user_plan_id
        AND user_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_plans.id = user_plan_days.user_plan_id
        AND user_plans.user_id = auth.uid()
    )
  );

-- WORKOUT SESSIONS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WORKOUT EXERCISE SESSIONS (access through workout_sessions join)
ALTER TABLE workout_exercise_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise sessions"
  ON workout_exercise_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = workout_exercise_sessions.workout_session_id
        AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own exercise sessions"
  ON workout_exercise_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = workout_exercise_sessions.workout_session_id
        AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own exercise sessions"
  ON workout_exercise_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = workout_exercise_sessions.workout_session_id
        AND workout_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = workout_exercise_sessions.workout_session_id
        AND workout_sessions.user_id = auth.uid()
    )
  );

-- FAVORITE WORKOUTS
ALTER TABLE favorite_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorite_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorite_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorite_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- PUSH SUBSCRIPTIONS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATION PREFERENCES
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SYNC OPERATIONS
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync operations"
  ON sync_operations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync operations"
  ON sync_operations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync operations"
  ON sync_operations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PUBLIC TABLES (read-only for authenticated users)
-- ============================================================

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_restriction_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_template_days ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Authenticated users can read levels"
  ON levels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read focus_areas"
  ON focus_areas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workout_categories"
  ON workout_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read equipment"
  ON equipment FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read physical_restrictions"
  ON physical_restrictions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read exercise_restrictions"
  ON exercise_restrictions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read muscles"
  ON muscles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read exercises"
  ON exercises FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read exercise_focus_areas"
  ON exercise_focus_areas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read exercise_levels"
  ON exercise_levels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read exercise_equipment"
  ON exercise_equipment FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read exercise_restriction_map"
  ON exercise_restriction_map FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read exercise_muscles"
  ON exercise_muscles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workouts"
  ON workouts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workout_exercises"
  ON workout_exercises FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workout_category_map"
  ON workout_category_map FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workout_focus_areas"
  ON workout_focus_areas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read workout_levels"
  ON workout_levels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read plan_templates"
  ON plan_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read plan_template_days"
  ON plan_template_days FOR SELECT
  TO authenticated USING (true);
