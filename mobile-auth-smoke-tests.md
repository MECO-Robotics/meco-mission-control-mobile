# Mobile Auth QA Checklist

## Automated checks

- `npm.cmd install`
- `npm.cmd run typecheck`

## Manual smoke test checklist

1. Start the app from a clean install (no existing auth session).
   - Confirm the login screen is visible when no token is cached.
   - Confirm hosted-domain hint uses the platform-configured domain (or `mecorobotics.org` fallback).

2. Google sign-in flow.
   - Tap **Sign in with Google** with a valid workspace account.
   - Verify the app returns to the authenticated app shell.
   - Kill and relaunch the app, verify it returns to authenticated state without prompting sign-in.

3. Hosted-domain restriction handling.
   - Use a Google account that is not allowed by platform policy.
   - Verify the app shows a clear server-provided message instead of a local domain-format error.

4. Email sign-in flow.
   - Enter a non-allowed email and submit.
   - Verify a clear error from backend policy appears in UI.
   - Enter an allowed email and request a code, then complete verification.

5. Session persistence and restart safety.
   - After successful sign-in, restart the app.
   - Verify `/api/auth/me` validates token and workspace data loads.
   - Change or clear the stored local device number, restart the app, and verify
     it requires sign-in again instead of restoring the old session.

6. Token expiry / unauthorized bootstrap.
   - In platform session store, invalidate/expire the active token.
   - Restart app and verify it lands on login with a restart-safe message.
   - Confirm cached credentials are cleared and sign-out path is available.

7. Logout.
   - Use **Sign out** and confirm:
     - login screen is shown,
     - secure storage/session keys are cleared,
     - workspace state remains usable after re-authenticating.

8. Sync error handling.
   - Temporarily point `EXPO_PUBLIC_API_BASE_URL` to an offline backend.
   - Verify bootstrap shows auth/network status appropriately and keeps the app recoverable.
