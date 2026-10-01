# Architecture

The app is an Expo/React Native application with TypeScript. `App.tsx` composes workspace data, authentication, navigation and cross-screen actions. Task editing state and commands belong to `src/screens/tasks/useTaskEditor.ts`; task snapshots have one synchronous owner in `taskState.ts`, with indexes derived from that snapshot. Root presentation chrome is split into `src/app/components/`, editor form rendering lives in `src/app/editorModals/`, and screens in `src/screens/` receive computed data and callbacks through `AppScreenProps`.

## Source Layout

- `App.tsx`: auth, bootstrap loading, mutation orchestration, navigation state, editor modal orchestration, derived summaries, and root workspace state.
- `index.ts`: Expo entry point.
- `src/screens/`: shared screen prop types plus feature folders for dashboard, Kanban, Schedule, Documents, QA/Reports, Risks, inventory, robot structure, work logs, and roster screens.
- `src/app/`: app-shell helpers, root-level presentation components, and editor modal components extracted from `App.tsx`.
- `src/ui/`: shared UI components, editor widgets, selection widgets, helpers, responsive metrics, theme context, constants, and styles.
- `src/ui/landscapeTimeline/`: landscape timeline and calendar-specific model, palette, components, and styles.
- `src/data/`: API helpers; representative workspace fixtures live under `src/data/__tests__/fixtures/` and are excluded from runtime bundles.
- `src/types/`: domain types for API payloads and in-app entities.
- `src/services/`: auth-session storage, work-log draft sync, work-log timer notifications, and durable work-log queue ownership.
- `src/i18n/`: localization provider, dictionaries, and demo dictionaries.
- `scripts/`: contract verification, workflow checks and optional skills import. Expo owns device launch.

## State Ownership

The workspace composition retains canonical platform collections; Task updates go through the task snapshot owner:

- seasons and projects
- work types, responsible groups, and workstreams
- members
- subsystems
- mechanisms
- materials
- part definitions
- part instances
- tasks
- task dependencies
- meetings, events, and milestones
- manufacturing process catalog
- purchase items and vendors
- risks
- reports, QA requests, findings, and artifacts
- work logs

It then derives filtered lists, lookup maps, summary chips, and navigation counts before passing them into screens.

## Screen Pattern

Screens are mostly presentational. They receive:

- filtered data already scoped to the active view,
- lookup maps for display names,
- current search/filter state,
- state setters for filters,
- action callbacks for create/edit/status transitions,
- shared responsive styles and theme colors.

Kanban filters belong to `useTaskQueue`; `useTaskEditor` owns Task draft state, relationship commands, and optional nested ManufacturingDetails. Manufacturing has no second mobile work queue or independent status. `useMilestoneEditor` owns Milestone records; Schedule presentations combine Meeting, Event, and Milestone records while preserving each type and ID, and project Task deadlines from `dueDate`. `usePurchaseEditor` edits PurchaseItem commercial state, including quotes, approval, orders, delivery, and tracking. The Risks screen edits canonical Risk records through the platform risk routes. Feature editors share only `useEditorDraft` lifecycle transitions; field validation and persistence stay with each owner. Part definitions keep the default acquisition method, while actual inventory, manufacturing Tasks, and PurchaseItems remain separate linked state.

## Navigation

The app uses compact local navigation rather than a router. Bottom tabs group the domains:

- Home
- Work
- Resources

Work exposes Kanban, Schedule, Risks, Documents, QA / Reports, and Activity. Schedule offers Agenda, Calendar, and Timeline; QA / Reports offers pending review, reports, and mentor-help requests. Resources contains People, Materials, Parts, Purchasing, and Robot structure.

Calendar, Timeline, and Agenda present Meeting, Event, and Milestone records plus dated Task work while retaining each stored identity. Kanban remains the only human execution queue.

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
refresh `/api/bootstrap`, and update sync status. Task editor commands save the Task and typed dependency relationships, retain a newly created ID on partial failure, and refresh the snapshot after success. Blocked/readiness state is derived; canonical unresolved problems are Risk records. Work-log queue operations use `workLogQueue.ts` for serialized durable writes and session-scoped upload ownership, `workLogDraftSync.ts` for ID transformations, and `workLogDraftStorage.ts` for owner-bound authenticated encryption and seven-day retention. Upload completion changes only the submitted ID; subsequent edits remain queued.

## Work Timer Services

`src/services/workLogTimerNotifications.ts` persists active timer state to AsyncStorage and schedules local reminders through `expo-notifications`.

Timer elapsed-time formatting and display ticking belong to `src/screens/worklogs/`. Native live activities are unimplemented; notification reminders are handled by `src/services/workLogTimerNotifications.ts`.

## Styling

Most shared styles live in `src/ui/styles.ts`. Feature-specific styles can live with their component, such as the login screen styles under `src/app/components/`. Landscape timeline styles are split into dedicated modules under `src/ui/landscapeTimeline/`. Responsive sizing comes from `src/ui/responsive.ts`, and theme values come from `src/theme.ts` plus `src/ui/themeContext.tsx`.

`src/ui/ActionButton.tsx` owns shared primary and quick-action markup and responsive style composition. `src/ui/Callout.tsx` owns the shared title/body presentation used by screens and editors. Both are stateless and retain localized text rendering; feature owners keep permissions, selection, navigation, mutation commands and failure lifetimes. Distinct approval and pagination controls retain their specialized presentation.

Follow `AGENTS.md`: co-own feature state and commands, delete redundant layers and use cohesive responsibilities rather than file-size quotas.

Editor lifecycle completion handles both success and failure only for the initiating draft. Feature controllers supply validation and operation messages; modal consumers receive draft state and user commands, not lifecycle completion or error setters.

Tasks use required `workstreamIds`, `subsystemIds`, `mechanismIds`, `partInstanceIds` and `artifactIds` arrays throughout the domain, seeds, drafts and API writes. Singular task target fields are removed; other entities retain their own singular relationship fields. Filters, subsystem health, part lifecycle and timeline membership use all selected targets. The mobile editor displays the first target and preserves secondary branches during unrelated edits. Its explicit subsystem/mechanism selection commands prune children of a replaced primary branch while retaining other branches; clearing a primary promotes the remaining selection. Workstream and artifact selections are retained independently. This requires the coordinated array-only platform contract; no development-state reset is required by the mobile change.
