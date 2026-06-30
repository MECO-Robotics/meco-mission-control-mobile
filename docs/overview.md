# App Overview

MECO Mission Control Mobile is an Expo/React Native app for robotics team operations. It gives students, leads, mentors, and admins a shared workspace for planning work, tracking execution, surfacing blockers, logging effort, and preparing parts or purchases before build sessions.

The app is the mobile companion to the hosted platform backend. It can run from seeded local data when the backend is unavailable, but its intended production mode is to bootstrap workspace data from the platform API and submit mutations back to that server.

## Primary Users

- Students use the app to find assigned work, start tasks, request QA, log hours, and see upcoming milestones.
- Leads use it to triage subsystem work, unblock queues, manage dependencies, and watch risk areas.
- Mentors use it to approve manufacturing and purchases, review QA requests, and validate follow-up work.
- Admins use it to manage roster, seasons, workspace data, and release readiness.

## Core Workflows

- Review the home dashboard for priority work, blocked tasks, due-soon items, and inventory needs.
- Navigate by task discipline: programming, mechanical, or electrical.
- Move tasks through `not-started`, `in-progress`, `waiting-for-qa`, and `complete`.
- Track dependencies, blockers, estimates, actual hours, owner, mentor, subsystem, mechanism, part, and event links.
- Create milestones and deadlines that affect task planning.
- Log work manually or use the work timer, then convert elapsed time into a work-log entry.
- Manage manufacturing jobs by process: CNC, 3D print, or fabrication.
- Manage materials, part definitions, part instances, and purchases.
- Capture QA reports, including iteration-worthy follow-up tasks.
- Use risk management to combine active blockers, subsystem risks, and QA findings into one view.

## Runtime Modes

- Connected mode: the app reads auth config and bootstrap data from the configured API base URL, then writes mutations to the API.
- Development bypass mode: if the backend exposes dev bypass auth, contributor testing can obtain a backend-issued development session. Email sign-in still requires starting and verifying an email-code flow.
- Local fallback mode: if the backend cannot be reached, the app keeps enough seeded data to render and demonstrate the workspace.

## Related Repositories

- `meco-mission-control-platform`: hosted API, authentication, database, and production data ownership.
- `meco-mission-control-web`: browser-first mentor/admin dashboards and operations views.
