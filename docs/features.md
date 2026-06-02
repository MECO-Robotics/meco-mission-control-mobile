# Feature Guide

This guide describes the behavior visible in the mobile client. Most screens share the same interaction model: summary chips, search/filter controls, cards or rows, and editor modals for create/edit actions.

## Home

The home screen is the operations snapshot for the next execution window. It highlights priority tasks, blocked or overdue work, waiting QA, manufacturing needs, purchase requests, and meeting/export context.

Typical actions:

- Open a priority task directly in the task queue.
- Jump to inventory purchases when a needed item requires action.
- Start from visible summary counts before standup or shop time.

## Attendance

Attendance shows meeting participation status for loaded workspace members. It supports the app's RSVP/sign-in visibility model with status marks for present, maybe, and out.

## Tasks

Tasks are organized by subteam:

- Programming
- Mechanical
- Electrical

Task views:

- Timeline: calendar-ordered tasks and milestones with ownership cues.
- Queue: task cards for execution with search and filtering collected behind the Filters action.
- Milestones: event/deadline management with sorting and subsystem context.

Task queue filters include subteam, subsystem, owner, status, priority, blocked, no blockers, over estimate, overdue, due soon, dependency wait, ready now, ready for QA, needs fabrication, needs purchase, unassigned, and archive mode.

Task actions include create, edit, duplicate, start, request QA, resolve blockers, shift due dates, and delete. Task status is also affected by dependency state and QA readiness.

## Work Logs

Work logs capture hours, participants, task linkage, and notes. The screen supports searching by task or note text and sorting by newest, oldest, longest, or shortest.

When the backend is unreachable, newly created work logs are saved as local drafts with AsyncStorage. Draft rows remain visible in the work-log list with pending, syncing, or failed sync status and retry during normal workspace sync without posting duplicate matching drafts.

The work timer can be started from the work-log flow. Timer state is persisted locally with AsyncStorage and reminders are scheduled at 30, 60, and 90 minutes when notification permission is available.

Work-log note templates cover CAD, machining, wiring, programming, testing, and meeting notes.

## Manufacturing

Manufacturing jobs are grouped by process:

- CNC
- 3D print
- Fabrication

Each row tracks title, subsystem, requester, material, quantity, due date, status, mentor review, batch label, and QA review count.

Manufacturing statuses:

- Requested
- Approved
- In progress
- QA
- Complete

Mentor review is separate from status so the app can show whether a job was explicitly approved before work progresses.

## Inventory

Inventory has three views:

- Materials manager: material demand, inferred on-hand stock, reorder points, open demand, vendor, and suggested order quantity.
- Part manager: part definitions plus subsystem part instances and lifecycle state.
- Purchase list: purchase request status, vendor, mentor approval, estimated/final cost, and quantity.

Part lifecycle statuses:

- Planned
- Needed
- Available
- Installed
- Retired

Purchase statuses:

- Requested
- Approved
- Purchased
- Shipped
- Delivered

Creating a part definition can also generate acquisition work through manufacturing, purchase, or stock workflows.

## Subsystems

The subsystem manager tracks ownership, mentor coverage, descriptions, hierarchy, mechanisms, and risks. Subsystem cards can expand to show related context and can be edited from the card.

## QA And Reports

Reports combine QA requests, QA reports, event reports, and iteration-worthy outcomes.

QA results:

- Pass
- Minor fix
- Iteration-worthy

Iteration-worthy QA can generate follow-up tasks. Event reports can also capture findings and create follow-up work.

## Risks

Risk management combines active task blockers, subsystem risks, dependency delays, overdue work, and iteration-worthy QA findings into a single register. Risks are grouped by priority so leads and mentors can focus on high-impact issues first.

## Roster

Roster groups members by role and supports member creation/editing. Roles are student, lead, mentor, and admin.

## Localization And Themes

The app supports English plus Turkish, Hebrew, French, Chinese, Spanish, Portuguese, Dutch, German, and Arabic translations. RTL text direction is enabled for RTL languages.

The UI uses `AppThemeProvider` and app theme tokens from `src/theme.ts`, with automatic color-scheme awareness.
