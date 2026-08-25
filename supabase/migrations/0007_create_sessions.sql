-- Migration 0007: Workout Sessions & Exercise Sessions
-- Execution records for workouts (Plan or Discover source).
-- Each session is idempotent via client_operation_id.

-- ============================================================
-- WORKOUT SESSIONS
-- ============================================================
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE RESTRICT,
  source TEXT NOT NULL CHECK (source IN ('plan', 'discover')),
  user_plan_day_id UUID REFERENCES user_plan_days(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INT CHECK (duration_seconds > 0),
  estimated_calories INT CHECK (estimated_calories > 0),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'interrupted')),
  client_operation_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workout_sessions IS 'Records a completed or in-progress workout execution. client_operation_id ensures idempotency across offline sync.';

CREATE INDEX idx_workout_sessions_user_date ON workout_sessions (user_id, completed_at DESC);
CREATE INDEX idx_workout_sessions_user_source ON workout_sessions (user_id, source, completed_at DESC);
CREATE INDEX idx_workout_sessions_plan_day ON workout_sessions (user_plan_day_id);
CREATE INDEX idx_workout_sessions_operation ON workout_sessions (client_operation_id);

-- ============================================================
-- WORKOUT EXERCISE SESSIONS
-- ============================================================
CREATE TABLE workout_exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_sets INT DEFAULT 0 CHECK (completed_sets >= 0),
  actual_reps INT CHECK (actual_reps > 0),
  actual_duration_seconds INT CHECK (actual_duration_seconds > 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workout_exercise_sessions IS 'Per-exercise tracking within a workout session. Supports skip, resume, and actual performance recording.';

CREATE INDEX idx_exercise_sessions_session ON workout_exercise_sessions (workout_session_id);
CREATE INDEX idx_exercise_sessions_status ON workout_exercise_sessions (workout_session_id, status);
