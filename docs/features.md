# Feature Guide

This guide describes the mobile domain views. Home provides cross-project triage; Kanban is the single human execution workflow. Schedule presents meetings, events, and milestones together while retaining their distinct records.

## Home and Kanban

Home highlights attention across the season's Robot, Media, Outreach, Operations, Strategy, and Training projects. Kanban presents executable work as Tasks with project-specific work types, responsible groups, and workstreams as separate dimensions.

Task actions include create, edit, claim, unclaim, mentor reassign, start work, log work, request QA, and delete. Dependencies remain linked across valid project and work-type boundaries. Blocked state and readiness are derived from dependencies, risk, QA, schedule, and inventory context rather than maintained as duplicate free-text blockers.

Robot work types include Design, Manufacturing, Assembly, Electrical/Wiring, Programming, Testing, Driving, and Planning. Robot Planning is technical/build planning; game and scouting strategy belongs to the Strategy project.

## Schedule

Agenda, Calendar, and Timeline are projections of the Schedule domain. They include meetings, competitions and other events, practices, deadlines, milestones, and reviews. Selecting a milestone edits a Milestone; the combined views do not collapse Meeting, Event, and Milestone identities.

## Attendance

Attendance shows meeting participation status for loaded workspace members, with RSVP/sign-in status for coming, maybe, and out.

## Work Logs

Work logs capture hours, participants, task linkage, and notes. The screen supports searching by task or note text and sorting by newest, oldest, longest, or shortest.

When the backend is unreachable, newly created work logs are saved as
XChaCha20-Poly1305 encrypted, account-bound local drafts. Same-account drafts are
retained for seven days across logout and retry during normal workspace sync.
Only mentors/admins may edit or delete a work log after it reaches the server.

The work timer can be started from the work-log flow. Timer state is persisted locally with AsyncStorage and reminders are scheduled at 30, 60, and 90 minutes when notification permission is available.

Work-log note templates cover CAD, machining, wiring, programming, testing, and meeting notes.

## Robot and Manufacturing

Robot Kanban Tasks are the human execution identity. A Manufacturing Task may have one ManufacturingDetails technical extension for part/revision, quantity, extensible process, material, files/tolerances, due date, and QA requirements. In-house versus outsourced fulfillment is independent of process. Outsourced custom work links to Purchasing for commercial state; COTS acquisition is a PurchaseItem without ManufacturingDetails. There is no separate manufacturing human work queue.

## Inventory

Inventory covers physical stock, not documents or procurement workflows:

- Materials manager: material demand, inferred on-hand stock, reorder points, open demand, vendor, and suggested order quantity.
- Part manager: part definitions plus subsystem part instances and lifecycle state.
- Materials represent raw/bulk stock and its storage location. PartInstance represents an individual finished or installed part and its physical location/state; readiness is derived separately.

Part lifecycle statuses:

- Planned
- Needed
- Available
- Installed
- Retired

PartDefinition records the reusable part and its default acquisition method (Stock, Purchase COTS, or Manufacture). A PurchaseItem owns its procurement Task relationship and commercial fields such as vendor, quote, approval, order, cost, expected delivery, and tracking.

## Subsystems and Robot structure

The subsystem manager tracks ownership, mentor coverage, descriptions, hierarchy, mechanisms, and risks. Subsystem cards can expand to show related context and can be edited from the card.

## QA / Reports

QA results and reports are a first-class domain view. Typed targets connect QA evidence to the owning Task, Robot entity, schedule record, manufacturing technical record, project, or other supported domain entity.

QA results:

- Pass
- Minor fix
- Iteration-worthy

Iteration-worthy QA can generate follow-up Tasks. QA outcomes remain owned by QA and link to the target records they verify.

## Risks

Risk is the canonical stored unresolved-problem record. Derived dependency, readiness, schedule, and QA signals may surface or create a Risk, but they are not separate persisted blocker/risk stores.

## Documents

Documents and evidence are accessible independently from Inventory and can carry typed links to Tasks, Robot entities, Schedule records, ManufacturingDetails, projects, QA targets, and other supported domain entities.

## Roster

Roster groups members by role and supports member creation/editing. Roles are student, lead, mentor, and admin.

Selecting a member opens a pop-out card with basic roster details such as name, email, planned attendance days, and attendance notes. Mentor/admin users see an Edit action from the selected-member details; student users can inspect the details without an edit button.

## Localization And Themes

The app supports English plus Turkish, Hebrew, French, Chinese, Spanish, Portuguese, Dutch, German, and Arabic translations. RTL text direction is enabled for RTL languages.

The UI uses `AppThemeProvider` and app theme tokens from `src/theme.ts`, with automatic color-scheme awareness.
