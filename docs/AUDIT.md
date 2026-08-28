# SWEAT Fitness PWA — Full Project Audit

- **Audit date:** 2026-08-28
- **Scope:** Full-stack fitness PWA (Next.js 16 App Router + Turbopack, React 19, TypeScript strict, Supabase, Serwist PWA, Dexie offline sync, TanStack Query, Tailwind v4, `@base-ui/react`)
- **Method:** Static code review, 4 automated audit agents + 2 focused deep-dives (plan-editing + UX/a11y), real production perf measurements (Playwright + system Chrome), 264 unit tests, typecheck + lint.
- **Verdict:** `69 / 100` — **Production-worthy MVP with clear, actionable hardening paths.** The product is genuinely polished, brandable, and feature-rich; the gaps are in hardening (security hygiene, dialog focus management, edit-plan feature completeness, coverage, some performance tail-latency) rather than fundamentals.

---

## 1. Rubric Scorecard

| # | Dimension | Score | Verdict |
|---|-----------|:-----:|---------|
| A | Product & Scope Fidelity | 9/10 | Strong adherence to a coherent product vision |
| B | Architecture & Code Quality | 7/10 | Solid layering, but a few monoliths & coupling |
| C | Database & Data Integrity | 8/10 | 42 migrations, RLS everywhere; a few design gaps |
| D | Authentication & Security | 5/10 | Correct patterns, but fail-open fallback + plaintext keys |
| E | UI / UX Quality | 8.5/10 | Polished, branded consumer feel |
| F | Accessibility | 6.5/10 | Good baseline; dialog focus + reduced-motion gaps |
| G | Performance | 7.5/10 | Big wins landed; tail-latency + concurrent-scan remains |
| H | PWA & Offline | 8.5/10 | Hero feature, robust sync |
| I | DevOps & Release | 6/10 | Complete tooling, light CI/env-security hygiene |
| J | Test Coverage & Quality | 7/10 | 264 tests, but 0 integration/E2E on protected flows |
| | **FINAL** | **69/100** | **Solid, shippable MVP — hardening needed for v1.0** |

**Why 69 and not higher:** the top risks are a **fail-open authentication fallback on mutation paths**, **plaintext production keys in `.env.local`** (including a Supabase **service-role** key), **no E2E coverage on any protected flow**, **"Edit Today's Plan" ships with dead/non-functional controls**, and **no focus management in any of the 4 modals**. None are architecture-level blockers, so the score stays "good, not excellent."

---

## 2. Top Strengths (the "keep this" list)

1. **Cohesive, branded, consumer-grade UI.** A real design system exists — `oklch` tokens, radius scale, `Energy` accent, `titan-card`/`titan-hero` primitives, `tabular-nums` metrics, emotional microcopy ("planned loss is a safety-screened cap, not a guarantee"), timezone-aware greetings/streaks. This reads like a shipped product, not a CRUD demo.
2. **The offline sync layer is the standout.** Dexie cache + idempotency via `operationId`, `MAX_SYNC_ATTEMPTS=8`, `getPendingSyncCount()` gating, verified-user-only sync route with zod validation. Genuinely hard, genuinely done.
3. **Backend choice — clone-and-repoint for plan customization.** The "Edit Today's Plan" persistence model (new owned row + repoint `workout_id`, RLS ownership, historical workouts frozen via `ON DELETE RESTRICT`) is architecturally correct and survives logout/login, multi-user isolation, and cross-day traffic. The *feature is sound; only its UI is incomplete.*
4. **Mobile-first layout discipline.** Every route is `grid-cols-1 → lg:grid-cols-N`; workout player pins controls above the mobile nav. Touch targets on primary CTAs are ≥44px.
5. **Semantic HTML discipline.** Real `<button>`/`<Link>` throughout, meaningful `aria-label`s, global `:focus-visible` ring, decorative icons consistently `aria-hidden`.
6. **Test rigor on pure functions** — 264 tests across 25 files (dates, pacing, calories/weight-loss math, report ranges/insights, offline, rate-limiting, migration contracts).

---

## 3. Weaknesses & Problem Inventory (ranked by severity)

### 🔴 Critical (fix before launch)

| ID | Problem | Evidence | Fix |
|----|---------|----------|-----|
| **C1** | **Supabase SERVICE-ROLE key is plaintext in `.env.local`.** This key bypasses ALL RLS. If committed/leaked, the whole DB is owned. | `.env.local` | Rotate it, move server-only secrets to a secret manager / CI env where not committed, never ship to client. |
| **C2** | **Auth fallback is fail-open on mutation paths.** `getAuthUser` (timeout 1500ms, onboarding 10s) returns the *local session* user on network failure/timeout — signalling "authenticated" without a live token check. `submitOnboarding` runs on this path. | `src/lib/supabase/auth-user.ts:51-72`, `src/app/actions/onboarding.ts:53` | Onboarding is lower-risk (writes below RLS), but **verify every mutation path explicitly uses fail-closed `getVerifiedUser`**; keep `getAuthUser` only for read-only renders. |
| **C3** | **No E2E/integration tests on any protected flow** — dashboard, plan editing, workout player, sync. Regressions land silently. | `e2e/` empty of credible tests; no Supabase test credentials exist | Add browser-level smoke + real integration tests against a disposable Supabase project. |

