# Mobile domain model

Mobile consumes the platform's generated bootstrap contract. The checked-in contract copy is generated from the platform repository; do not add client-only aliases or stored compatibility fields.

## FRC season and project scope

Each season has exactly one project of each canonical type: Robot, Media, Outreach, Operations, Strategy, and Training. A Project owns its project-scoped records. WorkType is specific to a Project type; ResponsibleGroup is a separate season-scoped assignment and may apply to selected projects; Workstream is project-scoped planning/reporting. They are separate dimensions.
Students may have an optional class year (freshman, sophomore, junior, senior). It is an analytics dimension only and never owns a task. Responsible groups remain the canonical, arbitrary team-defined subteams/domains that may own tasks through `responsibleGroupId`.

`Member` represents a workspace person.

## Task and Kanban

`Task` is the sole human execution entity; the user-facing workflow is Kanban. Its project-specific `workTypeId`, optional `responsibleGroupId`, `workstreamIds`, individual owner/assignees, dates, status, dependency links, and related Robot/schedule targets retain separate meanings. Robot work types include Design, Manufacturing, Assembly, Electrical/Wiring, Programming, Testing, Driving, and Planning. Robot Planning covers technical/build planning; game and scouting strategy belongs to the Strategy project.

Task dependencies are typed links to Tasks, Milestones, or PartInstances. A PartInstance dependency explicitly asks for either a physical location or derived readiness. `isBlocked` and `isWaitingOnDependency` are read-only derived projections; free-text blocker arrays are not stored. Risk records are the canonical persisted unresolved-risk model.

## Robot and manufacturing

Subsystem → Mechanism → PartDefinition describes robot structure. Subsystems do not own free-text risk collections. CAD and other evidence use typed Artifact references.

A Robot Task with the Manufacturing work type may contain one nested `manufacturingDetails` technical extension. It contains the part/revision reference, quantity, `processId`, `fulfillmentSource`, material requirement, file Artifact IDs, tolerances, and QA requirements. The process is resolved through the extensible ManufacturingProcess catalog (initially CNC, 3D Print, Fabrication); fulfillment source is independently `in-house` or `outsourced`. Task owns execution status, assignments, and due date. ManufacturingDetails has no independent lifecycle or identity.

COTS acquisition uses Purchasing only. Custom outsourced fabrication uses a manufacturing Task with ManufacturingDetails and linked commercial PurchaseItem records. There is no ManufacturingItem collection or manufacturing queue.

## Inventory and Purchasing

Material represents raw/bulk stock and its storage location. PartDefinition is a reusable part design and owns a default acquisition method (`stock`, `purchase-cots`, or `manufacture`). PartInstance represents one physical finished/installed unit and owns physical location and lifecycle state. PartInstance readiness is derived and is not persisted as canonical state.

PurchaseItem owns commercial state: vendor, quotes, approval, purchase order/order status, cost, expected delivery, and tracking. `PurchaseItem.taskId` owns the one-way optional relationship to the human procurement Task; Tasks do not contain purchase ID arrays. For manufacturing-service purchases, the referenced Task is a Robot Manufacturing Task with ManufacturingDetails. COTS purchases do not require ManufacturingDetails.

## Schedule

Meeting, Event, and Milestone remain distinct stored record types and are presented in Schedule through Calendar, Timeline, and Agenda. Task deadlines are projected from `Task.dueDate`; they are not copied into another stored schedule record. Schedule record wire fields are `startAt` and `endAt`.

## QA, Reports, Risks, and Documents

QaRequest, TestResult, QaFinding, TestFinding, and Report keep platform-defined typed target references. Report supports QA, practice, competition, and review types. A typed target link preserves the target domain as owner; duplicate scalar links are not maintained. Artifacts use `uri` and typed `targetRefs` and may link to Tasks, Robot entities, Schedule records, ManufacturingDetails, projects, or other supported entities.

Risk is the canonical stored unresolved-risk record. Dependency, schedule, QA, inventory, and subsystem signals may surface or create Risks; free-text subsystem/task blocker or risk arrays are not parallel stores.

## Bootstrap and prototype state

Bootstrap collection names and every wire field come from `contracts/platform/bootstrap/v1/contract.json`. Snapshot schema versioning and reset are platform-owned. An older or incompatible local prototype snapshot is archived and replaced with canonical seed data; mobile does not migrate ambiguous legacy Tasks, ManufacturingItems, Purchases, blockers, risks, PartInstances, project types, or acquisition state.
Team group workload and capacity summaries are derived from members, group-owned tasks, work logs, and planned weekly attendance hours. These totals are not persisted. Student cohort summaries group students by optional class year and remain separate from task ownership.
