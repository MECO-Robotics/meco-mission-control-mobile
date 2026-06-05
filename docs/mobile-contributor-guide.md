# Mobile Contributor Guide

This guide orients mobile contributors to the current Expo/React Native app
structure, shared state model, backend bootstrap contract, offline/no-auth
assumptions, and device testing expectations.

## Screen Structure

`App.tsx` is the top-level application shell. It owns navigation state, shared
workspace data, auth and bootstrap flows, derived data, editor state, mutation
wiring, responsive layout state, and cross-screen services such as the work-log
timer.

Screen components live in `src/screens/`. They should stay focused on rendering
and screen-local interactions. Shared screen inputs are typed through
`AppScreenProps` in `src/screens/types.ts`, and `App.tsx` passes the relevant
data, setters, and action callbacks into each screen.

Shared UI primitives, form widgets, responsive helpers, constants, and styles
live under `src/ui/`. Domain data contracts live in `src/types/domain.ts`.
Feature data seeds live in `src/data/`, including `mockData.ts` and task seed
modules under `src/data/tasks/`.

Follow the repository strict-mode structure rules from `AGENTS.md`:

- Keep React Native/TypeScript files under 300 implementation lines.
- Treat files over 220 implementation lines as refactor candidates.
- Keep import sections under 150 lines.
- Keep style rule/declaration sections under 220 lines.
- Split directories before they exceed 20 direct files.
- Prefer feature-based directories and one primary component, hook, or module
  per file.

## Shared State Model

The app currently lifts most shared state into `App.tsx`. This includes
workspace arrays, active navigation tabs, filters, selected IDs, editor drafts,
sync/auth status, and timer state.

Workspace arrays initialize from `mecoSnapshot` in `src/data/mockData.ts`, with
additional seeded tasks from `src/data/tasks`. Bootstrap responses replace those
workspace arrays when a backend is available.

Derived state is computed in `App.tsx` with `useMemo`. Common derived shapes
include ID maps, filtered screen rows, summaries, current member/session
resolution, subsystem counts, timeline data, inventory rollups, and home-screen
priority lists. Screens should consume these prepared values through
`AppScreenProps` rather than reimplementing the same cross-domain calculations.

Mutations use the shared `runMutation` helper in `App.tsx`. After a successful
mutation, the app refreshes workspace state from `GET /api/bootstrap` so all
screens render from the same server-confirmed snapshot.

## Backend Bootstrap Contract

The API base URL is resolved by `resolveApiBaseUrl` in `src/data/api.ts`.
`EXPO_PUBLIC_API_BASE_URL` is used when set; otherwise the app falls back to
`http://localhost:8080`.

The mobile app expects these bootstrap and auth endpoints:

- `GET /api/auth/config` returns `PublicAuthConfig`.
- `GET /api/bootstrap` returns `PlatformBootstrapPayload`.
- `POST /api/auth/dev-bypass` returns `SessionResponse` when development bypass
  is available.
- `POST /api/auth/google` exchanges a Google ID token for `SessionResponse`.
- `POST /api/auth/email/start` starts the email-code flow.
- `POST /api/auth/email/verify` verifies an email code and returns
  `SessionResponse`.

`PlatformBootstrapPayload` is defined in `src/types/domain.ts`. It can include
members, subsystems, disciplines, mechanisms, part definitions, part instances,
tasks, events or milestones, work logs, manufacturing items, purchases, and QA
requests. The app normalizes server tasks, maps milestones to events when
events are absent, and treats missing arrays as empty arrays.

Mutating flows use `POST`, `PATCH`, and `DELETE` endpoints for tasks,
milestones, work logs, manufacturing items, purchases, members, subsystems, and
part definitions. Mutations should return successfully before the mobile app
refreshes from `/api/bootstrap`.

Requests go through `requestJson` in `src/data/api.ts`. It sends JSON accept
headers, adds `Content-Type: application/json` when there is a body, and adds an
`Authorization: Bearer <token>` header when an API token is available.

## Offline And No-Auth Assumptions

The app remains usable from last fetched data when the backend is offline.

If auth config cannot load, the app treats auth as unavailable and can continue
with a local email session path. If development bypass is available, auth flows
may use `POST /api/auth/dev-bypass` for contributor testing.

Most local fallback data is not durable backend sync. Work-log creation is the
exception: failed offline creates are stored as local AsyncStorage drafts,
displayed in the work-log list, and retried during later sync. Other failed sync
and mutation paths surface `syncError`, set backend status to offline, and leave
the current local workspace state in place.

Current auth is contributor-facing scaffolding, not final role enforcement.
Contributors should not treat local sessions, mock data, or development bypass
as production authorization behavior.

## Device Testing Checklist

Before handing off mobile changes, validate the app on at least one simulator or
device path that matches the work being changed.

- Install dependencies with a Node version compatible with the repo engines:
  `npm install`.
- Run TypeScript validation: `npm run typecheck`.
- Start Expo with one of the supported commands: `npm run start`,
  `npm run ios`, or `npm run android`.
- For Android emulator backend testing, use `10.0.2.2` as the emulator route to
  a backend running on the host machine.
- For iOS simulator or local browser-adjacent testing, use the localhost base
  URL that matches the active backend process.
- Verify the app starts with the backend online and can refresh from the Home
  screen.
- Verify the app remains usable when the backend is offline and clearly surfaces
  sync failure state.
- Verify the intended auth path: Google sign-in, email-code sign-in, dev bypass,
  or local no-auth fallback.
- Navigate the core screens touched by the change: Home, Attendance, Tasks, Work
  Logs, Inventory, QA/Reports, Risks, and related subviews.
- Exercise relevant editor flows, including create, edit, delete, save error,
  and post-save refresh behavior when applicable.
- Check portrait and landscape layouts, including compact screens where text,
  buttons, chips, and rows are most likely to wrap.
- If work-log timing changed, verify timer persistence, reminders, and live
  activity behavior on a supported device or simulator.
- Confirm visible text does not overlap or clip on small mobile viewports.

## Documentation-Only Validation

This guide is intended for a documentation-only PR. Do not include source code,
generated files, dependency files, or config changes with this documentation
change.

Before opening the PR, review the Markdown against `App.tsx`,
`src/types/domain.ts`, `src/data/api.ts`, `README.md`, and `AGENTS.md`.

Use this diff check to confirm the change is scoped to this guide:

```bash
git diff -- docs/mobile-contributor-guide.md
```

`npm run typecheck` is optional for this documentation-only change, but it is a
reasonable sanity check when the branch already has no unrelated TypeScript
failures.
