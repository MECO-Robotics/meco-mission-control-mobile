# API Integration

The mobile app is designed to work with the hosted platform API, while still being usable during local development when the backend is not available.

## Base URL

The API base URL is resolved by `resolveApiBaseUrl()` in `src/data/api.ts`.

Default:

```text
http://localhost:8080
```

Override:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-api-host.example
```

Platform-specific overrides take precedence when set:

```text
EXPO_PUBLIC_IOS_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_ANDROID_API_BASE_URL=http://10.0.2.2:8080
```

## Request Behavior

`requestJson`:

- sets `Accept: application/json`,
- sets `Content-Type: application/json` when a body is present,
- adds `Authorization: Bearer <token>` when a token is available,
- parses JSON response bodies,
- throws `ApiRequestError` with `status` and parsed `body` for failed responses.

## Auth Configuration

The app reads public auth settings from:

```text
GET /api/auth/config
```

Expected shape:

```ts
type PublicAuthConfig = {
  enabled: boolean;
  googleClientId: string | null;
  hostedDomain: string;
  emailEnabled: boolean;
  devBypassAvailable?: boolean;
};
```

The hosted domain defaults in app behavior to `mecorobotics.org` when config is missing.

## Email Sign-In

Email auth is controlled by `PublicAuthConfig.emailEnabled`.

Start code flow:

```text
POST /api/auth/email/start
```

Body:

```json
{ "email": "person@mecorobotics.org" }
```

Verify code:

```text
POST /api/auth/mobile/email/verify
```

Body:

```json
{ "email": "person@mecorobotics.org", "code": "123456", "deviceId": "123456789012" }
```

The response includes independent opaque access and refresh tokens plus access,
device-session, and activity timestamps. Access tokens are refreshed five
minutes before their one-hour expiry. Refresh tokens rotate exactly once; a
failed rotation is never replayed. The v3 envelope is stored in
`expo-secure-store` and bound to the app installation. Legacy v1/v2 credentials
are deleted and require one fresh sign-in.

Session management uses `POST /api/auth/mobile/refresh`, `POST
/api/auth/mobile/logout`, `POST /api/auth/mobile/logout-all`, `GET
/api/auth/mobile/sessions`, and `DELETE /api/auth/mobile/sessions/:sessionId`.
The Personal settings device view exposes the latter three operations.

## Development Bypass

When `devBypassAvailable` is true, the app can request a backend-issued
development session:

```text
POST /api/auth/dev-bypass
```

This is used when the app needs a backend-issued development token for
bootstrap/mutation testing.

For backend-offline mobile development, `EXPO_PUBLIC_DEV_AUTH_BYPASS=true`
enables the dev-mode sign-in fallback. That path signs in as a local admin user
and keeps the bundled workspace snapshot instead of requesting a backend token.
Email sign-in still starts and verifies the email-code flow.

## Bootstrap Data

Workspace data is loaded from:

```text
GET /api/bootstrap
```

The payload may include:

- members
- subsystems
- disciplines
- mechanisms
- partDefinitions
- partInstances
- tasks
- events
- milestones
- workLogs
- manufacturingItems
- purchaseItems
- qaRequests
- qaFindings
- testFindings
- designIterations
- actions

Milestones can be mapped into event-like records for mobile timeline behavior.

`actions` are platform audit history for create, update, and delete activity. They follow the
platform audit retention policy: retain for 3 years after the related season ends, then delete or
anonymize actor/member references and free-text labels/messages. Archive hides records from active
views but does not shorten retention; delete removes the domain record while leaving a minimal
tombstone until retention expires. Audit history must avoid sensitive minor data and should only be
shown to authenticated leads, mentors, admins, or scoped users with a legitimate operational need.

## Mutation Endpoints Used By The App

The mobile app currently writes to these resource paths:

- `POST /api/tasks`
- `POST /api/tasks/:id/claim`
- `POST /api/tasks/:id/release`
- `POST /api/tasks/:id/reassign`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/milestones`
- `PATCH /api/milestones/:id`
- `DELETE /api/milestones/:id`
- `POST /api/work-logs`
- `PATCH /api/work-logs/:id`
- `DELETE /api/work-logs/:id`
- `POST /api/manufacturing`
- `PATCH /api/manufacturing/:id`
- `PUT /api/manufacturing/:id/review`
- `POST /api/manufacturing/:id/transition`
- `DELETE /api/manufacturing/:id`
- `POST /api/purchases`
- `PATCH /api/purchases/:id`
- `PUT /api/purchases/:id/approval`
- `POST /api/purchases/:id/transition`
- `DELETE /api/purchases/:id`
- `POST /api/members`
- `PATCH /api/members/:id`
- `DELETE /api/members/:id`
- `POST /api/subsystems`
- `PATCH /api/subsystems/:id`
- `DELETE /api/subsystems/:id`
- `POST /api/part-definitions`
- `PATCH /api/part-definitions/:id`
- `DELETE /api/part-definitions/:id`

After a successful mutation, the app refreshes `/api/bootstrap` so derived lists and summaries are recalculated from server state.

Work-log creation has an offline-safe mobile fallback. Draft payloads are
encrypted with XChaCha20-Poly1305 under an installation key held in SecureStore;
only ciphertext and expiry metadata are kept in AsyncStorage. The account and
schema version are authenticated as associated data. Same-account drafts remain
available for seven days after logout, while other accounts' drafts stay hidden.
Corrupt, expired, or undecryptable envelopes are purged.

The server remains authoritative for permissions: any internal user may create
work logs and pending purchase/manufacturing requests, but only mentors/admins
may edit/delete synced work logs, approve purchases/reviews, progress purchases,
or delete purchase/manufacturing records. Any internal user may make adjacent
manufacturing transitions after an active mentor review.
