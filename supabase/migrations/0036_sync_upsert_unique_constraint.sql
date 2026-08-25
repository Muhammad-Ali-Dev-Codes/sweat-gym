-- ============================================================
-- 0036: Composite unique on workout_exercise_sessions
--
-- Root cause of "next plan day never opens": /api/sync upserts
-- per-exercise outcomes with
--   onConflict: "workout_session_id,workout_exercise_id"
-- but no such unique constraint existed, so EVERY offline-sync
-- delivery failed right after upserting the session row
-- (completed_at set, status still 'in_progress'). The completion
-- RPC never ran, the plan day stayed in_progress, and the next
-- day never unlocked.
--
-- Idempotent: dedupes any existing pairs, then adds the constraint
-- only when missing.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_exercise_sessions_session_exercise'
      AND conrelid = 'workout_exercise_sessions'::regclass
  ) THEN
    -- Safety dedupe before adding the constraint (keep the earliest row
    -- of each pair; live data had none, this only guards legacy DBs).
    DELETE FROM workout_exercise_sessions a
    USING workout_exercise_sessions b
    WHERE a.workout_session_id = b.workout_session_id
      AND a.workout_exercise_id = b.workout_exercise_id
      AND a.id > b.id;

    ALTER TABLE workout_exercise_sessions
      ADD CONSTRAINT uq_exercise_sessions_session_exercise
      UNIQUE (workout_session_id, workout_exercise_id);
  END IF;
END $$;

COMMENT ON CONSTRAINT uq_exercise_sessions_session_exercise ON workout_exercise_sessions IS
  'Idempotency key for offline-sync per-exercise upserts (onConflict target).';
