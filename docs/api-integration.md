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

Android emulators usually need the host-machine route:

```text
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
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

## Google Sign-In

Google sign-in uses `expo-auth-session/providers/google` and expects an ID token from Google.

Environment variables:

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

If platform-specific IDs are not provided, the app falls back to `EXPO_PUBLIC_GOOGLE_CLIENT_ID` or the backend-provided `googleClientId`.

Credential exchange endpoint:

```text
POST /api/auth/google
```

Body:

```json
{ "credential": "<google-id-token>" }
```

Expected response:

```ts
type SessionResponse = {
  token: string;
  user: SessionUser;
};
```

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
POST /api/auth/email/verify
```

Body:

```json
{ "email": "person@mecorobotics.org", "code": "123456" }
```

## Development Bypass

When `devBypassAvailable` is true, the app can request a local development session:

```text
POST /api/auth/dev-bypass
```

This is used when Google credentials are missing during development or when the app needs a token for bootstrap/mutation testing.

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

Milestones can be mapped into event-like records for mobile timeline behavior.

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
- `DELETE /api/manufacturing/:id`
- `POST /api/purchases`
- `PATCH /api/purchases/:id`
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

Work-log creation has an offline-safe mobile fallback. If `POST /api/work-logs` fails because the backend is unreachable, the mobile app stores the work-log payload as a local AsyncStorage draft, shows it in the Work Logs screen, and retries it during later workspace sync. Draft retry uses a local fingerprint of task, date, hours, participants, and notes to avoid posting duplicate matching work logs.
