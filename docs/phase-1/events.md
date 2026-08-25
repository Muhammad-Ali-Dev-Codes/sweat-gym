# Observable Domain Events — Gym Member Fitness PWA

Phase: Phase 1 — System Architecture
Version: 0.1.0
Date: 2026-08-19

Event model for logging, analytics, and future integrations. V1 does not send all events to a third-party; the model is defined first, consumption decided in Phase 10/11 (Sentry, minimal analytics).

Format: snake_case event names. Payloads must never contain secrets or unnecessary personal data.

---

## 1. Auth & Account

| Event | Trigger | Key payload (no PII beyond needed) |
|-------|---------|-------------------------------------|
| `user_signed_up` | Signup completes | user_id (hashed/anonymous id) |
| `email_verified` | Email confirmed | user_id |
| `login_success` | Successful login | user_id, method (email/google) |
| `login_failed` | Failed login attempt | anonymized identifier, reason |
| `logout` | User logs out | user_id |
| `account_deleted` | Account deletion completed | user_id |
| `password_reset_requested` | Reset requested | anonymized identifier |
| `password_reset_completed` | Reset completed | user_id |

## 2. Onboarding & Plan

| Event | Trigger | Key payload |
|-------|---------|-------------|
| `onboarding_started` | Onboarding begins | user_id |
| `onboarding_step_completed` | A step answered | user_id, step number |
| `onboarding_completed` | All steps done | user_id, fitness_level |
| `plan_generated` | User plan created | user_id, plan_type, restriction flags count |
| `plan_generation_failed` | Generation error | user_id, error category |
| `plan_day_started` | Unlocked plan day workout started | user_id, plan_day_number |
| `plan_day_completed` | Plan day completed | user_id, plan_day_number, date |

## 3. Workout Player

| Event | Trigger | Key payload |
|-------|---------|-------------|
| `workout_started` | Any workout started | user_id, workout_id, source |
| `exercise_skipped` | Exercise skipped | user_id, workout_id, exercise_index |
| `workout_paused` | Paused | user_id, workout_id |
| `workout_resumed` | Resumed | user_id, workout_id |
| `workout_exited` | Exited mid-workout (resumable) | user_id, workout_id, exercise_index |
| `workout_completed` | Workout reached end | user_id, workout_id, source, duration_seconds, estimated_kcal |
| `workout_completion_rejected_duplicate` | Duplicate completion attempt deduped | user_id, client_action_id |

## 4. Discover & Favorites

| Event | Trigger | Key payload |
|-------|---------|-------------|
| `discover_workout_opened` | Workout detail opened | user_id, workout_id |
| `discover_workout_personalized` | Replacement applied | user_id, workout_id, replacements_count |
| `discover_workout_started` | Started from Discover | user_id, workout_id |
| `discover_workout_completed` | Completed from Discover | user_id, workout_id, duration_seconds |
| `favorite_added` | Heart selected | user_id, workout_id |
| `favorite_removed` | Heart unselected | user_id, workout_id |

## 5. Progress & Weight

| Event | Trigger | Key payload |
|-------|---------|-------------|
| `weight_recorded` | Weight entry saved | user_id, weight_kg (no other PII) |
| `profile_updated` | Profile edited | user_id, changed_fields (no values where sensitive) |
| `report_viewed` | Reports opened (period) | user_id, period |
| `weight_history_viewed` | Weight chart opened | user_id |

## 6. Notifications

| Event | Trigger | Key payload |
|-------|---------|-------------|
| `notification_permission_granted` | Permission granted | user_id |
| `notification_permission_denied` | Permission denied | user_id |
| `notification_permission_revoked` | Permission revoked later | user_id |
| `notification_preferences_updated` | Preferences saved | user_id |
| `notification_send_failed` | Push send error | user_id, reason (no content) |

## 7. Offline & Sync

| Event | Trigger | Key payload |
|-------|---------|-------------|
| `offline_action_queued` | Local outbox record created | user_id, action_type, client_action_id |
| `offline_sync_started` | Sync run begins | user_id, pending_count |
| `offline_sync_success` | Sync run succeeds | user_id, synced_count |
| `offline_sync_failure` | Sync run fails (transient) | user_id, error category, failed_count |
| `offline_sync_action_failed_permanent` | Record marked failed | user_id, action_type, reason |
| `offline_media_download_failed` | Media prefetch failed | user_id, workout_id, media_type |

## 8. Infra & External

| Event | Trigger | Key payload |
|-------|---------|-------------|
| `exercisedb_ingestion_started` | Ingestion run begins | run_id, batch |
| `exercisedb_ingestion_completed` | Ingestion run ends | run_id, imported, failed |
| `exercisedb_ingestion_failed` | Ingestion error | run_id, error category |
| `server_error` | Unhandled server error | error category, path (no user data) |
| `client_error` | Unhandled client error | error category (no user data) |

---

## Rules

- Event names are stable (contract).
- Payloads are minimal; never secrets, tokens, or raw stacks to analytics.
- Offline events must be reconstructible from local logs when outbox is offline.
- Sentry usage (Phase 11) focuses on `server_error`, `client_error`, `offline_sync_failure`, `workout_completion_rejected_duplicate`, `exercisedb_ingestion_*`.
