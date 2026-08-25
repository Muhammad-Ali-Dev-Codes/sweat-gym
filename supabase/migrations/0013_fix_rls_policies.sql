-- Migration 0013: Fix RLS policies for server-side Supabase client
-- Problem: Reference table policies used TO authenticated, but the server-side
-- Supabase client (@supabase/ssr via next/headers cookies) wasn't resolving the
-- authenticated PostgREST role. Changed all read-only reference policies to
-- TO public with USING (true) to match user-data table patterns.
-- Also added missing INSERT policy on user_plan_days (was silently blocking
-- plan generation from creating day rows).

-- ============================================================
-- FIX: Reference table read policies → TO public
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE roles = '{authenticated}'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      r.policyname, r.tablename
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (true)',
      r.policyname, r.tablename
    );
  END LOOP;
END $$;

-- ============================================================
-- FIX: Add INSERT policy on user_plan_days
-- ============================================================
CREATE POLICY "Users can insert own plan days"
  ON user_plan_days FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plans
      WHERE user_plans.id = user_plan_days.user_plan_id
        AND user_plans.user_id = auth.uid()
    )
  );
