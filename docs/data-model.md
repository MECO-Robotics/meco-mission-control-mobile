# Data Model

Domain types live in `src/types/domain.ts`. This document summarizes the entities that matter to mobile workflows.

## People

`Member` represents a workspace person.

Roles:

- student
- lead
- mentor
- admin

Members can be linked to tasks as owners or mentors, manufacturing/purchase requests as requesters, work logs as participants, and subsystems as responsible engineers or mentors.

## Subsystems And Design Structure

`Subsystem` represents a robot/system area. It can have a parent subsystem, responsible engineer, mentor IDs, and risk notes.

`Discipline` represents work type, such as mechanical, electrical, software, integration, or QA/test.

`Mechanism` belongs to a subsystem and provides a more specific design/work area.

`Requirement` belongs to a subsystem and tracks MoSCoW priority plus requirement status.

## Tasks

`Task` is the core execution unit.

Important fields:

- title and summary
- subsystem, discipline, mechanism, requirement, part, and target event links
- owner and mentor
- start date and due date
- priority
- status
- dependency IDs
- checklist items
- blockers and `isBlocked`
- linked manufacturing and purchase IDs
- estimated and actual hours
- documentation requirements

Task statuses:

- `not-started`
- `in-progress`
- `waiting-for-qa`
- `complete`

Task priorities:

- `critical`
- `high`
- `medium`
- `low`

## Events And Milestones

`Event` represents calendar items visible to planning flows.

Event types:

- drive practice
- competition
- deadline
- internal review
- demo

Meeting, Event, and Milestone retain their distinct record identities and are presented together in the Schedule domain. Tasks can also appear there by due date.

## Work Logs And Attendance

`WorkLog` links date, hours, participants, notes, and a task.

`AttendanceRecord` links a member, date, and total hours.

The app also keeps meeting RSVP/sign-in status for attendance views.

## Manufacturing

`Task` is the only human execution identity. A Robot Task with work type `Manufacturing` may have one nested `ManufacturingDetails` technical record. Its process references the extensible platform manufacturing-process catalog, while fulfillment source independently selects in-house or outsourced work. ManufacturingDetails has no separate owner, status, deadline, or workflow. Outsourced custom work links its Task to a PurchaseItem; COTS acquisition is Purchasing work and has no ManufacturingDetails.

## Inventory And Purchases

`PartDefinition` describes a reusable part, including name, part number, revision, type, source, material, and description.

`PartInstance` represents one physical finished unit, with its physical location and lifecycle state. Readiness is derived from dependencies and is not canonical stored state. `Material` represents raw or bulk stock and its storage location.

Part instance statuses:

- `planned`
- `needed`
- `available`
- `installed`
- `retired`

`PurchaseItem` owns its optional `taskId` relationship to the human procurement Task and tracks vendor, quote, approval, purchase-order/order state, cost, expected delivery, and tracking. Task has no purchase ID array. `inHouse` is modeled as fulfillment source rather than a process or acquisition method.

Purchase statuses:

- `requested`
- `approved`
- `purchased`
- `shipped`
- `delivered`

## QA

`QaRequest` asks for review of typed domain targets. `Report` is the canonical QA, practice, competition, or review report and links typed evidence targets. Findings and TestResults use typed target references rather than duplicate scalar links. Artifacts use `uri` and typed target references.

QA and report records retain their owning domain; evidence can link to Tasks, Robot entities, Schedule records, ManufacturingDetails, Projects, and other appropriate targets.

QA results:

- `pass`
- `minor-fix`
- `iteration-worthy`

Iteration-worthy findings can drive follow-up task creation.

## Bootstrap Payload

`PlatformBootstrapPayload` is generated from the platform contract. Mobile consumes the same required collection shapes and field semantics; it does not maintain a divergent compatibility schema.
