# Architecture

The app is an Expo/React Native application with TypeScript. `App.tsx` currently owns the main workspace state, backend synchronization, authentication flow, navigation state, editor modal state, and cross-screen action handlers. Screens in `src/screens/` receive computed data and callbacks through `AppScreenProps`.

## Source Layout

- `App.tsx`: app shell, auth, bootstrap loading, mutation orchestration, navigation, editor modals, derived summaries, and state.
- `index.ts`: Expo entry point.
- `src/screens/`: feature screens for home, tasks, work logs, manufacturing, inventory, reports, risks, subsystems, attendance, and roster.
- `src/screens/reports/`: report-specific field rendering.
- `src/ui/`: shared UI components, editor widgets, selection widgets, helpers, responsive metrics, theme context, constants, and styles.
- `src/ui/landscapeTimeline/`: landscape timeline and calendar-specific model, palette, components, and styles.
- `src/data/`: API helper, mock snapshot, and seeded task data.
- `src/data/tasks/`: seeded discipline-specific tasks.
- `src/types/`: domain types for API payloads and in-app entities.
- `src/services/`: work-log timer notifications and placeholder live-activity service.
- `src/i18n/`: localization provider, dictionaries, and demo dictionaries.
- `script/` and `scripts/`: simulator launch helpers, Expo patching, and reset scripts.

## State Ownership

`App.tsx` owns the canonical in-memory workspace arrays:

- members
- subsystems
- disciplines
- mechanisms
- part definitions
- part instances
- tasks
- events/milestones
- work logs
- manufacturing items
- purchase items
- QA requests and reports

It then derives filtered lists, lookup maps, summary chips, and navigation counts before passing them into screens.

## Screen Pattern

Screens are mostly presentational. They receive:

- filtered data already scoped to the active view,
- lookup maps for display names,
- current search/filter state,
- state setters for filters,
- action callbacks for create/edit/status transitions,
- shared responsive styles and theme colors.

This keeps feature screens focused on rendering and interaction wiring while centralizing persistence and cross-entity behavior.

## Navigation

The app uses local state for navigation rather than a router. Primary tabs are:

- Home
- Attendance
- Tasks
- Logs
- Manufacturing
- Inventory
- QA
- Risks
- Subsystems
- Roster

Some tabs expose subtabs:

- Tasks: timeline, queue, milestones.
- Manufacturing: CNC, 3D print, fabrication.
- Inventory: materials, parts, purchases.

Swipe responders in `App.tsx` support tab/subtab gestures.

## Backend Synchronization

The API helper in `src/data/api.ts` resolves the base URL from `EXPO_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8080`. `requestJson` adds JSON headers, applies a bearer token when present, parses JSON responses, and throws `ApiRequestError` on non-2xx responses.

Mutations use a shared `runMutation` path in `App.tsx`: submit the request, refresh `/api/bootstrap`, and update sync status. If the backend is unavailable, the app preserves local optimistic state where the feature flow requires it. Work-log creates additionally use `src/services/workLogDraftSync.ts` to persist offline drafts in AsyncStorage, show draft sync status, and retry later without duplicate matching submissions.

## Work Timer Services

`src/services/workLogTimerNotifications.ts` persists active timer state to AsyncStorage and schedules local reminders through `expo-notifications`.

`src/services/workLogLiveActivity.ts` defines the live-activity interface but currently returns unavailable results. It is a platform extension point for future native live activity support.

## Styling

Most shared styles live in `src/ui/styles.ts`. Landscape timeline styles are split into dedicated modules under `src/ui/landscapeTimeline/`. Responsive sizing comes from `src/ui/responsive.ts`, and theme values come from `src/theme.ts` plus `src/ui/themeContext.tsx`.

Follow the repository `AGENTS.md` limits when adding or modifying implementation files: split files above the refactor thresholds and keep feature responsibilities separated.
