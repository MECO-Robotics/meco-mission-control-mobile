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

## Local commands

Use Node 22 LTS for local Expo development. `package.json` allows Node `>=20 <24`, so avoid Node 24+ unless the engine range changes:

```bash
nvm use
```

```bash
npm install
npm run sim:reset
npm run start
npm run ios
npm run android
npm run verify
npm run lint
npm run test:role-permissions
npm run verify:bootstrap-contract
npm run typecheck
npm test
```

`npm run verify` runs lint, Jest, role-permission tests, TypeScript, and the bootstrap contract verifier. Use it before opening or updating a PR when practical.

`npm run dev` and `npm run android` are Android-focused shortcuts that run `bash ./script/build_and_run.sh --android` on POSIX shells.

Do not run Expo or npm scripts with `sudo`. If `node_modules` or `.expo` become owned by `root`, fix ownership from the repo root before starting the app:

```bash
sudo chown -R "$USER":staff .expo node_modules
```

For the Android simulator on Windows, this repo also has Codex actions wired through
`script/build_and_run.ps1`. Use `Run Android` in Codex or run:

```powershell
powershell -ExecutionPolicy Bypass -File ./script/build_and_run.ps1 --android
```

The Android launcher uses `10.0.2.2` as the emulator route back to the Windows
host and keeps `adb reverse tcp:8081 tcp:8081` refreshed before Expo opens.
The local Android simulator uses `.env.local` with
`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080` so it can reach a backend running
on the Windows host.

## Project map

- `src/app/`: app shell, auth/config state, navigation, overlays, and editor modals.
- `src/screens/`: feature screens for dashboard, tasks, work logs, inventory, manufacturing, reports, roster, subsystems, and risks.
- `src/data/`: API access, mock/fallback workspace data, task ordering, assignment, help request, and bootstrap mapping logic.
- `src/services/`: secure auth-session storage, work-log draft sync, timer notifications, and live activity helpers.
- `src/ui/`: shared UI primitives, theme helpers, responsive utilities, and landscape timeline components.
- `src/i18n/`: translations and RTL-aware localization setup.
- `contracts/platform/bootstrap/v1/contract.json`: mobile-facing bootstrap payload contract.
- `docs/`: deeper product, architecture, API, development, release, data-model, and contributor documentation.
- `script/` and `scripts/`: simulator launchers, local patches, role-permission checks, contract verification, and shared-skill sync helpers.

Start with `docs/overview.md`, `docs/development.md`, `docs/features.md`, and `docs/api-integration.md` when onboarding.

## Auth configuration (no secrets in source)

- `EXPO_PUBLIC_API_BASE_URL` (required): platform API base URL for auth/bootstrap and data calls.
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: fallback Google client ID for sign-in.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: optional Google web override.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: optional iOS override.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`: optional Android override.
- `EXPO_PUBLIC_DEV_AUTH_BYPASS=true`: optional development-only local sign-in bypass that uses bundled workspace data when the backend/auth service is unavailable.

OAuth client IDs are public identifiers. Do not put bearer tokens, API secrets,
or third-party secret keys in `EXPO_PUBLIC_` variables because Expo bakes them
into the mobile bundle.

Refer to `mobile-auth-smoke-tests.md` for the mobile-auth smoke checklist before shipping.

## API and data contract

The app reads public auth settings from `GET /api/auth/config`, exchanges Google or email credentials through platform auth endpoints, and loads workspace state from `GET /api/bootstrap`.

Local fallback data keeps the app usable when the backend is unavailable. When connected to the platform API, successful mutations refresh `/api/bootstrap` so derived lists and summaries reflect server state.

Run the contract verifier after changing mobile API mapping, backend bootstrap shape, or `contracts/platform/bootstrap/v1/contract.json`:

```bash
npm run verify:bootstrap-contract
```

See `docs/api-integration.md` for endpoint details and the current mutation paths used by the app.

## Repository labels

Use the shared Mission Control label vocabulary when filing or triaging issues.
Every issue should have at least one area label, one type label, and one
priority label. Add a workflow label when the issue is blocked or waiting on
design input.

Area labels:

- `area:mobile` - mobile app code, Expo configuration, simulator workflow, or app UX.
- `area:docs` - repository documentation, checklists, templates, or contributor guidance.
- `area:backend` - platform API contracts or mobile/backend integration work.
- `area:data` - mock data, bootstrap data, seed references, or data integrity.
- `area:qa` - test coverage, smoke checks, validation workflows, or release verification.

Type labels:

- `type:bug` - incorrect behavior or regression.
- `type:feature` - new user-facing behavior or workflow.
- `type:tech-debt` - cleanup, refactor, dependency, or maintainability work.
- `type:docs` - documentation-only work.
- `type:test` - test-only or validation-only work.

Priority labels:

- `priority:p0` - production-blocking or release-blocking.
- `priority:p1` - high-impact work needed soon.
- `priority:p2` - normal backlog priority.
- `priority:p3` - low-priority polish or follow-up.

Workflow labels:

- `blocked` - cannot proceed until an external dependency is resolved.
- `needs-design` - needs UI, content, or workflow design input before implementation.

## Release automation

- `CI` workflow runs `npm run typecheck` on pull requests and `main`.
- `Mobile Release` workflow builds iOS + Android via EAS after `CI` succeeds on `main`, or manually via `workflow_dispatch`.
- Set GitHub repository secret `EXPO_TOKEN` before running release builds.
- Set GitHub repository secret `EXPO_PUBLIC_API_BASE_URL` so production builds point at the hosted API.
- Ensure `expo.ios.bundleIdentifier` and `expo.android.package` are set in `app.json` for non-interactive EAS builds.
- Production EAS builds use `eas.json` profile `production`, with Android output as an app bundle.

See `docs/release.md` for the fuller release checklist.

## Next product steps

1. Continue closing gaps between mobile mutations and the hosted platform API.
2. Expand production smoke coverage around auth, bootstrap, work-log draft retry, and QA/report workflows.
3. Keep mobile, web, and platform contracts aligned as new workspace entities ship.
