# TITAN Gym PWA

A weight-loss fitness progressive web app built with Next.js, Supabase, and Serwist.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **UI:** React 19, shadcn/ui, Tailwind CSS, Motion (Framer Motion successor)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **PWA:** Serwist (service worker, precaching, push notifications)
- **Offline:** Dexie (IndexedDB) + custom sync engine
- **State:** TanStack React Query v5, Zustand
- **Testing:** Vitest (unit), Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 22+
- npm or pnpm
- A Supabase project

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Generate VAPID keys for push notifications (optional for dev)
npx web-push generate-vapid-keys
# Add the public key to .env.local as NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Run database migrations
# (via Supabase CLI or dashboard)

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | No | Web Push VAPID private key (server-only) |

## Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm test             # Run Vitest unit tests
npx playwright test  # Run Playwright E2E tests
```

## Project Structure

```
src/
  app/
    (auth)/          # Public auth routes (login, signup)
    (protected)/     # Authenticated routes
      dashboard/     # Home dashboard
      plan/          # Training plan
      workout/       # Workout sessions
      reports/       # Progress charts
      discover/      # Exercise catalog
      profile/       # User profile & settings
      onboarding/    # First-time setup wizard
    api/             # API routes (sync, web-push)
  app/actions/       # Server actions
  components/        # React components
  lib/               # Utilities, types, DB helpers
  providers/         # React context providers
  services/          # Domain logic layer
e2e/                 # Playwright end-to-end tests
```

## Business Rules

- Weight loss capped at 12 kg per plan cycle
- Minimum daily intake: 1000 kcal
- Calorie model: 7700 kcal = 1 kg body weight
- Three plan tiers: 4 kg / 30 days, 8 kg / 60 days, 12 kg / 90 days

## License

Private — All rights reserved.
