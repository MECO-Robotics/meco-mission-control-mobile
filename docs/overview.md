# App Overview

MECO Mission Control Mobile is an Expo/React Native app for FRC teams. It gives students, leads, mentors, and admins a shared workspace for season projects, execution, schedule, robot readiness, inventory, purchasing, QA/reports, risks, team, and documents.

The app is the mobile companion to the hosted platform backend. It can run from seeded local data when the backend is unavailable, but its intended production mode is to bootstrap workspace data from the platform API and submit mutations back to that server.

## Primary Users

- Students use the app to find assigned work, start tasks, request QA, log hours, and see upcoming milestones.
- Leads use it to triage subsystem work, unblock queues, manage dependencies, and watch risk areas.
- Mentors use it to approve manufacturing and purchases, review QA requests, and validate follow-up work.
- Admins use it to manage roster, seasons, workspace data, and release readiness.

## Core Workflows

- Review the home dashboard for priority work, blocked tasks, due-soon items, and inventory needs.
- Use Kanban as the single execution workflow, with project-specific work types and responsible groups.
- Move tasks through `not-started`, `in-progress`, `waiting-for-qa`, and `complete`.
- Track dependency relationships, derived blocked state, estimates, actual hours, owner, mentor, Robot targets, and Schedule links.
- Create milestones and deadlines that affect task planning.
- Log work manually or use the work timer, then convert elapsed time into a work-log entry.
- View meetings, events, milestones, and Task deadlines in Schedule's Calendar, Timeline, and Agenda presentations.
- Manage manufacturing through Robot Tasks with technical ManufacturingDetails; keep outsourced purchasing state in Purchasing.
- Manage raw/bulk materials separately from individual part instances and purchasing.
- Capture QA reports and evidence with typed domain targets.
- Maintain canonical unresolved Risks; readiness and blocked indicators are derived.

## Runtime Modes

- Connected mode: the app reads auth config and bootstrap data from the configured API base URL, then writes mutations to the API.
- Development bypass mode: if the backend exposes dev bypass auth, contributor testing can obtain a session without a real Google flow. Email sign-in still requires starting and verifying an email-code flow.
- Local fallback mode: if the backend cannot be reached, the app keeps enough seeded data to render and demonstrate the workspace.

## Related Repositories

- `meco-mission-control-platform`: hosted API, authentication, database, and production data ownership.
- `meco-mission-control-web`: browser-first mentor/admin dashboards and operations views.
