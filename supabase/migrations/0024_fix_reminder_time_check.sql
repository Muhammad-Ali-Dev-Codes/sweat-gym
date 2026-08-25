-- Migration 0024 (Phase 11): Repair unsatisfiable reminder_time CHECK
--
-- Live-testing defect (QA-H8): migration 0018 added
--   CHECK (reminder_time ~ '^([01]\\d|2[0-3]):[0-5]\\d$')
-- In a standard-conforming PostgreSQL string literal backslashes are plain
-- characters, so the stored pattern contains double backslashes and matches
-- nothing. Every INSERT/UPDATE failed -- including rows relying on the
-- column DEFAULT ('18:00') -- leaving notification_preferences empty and
-- the notifications settings feature broken since Phase 10.
--
-- Fix: replace the constraint with an equivalent backslash-free character-
-- class pattern that accepts HH:MM (00-23:00-59).

ALTER TABLE notification_preferences
  DROP CONSTRAINT notification_preferences_reminder_time_check;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_reminder_time_check
  CHECK (
    reminder_time IS NOT NULL
    AND length(reminder_time) = 5
    AND reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

COMMENT ON CONSTRAINT notification_preferences_reminder_time_check
  ON notification_preferences IS 'Local HH:MM (24h). Rebuilt in 0024 after over-escaped regex made the original unsatisfiable.';
