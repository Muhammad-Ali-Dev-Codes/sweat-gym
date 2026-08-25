-- 0030: Multi-video days — compose each day from several workouts
-- back-to-back into a true one-hour block (720 kcal at 1 kcal / 5 s).
--
-- user_plan_days keeps workout_id as the day's PRIMARY (first) video so
-- every existing flow (player, sessions, resume, reports) keeps working.
-- The full sequence lives in user_plan_day_blocks.

CREATE TABLE user_plan_day_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plan_day_id UUID NOT NULL REFERENCES user_plan_days(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE RESTRICT,
  position INT NOT NULL CHECK (position BETWEEN 1 AND 12),
  duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
  calories INT NOT NULL CHECK (calories > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_plan_day_id, position)
);

CREATE INDEX idx_user_plan_day_blocks_day
  ON user_plan_day_blocks(user_plan_day_id, position);

COMMENT ON TABLE user_plan_day_blocks IS
  'Ordered video blocks composing one plan day. Sum of duration_seconds per day = the day target; calories follow the uniform 1 kcal / 5 s burn rate.';

ALTER TABLE user_plan_day_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan day blocks"
  ON user_plan_day_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_plan_days d
      JOIN user_plans p ON p.id = d.user_plan_id
      WHERE d.id = user_plan_day_blocks.user_plan_day_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own plan day blocks"
  ON user_plan_day_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_plan_days d
      JOIN user_plans p ON p.id = d.user_plan_id
      WHERE d.id = user_plan_day_blocks.user_plan_day_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own plan day blocks"
  ON user_plan_day_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_plan_days d
      JOIN user_plans p ON p.id = d.user_plan_id
      WHERE d.id = user_plan_day_blocks.user_plan_day_id
        AND p.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS; no update policy needed (blocks are immutable
-- once written; regeneration deletes and rewrites them).

-- ---------------------------------------------------------------------------
-- Backfill: compose non-completed days of ACTIVE plans into exact 1-hour
-- sequences from the active catalog. Deterministic rotation by day_number
-- so consecutive days open with different videos. Mirrors composeDayBlocks().
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target CONSTANT INT := 3600;
  min_block CONSTANT INT := 240;
  day_row RECORD;
  catalog_row RECORD;
  pool_len INT;
  remaining INT;
  pos INT;
  total INT;
  used_ids UUID[] ;
  pick_idx INT;
  tries INT;
  dur INT;
  closes_hour BOOLEAN;
BEGIN
  FOR day_row IN
    SELECT d.id AS day_id, d.day_number, d.workout_id
    FROM user_plan_days d
    JOIN user_plans p ON p.id = d.user_plan_id
    WHERE p.status = 'active'
      AND d.status IN ('available', 'locked', 'in_progress')
  LOOP
    DELETE FROM user_plan_day_blocks WHERE user_plan_day_id = day_row.day_id;

    SELECT count(*) INTO pool_len FROM workouts WHERE is_active;
    IF pool_len IS NULL OR pool_len = 0 THEN
      CONTINUE;
    END IF;

    remaining := target;
    pos := 0;
    total := 0;
    used_ids := ARRAY[]::UUID[];
    pick_idx := ((day_row.day_number - 1) % pool_len);  -- rotation start

    WHILE total < target AND pos < 12 LOOP
      -- Next unused workout starting at pick_idx (wrap); allow repeats once exhausted.
      catalog_row := NULL;
      tries := 0;
      WHILE tries < pool_len LOOP
        SELECT * INTO catalog_row FROM workouts
        WHERE is_active
        ORDER BY created_at, id
        OFFSET ((pick_idx + tries) % pool_len)
        LIMIT 1;
        IF NOT (catalog_row.id = ANY(used_ids)) THEN
          pick_idx := (pick_idx + tries + 1) % pool_len;
          EXIT;
        END IF;
        catalog_row := NULL;
        tries := tries + 1;
      END LOOP;
      IF catalog_row IS NULL THEN
        -- All used today: restart from rotation point with repeats allowed.
        SELECT * INTO catalog_row FROM workouts
        WHERE is_active
        ORDER BY created_at, id
        OFFSET pick_idx LIMIT 1;
        used_ids := ARRAY[]::UUID[];
        pick_idx := (pick_idx + 1) % pool_len;
      END IF;

      remaining := target - total;
      closes_hour :=
        catalog_row.duration_seconds >= remaining
        OR (remaining - catalog_row.duration_seconds) < min_block;
      dur := CASE WHEN closes_hour THEN remaining ELSE catalog_row.duration_seconds END;

      pos := pos + 1;
      INSERT INTO user_plan_day_blocks
        (user_plan_day_id, workout_id, position, duration_seconds, calories)
      VALUES
        (day_row.day_id, catalog_row.id, pos, dur,
         GREATEST(1, ROUND(dur / 5.0)::INT));

      used_ids := used_ids || catalog_row.id;
      total := total + dur;
    END LOOP;

    -- Keep the day's primary video in sync with block #1.
    UPDATE user_plan_days d
    SET workout_id = b.workout_id, updated_at = now()
    FROM user_plan_day_blocks b
    WHERE d.id = b.user_plan_day_id
      AND b.position = 1
      AND d.id = day_row.day_id
      AND d.workout_id <> b.workout_id;
  END LOOP;
END $$;
