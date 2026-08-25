# Phase 11 — Test Plan

## Layers

| Layer | Tooling | Scope |
|---|---|---|
| Unit | Vitest (13 files) | date/timezone math, stats & insights, calories, plan pacing/generation rules, achievements, notification grouping, offline sync queue/cache/workout logic |
| Type safety | `tsc --noEmit` | whole repo strict |
| Lint | ESLint (+react-hooks) | whole repo |
| Build | `next build` (prod) | compile + route generation + proxy |
| Data-layer E2E | `tsx src/scripts/e2e-phase11.ts` | live remote DB: security guards, RLS matrix, plan integrity, concurrency, cascade |
| HTTP E2E | `tsx src/scripts/api-phase11.ts` | prod build on scratch port: API auth/validation/attacks/replay |

## Security test design notes

- Test users are provisioned via the admin API (`email_confirm: true`) because the
  project enforces email confirmation; each suite signs in with real passwords on
  anon-key clients so every query runs under genuine RLS.
- RLS "silent filter" semantics: cross-account UPDATE/DELETE assert **zero affected
  rows** and the suites additionally verify via service role that victim rows are
  byte-identical after attacks.
- Counting uses a real column (`user_id`) with `head:true`; an earlier draft used a
  dummy column which PostgREST rejects (`count:null`) — corrected before certification
  so all pass/fail numbers are honest.
- All test artifacts (users A/B/U/V and their rows) are deleted at suite end;
  cleanup verified by the deletion-cascade section itself.

## Acceptance gates for this phase

- typecheck / lint(0 errors) / vitest / build all green
- e2e-phase11: 0 failures
- api-phase11: 0 failures
- `npm audit --omit=dev`: 0 vulnerabilities
- Every defect in qa-defects.md fixed or explicitly waived with rationale
