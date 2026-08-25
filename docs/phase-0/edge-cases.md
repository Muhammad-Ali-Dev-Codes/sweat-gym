# Edge Case Register — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

Central register of edge cases. Each entry: ID, category, scenario, expected behavior. Behavior is product-level; implementation details deferred to later phases.

---

## AUTH

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-A-01 | Signup with existing email | Error; offer login. |
| EC-A-02 | Unverified email tries to access protected app | Blocked from personalized experience; prompt verification. |
| EC-A-03 | Expired verification link | Resend verification option. |
| EC-A-04 | Wrong password | Clear error; no account info leakage. |
| EC-A-05 | Google OAuth failure | Clear error; user can retry or use email/password. |
| EC-A-06 | OAuth email conflict (Google email already used for password account) | Deterministic resolution (decide in Phase 3); documented in decisions.md. |
| EC-A-07 | Expired session | Redirect to login; preserve intended destination where possible. |
| EC-A-08 | Logout from active session | Session cleared; local cache policy per Phase 6. |
| EC-A-09 | Delete account | Confirm → delete account + private data → landing. |
| EC-A-10 | Re-login after deletion | Treated as fresh signup (no residual profile). |
| EC-A-11 | Password reset link expired | Request new reset link. |
| EC-A-12 | Duplicate signup submission (double-click) | Single account; idempotent handling. |

---

## ONBOARDING

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-O-01 | App closed halfway through onboarding | Progress preserved or clean restart per Phase 1 decision; no partial plan. |
| EC-O-02 | Back navigation between steps | Supported; previously entered values retained. |
| EC-O-03 | Missing required answer | Validation blocks progression until answered. |
| EC-O-04 | Invalid age | Validation with clear error and acceptable range. |
| EC-O-05 | Invalid height | Validation; reasonable range enforced. |
| EC-O-06 | Invalid weight | Validation; reasonable range enforced. |
| EC-O-07 | Target weight equal to current weight | Allowed (maintenance) — confirm in decisions.md. |
| EC-O-08 | Target weight greater than current weight | Allowed (gain journey is possible) — confirm in decisions.md. |
| EC-O-09 | Multiple restrictions selected | Supported (multi-select); all applied in safety filtering. |
| EC-O-10 | "No, I am fine" combined with other concerns | Contradictory; product decision (decisions.md): treat "No, I am fine" as exclusive selection. |
| EC-O-11 | Repeated plan generation submission | No duplicate plan; idempotent. |
| EC-O-12 | Plan generation interrupted (network/server) | Retry; no partial plan. |

---

## PLAN

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-P-01 | Day already completed | Shows completed; re-opening allowed for view/repeat as permitted (Phase 1). |
| EC-P-02 | Day locked (Day N+1 before N complete) | Locked state; cannot open. |
| EC-P-03 | User returns after several missed days | Plan does not reset; continue at next incomplete day. |
| EC-P-04 | Profile changes after plan created | Existing plan unchanged (R10); no regeneration in V1. |
| EC-P-05 | User attempts to skip plan day | Not possible; locked until previous completed. |
| EC-P-06 | Duplicate day completion (re-run) | No double-unlock side effects; session recorded; day already complete. |
| EC-P-07 | Re-opening a completed day | View permitted; repeating a completed workout permitted as defined (Phase 1). |
| EC-P-08 | Plan day performed on later calendar date | Stored as plan_day_number + actual_activity_date (separate). |

---

## WORKOUT

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-W-01 | User pauses | Timer pauses; resume continues. |
| EC-W-02 | User leaves app mid-workout | In-progress state retained; resume on return. |
| EC-W-03 | Browser closed mid-workout | State persisted locally; resume from last exercise. |
| EC-W-04 | Network loss during workout | Continue offline; record locally; sync later. |
| EC-W-05 | User resumes | Resume from last unfinished exercise/state. |
| EC-W-06 | User skips an exercise | Skipped (recorded); workout not failed. |
| EC-W-07 | User completes final exercise | Workout marked complete (even if some skipped). |
| EC-W-08 | Timer interruption (background/rest) | Timer state restored on resume. |
| EC-W-09 | Duplicate completion request | Idempotent; one session record. |
| EC-W-10 | Partially saved offline workout | Local in-progress/partial state reconciled on sync (Phase 6). |
| EC-W-11 | Discover workout repeated | New session each time; no restriction. |
| EC-W-12 | Missing media (GIF fails) | Fallback: thumbnail/placeholder + instructions still available. |

