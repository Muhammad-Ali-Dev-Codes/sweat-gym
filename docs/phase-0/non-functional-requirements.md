# Non-Functional Requirements — Gym Member Fitness PWA

Phase: Phase 0 — Requirements & Product Definition
Version: 0.1.0
Date: 2026-08-19
Source of truth: `/docs/master-project-context.md`

This document defines quality attributes that must be satisfied by the implementation. Each requirement is stated as an expectation; measurable thresholds will be refined during architecture (Phase 1) and QA (Phase 11).

---

## 1. Security

| ID | Requirement |
|----|-------------|
| NFR-SEC-01 | Strong authentication via Supabase Auth (email/password + Google OAuth). |
| NFR-SEC-02 | PostgreSQL Row Level Security (RLS) on all private tables; users access only their own data. |
| NFR-SEC-03 | Never expose server-side secrets to the client. |
| NFR-SEC-04 | Never expose service-role Supabase credentials in browser code. |
| NFR-SEC-05 | Never trust client-supplied user IDs; identity derived from the verified Supabase session. |
| NFR-SEC-06 | Elevated-privilege database operations run server-side only. |
| NFR-SEC-07 | All external/user input validated (Zod where appropriate). |
| NFR-SEC-08 | No personal data leakage in logs, notifications, or shared content. |
| NFR-SEC-09 | Deleted accounts and their private data are fully removed (cascade within scope). |
| NFR-SEC-10 | Public/shared content (exercises, workouts, base plans) must never contain private member data. |

---

## 2. Performance

| ID | Requirement |
|----|-------------|
| NFR-PERF-01 | Fast initial load on mobile (targets measured in Phase 1/11; avoid unnecessary third-party requests). |
| NFR-PERF-02 | Exercise data served primarily from our own backend/database after ingestion, not live calls to ExerciseDB. |
| NFR-PERF-03 | Lazy-load media (GIFs) in workout player; avoid blocking initial render. |
| NFR-PERF-04 | Efficient queries on common paths (plan view, reports) via indexes defined in Phase 2. |
| NFR-PERF-05 | Reports/aggregations computed from underlying records; avoid duplicated report tables without measured need. |
| NFR-PERF-06 | Bundle size discipline: keep dependencies minimal; code-split routes. |

---

## 3. Reliability

| ID | Requirement |
|----|-------------|
| NFR-REL-01 | No duplicate workout sessions (online or offline sync). |
| NFR-REL-02 | No accidental plan resets (missing days do not reset progression). |
| NFR-REL-03 | No loss of completed offline activity (durable local storage + idempotent sync). |
| NFR-REL-04 | Workout resume survives app exit, browser close, phone backgrounding, network loss. |
| NFR-REL-05 | Plan generation retry must not create duplicate user plans. |
| NFR-REL-06 | Idempotent completion handling (duplicate completion request does not double-record). |

---

## 4. Accessibility

| ID | Requirement |
|----|-------------|
| NFR-ACC-01 | Keyboard accessibility where relevant (desktop). |
| NFR-ACC-02 | Screen-reader-friendly labels for interactive elements (buttons, timers, exercises). |
| NFR-ACC-03 | Sufficient color contrast. |
| NFR-ACC-04 | Clear interactive/focus states. |
| NFR-ACC-05 | Reduced-motion support where practical. |
| NFR-ACC-06 | Meaningful error and empty states (not just visual cues). |

---

## 5. Responsiveness

| ID | Requirement |
|----|-------------|
| NFR-RES-01 | Mobile-first design targeting ~390px width. |
| NFR-RES-02 | Tablet compatible. |
| NFR-RES-03 | Desktop compatible. |
| NFR-RES-04 | Layout degrades gracefully across the above without breaking core flows. |

---

## 6. Offline Capability

| ID | Requirement |
|----|-------------|
| NFR-OFF-01 | V1 offline supports: view today's workout, view downloaded media, perform workout, timer, record completion, view recent progress. |
| NFR-OFF-02 | Discover is online-only in V1. |
| NFR-OFF-03 | Local storage via Dexie/IndexedDB; service worker via Serwist. |
| NFR-OFF-04 | Sync to Supabase on reconnect is idempotent and prevents duplicate sessions. |
| NFR-OFF-05 | Offline must not corrupt server data; conflicts resolved deterministically. |

---

## 7. Data Consistency

| ID | Requirement |
|----|-------------|
| NFR-DC-01 | Postgres foreign keys, unique constraints, check constraints, indexes per Phase 2 design. |
| NFR-DC-02 | No duplication of exercise data inside user plans (references, not copies). |
| NFR-DC-03 | No unnecessary duplication of report records. |
| NFR-DC-04 | Structured data (enums/lookup tables) rather than presentation labels. |
| NFR-DC-05 | BMI always derived from current height/weight; no stale stored BMI. |
| NFR-DC-06 | Historical weight entries never overwritten. |

---

## 8. Maintainability

| ID | Requirement |
|----|-------------|
| NFR-MNT-01 | TypeScript strict mode. |
| NFR-MNT-02 | Avoid `any` without documented justification. |
| NFR-MNT-03 | Reusable components and domain services; avoid giant components. |
| NFR-MNT-04 | Business logic out of presentation components; centralized constants/enums. |
| NFR-MNT-05 | API/data-access logic separated from UI. |
| NFR-MNT-06 | Versioned database migrations. |
| NFR-MNT-07 | Deterministic, testable personalization and streak logic. |
| NFR-MNT-08 | Documentation kept in sync with implementation (project memory). |

---

## 9. Observability

| ID | Requirement |
|----|-------------|
| NFR-OBS-01 | Useful technical logging without leaking sensitive data. |
| NFR-OBS-02 | Errors surfaced rather than silently swallowed. |
| NFR-OBS-03 | Sync and offline operations observable (success/failure/retry state). |
| NFR-OBS-04 | Performance-relevant logging where it matters (Phase 11). |

---

## 10. Error Handling

| ID | Requirement |
|----|-------------|
| NFR-ERR-01 | Every user-facing flow handles loading, error, empty, offline, and success states. |
| NFR-ERR-02 | Validation feedback is clear and actionable. |
| NFR-ERR-03 | Failures in optional features (e.g., notifications, media) degrade gracefully. |
| NFR-ERR-04 | Duplicate/conflicting submissions resolve deterministically (no double records). |
| NFR-ERR-05 | Workout interruption (crash, close, background, network) recovers to the correct resume state. |

---

## 11. Privacy

| ID | Requirement |
|----|-------------|
| NFR-PRV-01 | Member data is private; RLS guarantees isolation. |
| NFR-PRV-02 | Notification payloads contain no sensitive member data. |
| NFR-PRV-03 | Third-party media (ExerciseDB) not permanently relied upon; replaceable. |

---

## 12. Media & Content Licensing

| ID | Requirement |
|----|-------------|
| NFR-MED-01 | ExerciseDB free API treated as initial development/non-commercial source. |
| NFR-MED-02 | Media abstraction (external_source, external_exercise_id, animation/thumbnail/video URLs) so media is replaceable. |
| NFR-MED-03 | No scraping of YouTube/other sites; no copying of copyrighted media without permission. |
