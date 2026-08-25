# Phase 11 — Test Results

Date: 2026-08-23 (final certification run)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ clean |
| Lint | `npm run lint` | ✅ 0 errors, 2 pre-existing warnings (documented below) |
| Unit tests | `npm test` (vitest) | ✅ **142/142** in 13 files |
| Production build | `npm run build` | ✅ exit 0, 21 routes, Proxy active, no deprecation warnings |
| Dependency audit | `npm audit --omit=dev` | ✅ **0 vulnerabilities** |
| Data-layer E2E | `npx tsx src/scripts/e2e-phase11.ts` | ✅ **57/57** |
| HTTP API E2E | `TEST_PORT=… npx tsx src/scripts/api-phase11.ts` | ✅ **12/12** |

## Lint warnings (accepted)

1. `src/app/(protected)/profile/page.tsx:130` — exhaustive-deps on a stable
   `syncThemeCookie` helper defined outside the component; effect intentionally runs
   once on mount.
2. `src/components/ui/workout-card.tsx:59` — `<img>` for exercise GIFs; intentional:
   animated GIFs bypass `next/image` optimization by design.

## Flaky-infrastructure note

An initial typecheck/build failure at `notifications-client.tsx:211`
(Uint8Array<ArrayBufferLike> assignability) was traced to stale incremental build
state shared with the concurrently running dev server; it reproduced zero times
across subsequent clean builds and was not a code defect. The `.next` directory is
shared between `next dev` (user's session) and `next build`; production verification
runs were therefore executed immediately after a fresh build in the same shell.

## Migrations applied to remote

0020, 0021, 0022, 0023, 0024 — all verified present via
`npx supabase migration list` (local == remote through 0024).