---

## DISCOVER

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-D-01 | Advanced workout opened by beginner | Allowed (R17); no blocking. |
| EC-D-02 | Incompatible exercise in selected workout | Replaced from controlled library; workout accessible. |
| EC-D-03 | Replacement unavailable | Deterministic fallback (decide in Phase 5); workout stays accessible, never silently unsafe. |
| EC-D-04 | Multiple incompatible exercises | All replaced per rule set. |
| EC-D-05 | Workout repeated multiple times | Allowed; each is a separate session. |
| EC-D-06 | Favorite toggled rapidly | Final state consistent; idempotent writes. |
| EC-D-07 | Missing media in Discover detail | Fallback placeholder; instructions remain. |
| EC-D-08 | Empty Discover category | Empty state shown (not an error). |

---

## REPORTS / ACTIVITY / GOAL

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-R-01 | No workouts recorded | Zero values + empty state; streak 0. |
| EC-R-02 | One workout | Correct single-entry totals. |
| EC-R-03 | Multiple workouts same day | All counted; totals aggregate correctly. |
| EC-R-04 | Plan + Discover activity in same period | Both included in reports/activity. |
| EC-R-05 | Discover-only day | Reports count it; plan daily goal does not advance. |
| EC-R-06 | No weight entries | Weight section shows empty state / guidance. |
| EC-R-07 | New user | Empty-but-correct state. |
| EC-R-08 | Time-range boundaries | Periods computed correctly at boundaries (Today/This Week/This Month/Last 30 Days/All Time). |

---

## WEIGHT / BMI

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-WT-01 | Invalid weight value | Validation error. |
| EC-WT-02 | Weight decreases/increases | Recorded historically; trend reflects change. |
| EC-WT-03 | Duplicate weight entries (same day/time) | Policy per Phase 1 (keep all or dedupe); never overwrite. |
| EC-WT-04 | Height change | BMI recomputed; plan unaffected (R10). |
| EC-B-01 | Missing height | BMI hidden/placeholder (no stale value). |
| EC-B-02 | Missing weight | BMI hidden/placeholder. |
| EC-B-03 | Height update | BMI updates automatically. |
| EC-B-04 | Weight update | BMI updates automatically. |

---

## NOTIFICATIONS

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-N-01 | Permission denied | Feature disabled; app fully functional. |
| EC-N-02 | Permission revoked later | Feature degrades gracefully; app functional. |
| EC-N-03 | Unsupported browser / environment | Notifications unavailable; app functional. |
| EC-N-04 | Notification service unavailable | Silent degradation; no app errors. |

---

## OFFLINE / SYNC

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-F-01 | App launched with no internet | Offline experience for supported features (today's workout, media, perform, recent progress). |
| EC-F-02 | Cached workout/media missing | Graceful fallback; no crash. |
| EC-F-03 | Offline completion | Recorded locally; synced later. |
| EC-F-04 | Network reconnects | Pending actions sync automatically. |
| EC-F-05 | Duplicate sync (retry/double) | Idempotent; no duplicate sessions. |
| EC-F-06 | Local/server conflict | Deterministic conflict resolution (Phase 6). |
| EC-F-07 | Stale cached workout | Refreshed from server when online; used when offline. |
| EC-F-08 | Missing media in cache | Placeholder/fallback. |

---

## ACCOUNT

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| EC-AC-01 | Delete account | Confirmation → full deletion of private data. |
| EC-AC-02 | Re-login after deletion | Fresh signup path; no residual data. |
| EC-AC-03 | Password reset | Reset email flow; token expiry handling. |
| EC-AC-04 | Logout from active session | Session cleared; offline local data policy per Phase 6. |
