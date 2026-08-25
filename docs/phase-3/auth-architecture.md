# Phase 3 — Auth Architecture

## Provider

Supabase Auth handles all authentication.

## Supported Methods

1. Email + Password
2. Google OAuth

## Flow

### Email Signup
1. User fills signup form
2. Client calls `supabase.auth.signUp()`
3. Auth user created
4. Verification email sent
5. User clicks link → `/auth/callback`
6. Session established
7. User redirected to dashboard

### Google OAuth
1. User clicks "Continue with Google"
2. Client calls `supabase.auth.signInWithOAuth()`
3. Google OAuth flow
4. Callback to `/auth/callback`
5. Session established
6. Profile lookup/creation
7. Redirect to dashboard

## Session Management

- Sessions managed by Supabase SSR
- Cookies handled by middleware
- Server-side session refresh on each request

## Route Protection

Middleware checks auth status:
- Public routes: accessible to all
- Protected routes: require authentication
- Auth routes: redirect authenticated users to dashboard

## Profile Creation

- Idempotent upsert on first login
- Uses `user_id` as conflict target
- No duplicate profiles created

## Account Deletion

Server action that:
1. Verifies authentication
2. Deletes all private data (RLS-protected tables)
3. Deletes auth user (requires admin privileges)
4. Terminates session
