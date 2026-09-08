# MECO Mission Control Mobile

Expo/React Native mobile client for MECO Mission Control manufacturing, planning, and operations workflows.

## What this repo covers

- Mobile dashboard for subsystem status, blockers, and priority work.
- Task workflow states: not started, in progress, waiting for QA, complete.
- Task claiming, releasing, reassignment, blocker resolution, and QA handoff flows.
- Meeting RSVP, attendance, and required work-log visibility.
- Work-log entry, persisted work timers, reminder notifications, and offline draft retry.
- Manufacturing and purchase queues with mentor review checkpoints.
- Inventory views for materials, part definitions, part instances, and purchase requests.
- QA outcomes that separate minor rework from iteration-worthy failures.
- Role-aware mentor and student flows, including mentor-only QA decisions.
- Planning metrics surfaced from the same operational data.
- Mobile auth states for expired sessions, unavailable network, and backend auth configuration failures.
- Localization for English, Turkish, Hebrew, French, Chinese, Spanish, Portuguese, Dutch, German, and Arabic.
- Automatic light/dark theme support and portrait/landscape orientation support.

## Why this is separate from the hosted backend

The mobile client is built with Expo/React Native. The companion `meco-mission-control-platform` repo is the piece intended for DigitalOcean hosting and database management.

The `meco-mission-control-web` repo complements this app with browser-first dashboards for mentors and admin workflows.

## Local development

Use the Node version in `.nvmrc`, then `npm ci` and `npm start`.
`npm run android` launches Expo for Android; `npm run ios` requires macOS/Xcode.
See [CONTRIBUTING.md](CONTRIBUTING.md) for validation and PR guidance and
[development setup](docs/development.md) for emulator and API configuration.

## Project map

- `src/app/`: app shell, auth/config state, navigation, overlays, and editor modals.
- `src/screens/`: feature screens for dashboard, tasks, work logs, inventory, manufacturing, reports, roster, subsystems, and risks.
- `src/data/`: API access, mock/fallback workspace data, task ordering, assignment, help request, and bootstrap mapping logic.
- `src/services/`: secure auth-session storage, work-log draft sync, timer notifications, and live activity helpers.
- `src/ui/`: shared UI primitives, theme helpers, responsive utilities, and landscape timeline components.
- `src/i18n/`: translations and RTL-aware localization setup.
- `contracts/platform/bootstrap/v1/contract.json`: mobile-facing bootstrap payload contract.
- `docs/`: deeper product, architecture, API, development, release, data-model, and contributor documentation.
- `scripts/`: simulator reset, workflow security checks, contract verification, and optional shared-skill sync helpers.

Start with `docs/overview.md`, `docs/development.md`, `docs/features.md`, and `docs/api-integration.md` when onboarding.

## Auth configuration (no secrets in source)

- `EXPO_PUBLIC_API_BASE_URL` (required): shared platform API base URL for auth/bootstrap and data calls.
- `EXPO_PUBLIC_IOS_API_BASE_URL`: optional iOS-specific API override.
- `EXPO_PUBLIC_ANDROID_API_BASE_URL`: optional Android-specific API override.
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: fallback Google client ID for sign-in.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: optional Google web override.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: optional iOS override.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`: optional Android override.
- `EXPO_PUBLIC_DEV_AUTH_BYPASS=true`: optional development-only local sign-in bypass that uses bundled workspace data when the backend/auth service is unavailable.

Do not put bearer tokens, API secrets, or third-party secret keys in
`EXPO_PUBLIC_` variables because Expo bakes them into the mobile bundle.

Refer to `mobile-auth-smoke-tests.md` for the mobile-auth smoke checklist before shipping.

## API and data contract

The app reads public auth settings from `GET /api/auth/config`, exchanges email
codes through platform auth endpoints, and loads workspace state from
`GET /api/bootstrap`.

Local fallback data keeps the app usable when the backend is unavailable. When connected to the platform API, successful mutations refresh `/api/bootstrap` so derived lists and summaries reflect server state.

Run the contract verifier after changing mobile API mapping, backend bootstrap shape, or `contracts/platform/bootstrap/v1/contract.json`:

```bash
npm run verify:bootstrap-contract
```

See `docs/api-integration.md` for endpoint details and the current mutation paths used by the app.

## Release automation

- `CI` runs the full secretless verification suite on pull requests and protected branches.
- `Mobile Release` builds iOS + Android only from protected `main` or an optional `release-*` source tag whose commit is contained in `main`.
- Configure the GitHub `production` environment with required reviewers before enabling releases.
- Set `EXPO_TOKEN` and `EXPO_PUBLIC_API_BASE_URL` as `production` environment secrets; release credentials are exposed only to their EAS steps.
- Manual releases must be dispatched from `main`; use `source_tag` to build a qualifying `release-*` tag.
- Ensure `expo.ios.bundleIdentifier` and `expo.android.package` are set in `app.json` for non-interactive EAS builds.
- Production EAS builds use Expo SDK 57 and the exact EAS CLI version in `eas.json`, with Android output as an app bundle.

See `docs/release.md` for the fuller release checklist.
