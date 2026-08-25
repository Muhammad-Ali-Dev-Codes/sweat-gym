# Phase 3 — Testing

## Test Matrix

### Authentication Tests

| Test | Expected | Status |
|------|----------|--------|
| Signup with valid email/password | Account created, verification email sent | PENDING |
| Login with valid credentials | Session established, redirect to dashboard | PENDING |
| Login with wrong password | Error message displayed | PENDING |
| Login with unverified email | Error message displayed | PENDING |
| Google OAuth login | Session established | PENDING |
| Logout | Session terminated, redirect to login | PENDING |
| Forgot password | Reset email sent | PENDING |
| Password reset with valid link | Password updated | PENDING |
| Password reset with expired link | Error message displayed | PENDING |

### Route Protection Tests

| Test | Expected | Status |
|------|----------|--------|
| Unauthenticated access to /dashboard | Redirect to /login | PENDING |
| Authenticated access to /login | Redirect to /dashboard | PENDING |
| Authenticated access to /dashboard | Page loads | PENDING |
| Unauthenticated access to /profile | Redirect to /login | PENDING |

### Profile Tests

| Test | Expected | Status |
|------|----------|--------|
| Profile created on first login | Profile exists in DB | PENDING |
| Profile not duplicated on repeat login | Single profile record | PENDING |
| Profile read by owner | Profile data returned | PENDING |
| Profile update by owner | Profile updated | PENDING |
| Profile read by other user | Denied (RLS) | PENDING |
| Profile update by other user | Denied (RLS) | PENDING |

### Account Deletion Tests

| Test | Expected | Status |
|------|----------|--------|
| Delete account with confirmation | All private data removed | PENDING |
| Delete account without confirmation | No action taken | PENDING |
| Login after account deletion | Authentication fails | PENDING |

### Session Tests

| Test | Expected | Status |
|------|----------|--------|
| Page refresh maintains session | User stays logged in | PENDING |
| New tab maintains session | User stays logged in | PENDING |
| Logout in one tab | Other tabs affected | PENDING |

## How to Test

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Test signup flow
4. Verify email in Supabase dashboard
5. Test login
6. Test profile operations
7. Test account deletion
