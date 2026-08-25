-- Migration 0008: Favorites & Notifications
-- User favorites, push subscription management, and notification preferences.

-- ============================================================
-- FAVORITE WORKOUTS
-- ============================================================
CREATE TABLE favorite_workouts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workout_id)
);

COMMENT ON TABLE favorite_workouts IS 'User''s favorited workouts for quick access.';

CREATE INDEX idx_favorite_workouts_workout ON favorite_workouts (workout_id);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, endpoint)
);

COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions. revoked_at marks soft-delete.';

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id) WHERE revoked_at IS NULL;

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_reminders BOOLEAN NOT NULL DEFAULT true,
  streak_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE notification_preferences IS 'Per-user notification opt-in preferences.';
