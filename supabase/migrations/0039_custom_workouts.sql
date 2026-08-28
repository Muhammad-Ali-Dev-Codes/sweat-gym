-- Migration 0039: User-owned custom workouts
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workouts_owner ON workouts (owner_user_id) WHERE owner_user_id IS NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can read workouts" ON workouts;
DROP POLICY IF EXISTS "Authenticated users can read workout_exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Authenticated users can read catalog and own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can create own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;
DROP POLICY IF EXISTS "Authenticated users can read catalog and own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can create own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can update own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can delete own workout exercises" ON workout_exercises;

CREATE POLICY "Authenticated users can read catalog and own workouts"
  ON workouts FOR SELECT TO authenticated
  USING (owner_user_id IS NULL OR owner_user_id = auth.uid());

CREATE POLICY "Users can create own workouts"
  ON workouts FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Authenticated users can read catalog and own workout exercises"
  ON workout_exercises FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND (workouts.owner_user_id IS NULL OR workouts.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create own workout exercises"
  ON workout_exercises FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workout exercises"
  ON workout_exercises FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workout exercises"
  ON workout_exercises FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.owner_user_id = auth.uid()
    )
  );

ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_source_check;
ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_source_check
  CHECK (source IN ('plan', 'discover', 'custom'));
