# Notifications

## Data Model

### push_subscriptions

Stores Web Push API subscription data for each device a user registers.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users, not null |
| endpoint | text | Web Push subscription endpoint URL |
| p256dh | text | ECDH public key (client public key) |
| auth | text | Auth secret used to encrypt the payload |
| created_at | timestamptz | Defaults to now() |
| revoked_at | timestamptz | Nullable; set on logout to soft-delete |

A unique constraint on `(user_id, endpoint)` prevents duplicate subscriptions for the same device.

### notification_preferences

Per-user opt-in flags for each notification type.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users, not null, unique |
| workout_reminders | boolean | Defaults to true |
| streak_reminders | boolean | Defaults to true |
| created_at | timestamptz | Defaults to now() |
| updated_at | timestamptz | Updated on every change |

## Notification Types

- **workout_reminders**: Sent daily to prompt the user to complete their scheduled workout for the current plan day.
- **streak_reminders**: Sent when the user is at risk of breaking their consecutive-day streak (e.g., a reminder later in the day if they haven't logged a workout yet).

## Subscription Lifecycle

1. **Register**: User grants push permission in the browser; the service worker returns a PushSubscription.
2. **Store**: Client sends the subscription (endpoint, p256dh, auth) to the server, which upserts into `push_subscriptions`.
3. **Deliver**: A server-side cron or edge function loads active subscriptions for users whose preferences are enabled, then sends push via the `web-push` library.
4. **Revoke**: On logout the client calls the revoke endpoint, which sets `revoked_at` on the subscription. Revoked subscriptions are excluded from delivery queries.

## Row Level Security

- Users can `SELECT`, `INSERT`, `UPDATE`, and `DELETE` only their own rows in `push_subscriptions` and `notification_preferences`.
- Service-role keys bypass RLS for the cron job that sends pushes (it reads all un-revoked subscriptions across users).

## Push Delivery (Phase 10)

Actual push delivery is implemented in Phase 10. The database schema and RLS policies are defined here so that Phase 10 can simply query the existing tables and call the `web-push` library without further schema changes.
