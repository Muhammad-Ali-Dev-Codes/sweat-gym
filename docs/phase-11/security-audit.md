# Phase 11 — Security Audit

Date: 2026-08-23
Scope: full application security review (auth, RLS, server actions, API routes,
RPC/SQL surface, secrets, client/server boundary) plus remediation and live
verification against the linked remote Supabase project.

## Methodology

1. **Static source review** of every trust boundary:
   - `src/lib/supabase/{client,server,admin}.ts` — key handling per context
   - `src/proxy.ts` (replaces deprecated `src/middleware.ts`) — route protection
   - `src/app/auth/callback/route.ts` — OAuth/code exchange
   - All server actions under `src/app/actions/**`
   - `src/app/api/sync/route.ts`, `src/app/api/health/route.ts`
   - `src/services/workout/completion.ts` and the completion RPC chain
   - Migrations 0010–0018 for policy drift across phases
2. **Secrets scan**: no keys in `src/` or `public/`; `.env.local` gitignored;
   service-role confined to account deletion action + dev scripts; no
   `NEXT_PUBLIC_*` secret leakage.
3. **Boundary check**: no `"use server"` module imported by client components;
   no service-role client reachable from browser code.
4. **Live verification** (`src/scripts/e2e-phase11.ts`, `src/scripts/api-phase11.ts`)
   executed against the remote project: RLS penetration matrix, RPC abuse,
   concurrency, HTTP-level API attacks, deletion cascade. **57/57 + 12/12 pass.**

## Headline Findings (all remediated)

| ID | Severity | Summary |
|----|----------|---------|
| QA-C1 | CRITICAL | Migration 0018 re-introduced a weak anonymous guard in the completion RPC |
| QA-C2 | CRITICAL | Legacy `complete_plan_day` SECURITY DEFINER function had zero ownership checks and was never revoked |
| QA-H7 | HIGH | PL/pgSQL `SELECT INTO` nulled preference defaults when no settings row existed → notifications silently disabled for members who never opened Settings |
| QA-H8 | HIGH | Unsatisfiable CHECK on `notification_preferences.reminder_time` (over-escaped regex) made the table unwritable since Phase 10 |
| QA-H9 | HIGH | `/api/sync` omitted the NOT NULL `client_operation_id`, so every queued offline completion failed at delivery |

Full register: [qa-defects.md](./qa-defects.md).

## Result

**PASS** after fixes. No known critical/high exposures remain. Residual risks are
documented in production-readiness.md.