### 🟠 High

| ID | Problem | Evidence | Fix |
|----|---------|----------|-----|
| **H1** | **"Edit Today's Plan" = two of its advertised actions are impossible (reorder is a dead button, add/remove don't exist); sets/rest can't be edited; no reset.** Persistence is fine but the UI exposes controls that can't work. | `plan-day-detail.tsx:139` (dead `<button aria-label="Reorder">`, no onClick/draggable/reorder state); dialog exposes only Replace + reps/duration steppers; no reset RPC/action | Either wire reorder (array-order is already authoritative in the save RPC — hook an onClick to reorder `drafts`) or remove the grip; add set/rest steppers; add remove + reset. |
| **H2** | **No focus management in any of the 4 modals** (plan-edit, replacement, exercise-details, filter sheet). No focus trap, no `inert` on background, no focus restore — keyboard users can tab out of modals. | `plan-day-detail.tsx:127,162,226`, `exercise-filter-sheet.tsx:130`; zero `inert`/focus-trap in `src/` | Adopt a shared `Dialog` primitive with trap + restore + `inert`. WCAG 2.4.3 / 1.4.13. |
| **H3** | **Muted/`text-muted-foreground/70–80` contrast fails AA (~<3:1 on white)** used for tiny uppercase labels. | `dashboard/page.tsx:382,746`; `plan-days.tsx:194,202`; token L0.5 | Bump muted token and stop applying `/70–/80` opacities to small text. |
| **H4** | **Two client monoliths** (`workout/page.tsx` ~1560 lines / 9 `useEffect`; `profile/page.tsx` ~911 lines). Coordination bugs + hydration/re-render risk concentrate here. | file sizes | Split into composable hooks/components. |

### 🟡 Medium

| ID | Problem | Evidence |
|----|---------|----------|
| **M1** | Reduced-motion only covered by CSS; no `MotionConfig reducedMotion="user"` — JS-driven `motion/react` transitions still play. | `globals.css:183-192` only |
| **M2** | Form errors not linked to fields (`aria-invalid`, `aria-describedby`); SR can't tell which field failed. | `form-primitives.tsx:107-121`, `signup/page.tsx:100 noValidate` |
| **M3** | ~30–36px secondary controls (reps steppers `size-8`, filter chips). | `plan-day-detail.tsx:149,151`; `exercise-filter-sheet.tsx:81` |
| **M4** | `repairPlanProgression` blocks on an unindexed `in_progress` orphan sweep; `workout_sessions` has no `(user_id, status)` index. | `services/plan/index.ts`; migrations 0007 |
| **M5** | `getSession()` per request in proxy layer. | `src/proxy.ts` |
| **M6** | No `DELETE` policy / `ON DELETE` chain for `workout_sessions` (by design per history freeze, but operations gap). | migration 0007 |

---

## 4. Performance (measured, production build)

Real measurement (Playwright + system Chrome, `channel:"chrome"`, prod build):

| Route | TTFB | Load | FCP | JS size |
|-------|:----:|:----:|:---:|:-------:|
| `/` (landing) | ~637ms | ~1380ms | ~1088ms | — |
| `/login` | ~162ms | ~694ms | ~480ms | ~284KB |
| `/signup` | similar | similar | similar | similar |

**Fixes already landed this session (8 files, verified):** React `cache()` dedupe on `getProfile`/`getActivePlan`; parallel `Promise.all` on the 4 protected-layout queries + dashboard/plan/workout/settings guards; lazy-loaded `SwUpdateBanner` (splits `motion/react` ~130KB into its own chunk); gated + dynamic-import dexie in `sync-watcher`; auth timeout 3000→1500ms.

**Remaining:** dev-mode JS ~1.3MB (unminified, expected); tail-latency from unindexed concurrent scans (M4); the two client monoliths (H4) are the next re-render hotspots.

---

## 5. "Edit Today's Plan" — 8-Scenario Verification

| # | Scenario | Result |
|---|----------|:------:|
| 1 | Customize → save → refresh → logout/login → remains | **PASS** — cloned+repointed row is RLS-owned, persists across sessions |
| 2 | User B sees A's customization? | **PASS** — per-user plan + owner-scoped read/write |
| 3 | Edit Day 3 → Day 4 unaffected | **PASS** — RPC touches exactly one `plan_day_id` |
| 4 | Reset to default | **FAIL** — no reset feature exists at all |
| 5 | sets/reps/rest edit persist | **PARTIAL** — reps/duration persist; **sets & rest have no control** |
| 6 | Add exercise + reorder preserved | **FAIL** — **reorder is a dead button**, add doesn't exist |
| 7 | Remove exercise persists | **FAIL** — no remove control |
| 8 | Global template changes don't corrupt customizations/history | **PASS** — clones are stable; catalog edits don't touch them |

**Bottom line:** the data model is excellent; the UI is ~60% of the promised feature. This is the single highest-ROI product fix.

---

## 6. Score Progression (what each milestone adds)

```
Current:  69/100  (measured baseline, this audit)
+5   Fix C1/C2  (rotate service-role key, gate mutation on fail-closed auth)
+5   Land E2E/integration tests on protected flows (C3) + CI
+4   Complete "Edit Today's Plan" UI (H1: reorder, add/remove, sets/rest, reset)
+3   Dialog focus trap/inert/restore (H2) + reduced-motion (M1)
+2   Raise muted contrast + aria-invalid forms (H3, M2) + touch targets (M3)
+2   Index the plan-repair hot path + sessions status (M4)
= 90/100   → **v1.0 launch-ready** @ 90
```

The remaining 10 points are long-tail: refactor monoliths, per-request proxy session, operation-chain, a11y deep-sweep, and broader codegen test coverage.

---

## 7. Phased Roadmap (ordered, dependency-aware, DB-safe)

### Phase A — Security + launch gate (must, days)
1. **Rotate** the Supabase service-role key; **never** keep in a committed-env file. Move to CI secret store / local-only untracked file. *(C1)*
2. **Auth hardening:** mutating server actions use fail-closed `getVerifiedUser`; audit all `getAuthUser` call sites to confirm read-only. *(C2)*
3. **CI:** typecheck + lint + vitest on every push; block merge on failures. **(I)**
4. **Canary E2E:** login → dashboard → complete a workout → sync, against a disposable Supabase. *(C3)*

### Phase B — Feature completion (low risk, high value)
5. **Complete "Edit Today's Plan":** wire reorder (one `onClick` reorder of `drafts`), add set/rest steppers, add remove, add a reset action/RPC (the original composed `user_plan_day_blocks` still exists for reconstruction — safe to repoint back). *(H1)*
6. **Dialog primitive** with focus trap + restore + `inert`; replace all 4 hand-rolled modals. *(H2)*

### Phase C — Quality & performance pass
7. Raise muted contrast + fix form error association + `MotionConfig reducedMotion`. *(H3, M2, M1)*
8. Indexes: `(user_id, status)` on the `in_progress` plan sweep; consider `(user_id, status)` on `workout_sessions`. *(M4 — additive migration, no lock risk on this data size)*
9. Touch-target pass on secondary controls. *(M3)*
10. Split the workout/profile monoliths. *(H4)*

### Phase D — Long tail (maintenance)
11. Per-request proxy session caching • expanded migration-contract + property-style tests • optional team audit.

---

## 8. Hiring-Manager Review (signals this repo sends)

**Reads like:** a senior full-stack engineer comfortable shipping a complete product. Strong proof of **product thinking** (branding, safety-bounded calorie math, emotional microcopy), **system design** (42 migrations, RLS-everywhere, RPC-gated writes, offline idempotent sync), **quality habits** (264 tests, migration contract tests, explicit invariant comments, deliberate AA color tuning with documented rationale).

**Watch-outs a reviewer would probe:** security hygiene on secrets (the service-role key is a red flag), owned-but-incomplete features (the dead "Reorder" button suggests shipped-unfinished UI), and thin integration coverage on the money-path. These are **fixable and should be fixed**, because otherwise they undercut otherwise strong signal.

---

## 9. AI-Era / Obviously-Dumb-AI Assessment

**Strongly human/debugged, not AI-soup.** Tell-tale signs against "obvious AI":
- **Specific domain correctness:** exact tier→duration mapping (4/8/12 kg → 30/60/90 d), BMI screening floors, hourly rate-limit (1100/hr), multi-video days, one-hour session guards. AI-generated code rarely encodes this much validated business rule.
- **Documented invariants and rationale** (e.g., the AA-contrast comment, the fail-open-onboarding rationale, idempotency design) — evidence of iterative human debugging, not one-shot generation.
- **Warts are the strongest signal:** the subtle `after()`-can't-call-`cookies()` workaround, the `repairPlanProgression` concurrency fix, localstorage resume — these are hard-won debugging artifacts.
- **Verdict: genuine engineering with human iteration.** (The only mild AI smell is the very homogenous comment style.) *(Straightforward codegen for shadcn-style UI, but same as any modern team.)*

---

## 10. Bottom Line

A **complete, cohesive, production-capable MVP** that would stand up in a portfolio or small launch — currently held back from "great" by **security hygiene, owned-but-dead UI, dialog accessibility, and missing integration coverage**, not by fundamentals. Land Phases A–B (≈2 weeks of disciplined work) and this clears **~90/100** and is genuinely v1.0-ready.
