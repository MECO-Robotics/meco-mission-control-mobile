# Architecture

The app is an Expo/React Native application with TypeScript. `App.tsx` composes workspace data, authentication, navigation and cross-screen actions. Task editing state and commands belong to `src/screens/tasks/useTaskEditor.ts`; task snapshots have one synchronous owner in `taskState.ts`, with indexes derived from that snapshot. Root presentation chrome is split into `src/app/components/`, editor form rendering lives in `src/app/editorModals/`, and screens in `src/screens/` receive computed data and callbacks through `AppScreenProps`.

## Source Layout

- `App.tsx`: auth, bootstrap loading, mutation orchestration, navigation state, editor modal orchestration, derived summaries, and root workspace state.
- `index.ts`: Expo entry point.
- `src/screens/`: shared screen prop types plus feature folders for dashboard, tasks, work logs, manufacturing, inventory, reports, robot systems/risks, attendance, and roster screens.
- `src/app/`: app-shell helpers, root-level presentation components, and editor modal components extracted from `App.tsx`.
- `src/ui/`: shared UI components, editor widgets, selection widgets, helpers, responsive metrics, theme context, constants, and styles.
- `src/ui/landscapeTimeline/`: landscape timeline and calendar-specific model, palette, components, and styles.
- `src/data/`: API helper, mock snapshot, and seeded task data.
- `src/data/tasks/`: seeded discipline-specific tasks.
- `src/types/`: domain types for API payloads and in-app entities.
- `src/services/`: auth-session storage, work-log draft sync, work-log timer notifications, and durable work-log queue ownership.
- `src/i18n/`: localization provider, dictionaries, and demo dictionaries.
- `scripts/`: contract verification, workflow checks and optional skills import. Expo owns device launch.

## State Ownership

The workspace composition retains these arrays; task updates go through the task snapshot owner:

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

Task queue filters belong to `useTaskQueue`; the task editor owns draft state, relationship commands and save errors. The root passes the editor owner directly to its modal rather than forwarding individual setters.

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

The API helper in `src/data/api.ts` resolves the base URL from the active
platform override, then the shared URL. See [device environment defaults](development.md#api-and-device-environment). `requestJson` adds JSON headers, applies a bearer
token when present, parses JSON responses, and throws `ApiRequestError` on
non-2xx responses. Production config rejects non-HTTPS API URLs. Development
HTTP is limited to loopback/emulator hosts unless the private-LAN override is
explicitly enabled; native production builds disable cleartext traffic.

Authenticated requests use `src/services/mobileSessionClient.ts` for proactive,
single-flight refresh and at most one post-refresh retry. Workspace data is not
shown for a newly restored account until bootstrap succeeds; authentication or
authorization failure clears credentials and identity-scoped workspace state.

Mutations use a shared `runMutation` path in `App.tsx`: submit the request,
refresh `/api/bootstrap`, and update sync status. Task editor commands save the task and canonical dependency/blocker records, retain a newly created ID on partial failure, and refresh the snapshot after success. Work-log queue operations use `workLogQueue.ts` for serialized durable writes and session-scoped upload ownership, `workLogDraftSync.ts` for ID transformations, and `workLogDraftStorage.ts` for owner-bound authenticated encryption and seven-day retention. Upload completion changes only the submitted ID; subsequent edits remain queued.

## Work Timer Services

`src/services/workLogTimerNotifications.ts` persists active timer state to AsyncStorage and schedules local reminders through `expo-notifications`.

Timer elapsed-time formatting and display ticking belong to `src/screens/worklogs/`. Native live activities are unimplemented; notification reminders are handled by `src/services/workLogTimerNotifications.ts`.

## Styling

Most shared styles live in `src/ui/styles.ts`. Feature-specific styles can live with their component, such as the login screen styles under `src/app/components/`. Landscape timeline styles are split into dedicated modules under `src/ui/landscapeTimeline/`. Responsive sizing comes from `src/ui/responsive.ts`, and theme values come from `src/theme.ts` plus `src/ui/themeContext.tsx`.

Follow `AGENTS.md`: co-own feature state and commands, delete redundant layers and use cohesive responsibilities rather than file-size quotas.
