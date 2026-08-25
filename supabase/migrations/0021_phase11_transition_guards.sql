-- Migration 0021 (Phase 11): Server-side completion guards
--
-- QA-H1 (HIGH): the RLS policies on user_plan_days / workout_sessions grant
--   owners full row access, which technically lets a crafted API client set
--   status = 'completed' directly — bypassing complete_workout_session_rpc,
--   plan sequencing, pacing, and notification logic.
--
-- Fix: BEFORE-row triggers reject any INSERT or UPDATE that would produce a
-- 'completed' row while executing under a client role ('anon' or
-- 'authenticated'). Every legitimate completion flows through
-- complete_workout_session_rpc, which is SECURITY DEFINER and therefore runs
-- as the table owner ('postgres'), so the sanctioned paths are unaffected:
--   - finishWorkout server action  -> rpc
--   - offline /api/sync endpoint   -> upsert(in_progress) + rpc
--   - startWorkout sweeps          -> abandoned/in_progress (not blocked)
-- Non-completion writes (available, in_progress, abandoned, archived)
-- remain allowed for the application exactly as before.

CREATE OR REPLACE FUNCTION enforce_server_side_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Rewriting an already-completed row with the same status is a harmless
    -- idempotent touch; allow it regardless of role.
    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
      RETURN NEW;
    END IF;

    IF current_user IN ('anon', 'authenticated') THEN
      RAISE EXCEPTION
        'Direct completion of % is not permitted; use complete_workout_session_rpc',
        TG_TABLE_NAME;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_server_side_completion() IS
  'Phase 11 hardening: blocks client-role requests from writing completed rows directly; completions must go through the SECURITY DEFINER RPC.';

DROP TRIGGER IF EXISTS trg_user_plan_days_completion_guard ON user_plan_days;
CREATE TRIGGER trg_user_plan_days_completion_guard
  BEFORE INSERT OR UPDATE ON user_plan_days
  FOR EACH ROW
  EXECUTE FUNCTION enforce_server_side_completion();

DROP TRIGGER IF EXISTS trg_workout_sessions_completion_guard ON workout_sessions;
CREATE TRIGGER trg_workout_sessions_completion_guard
  BEFORE INSERT OR UPDATE ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_server_side_completion();
