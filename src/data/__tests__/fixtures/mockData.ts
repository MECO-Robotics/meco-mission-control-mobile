import {
  AttendanceRecord, Event, Mechanism, Meeting, Member, Milestone, PartDefinition, PartInstance, PurchaseItem,
  QaReport, Requirement, Risk, Subsystem, WorkLog, Project, ResponsibleGroup, WorkType, Vendor,
} from "../../../types/domain";
import { tasks, taskDependencies } from "./tasks";

const seasonId = "season-2026";
const project: Project = { id: "robot-project", teamId: "team-7667", seasonId, name: "Robot", projectType: "robot", description: "FRC robot build and competition work", status: "active" };
const projects: Project[] = [project,
  ...(["Media", "Outreach", "Operations", "Strategy", "Training"] as const).map((name) => ({ id: `${name.toLowerCase()}-project`, teamId: project.teamId, seasonId, name, projectType: name.toLowerCase() as Project["projectType"], description: `FRC ${name.toLowerCase()} work`, status: "active" as const })),
];
const workTypes: WorkType[] = [
  ...["design", "manufacturing", "assembly", "electrical-wiring", "programming", "testing", "driving", "planning"].map((code) => ({ id: code, projectType: "robot" as const, code, name: code, isActive: true })),
  ...(["media", "outreach", "operations", "strategy", "training"] as const).map((projectType) => ({ id: `${projectType}-planning`, projectType, code: "planning", name: "Planning", isActive: true })),
];
const responsibleGroups: ResponsibleGroup[] = [{ id: "robot-build", seasonId, name: "Robot Build", projectIds: [project.id], memberIds: ["ava", "lucas", "priya", "ethan"], isArchived: false }];
const members: Member[] = [
  ["ava", "Ava Chen", "student"], ["lucas", "Lucas Brooks", "student"], ["priya", "Priya Patel", "student"],
  ["ethan", "Ethan Hall", "student"], ["jordan", "Jordan Lee", "mentor"], ["riley", "Riley Kim", "mentor"], ["maya", "Maya Ortiz", "admin"],
].map(([id, name, role]) => ({ id, name, role: role as Member["role"], email: `${id}@team7667.org`, elevated: role !== "student", seasonId, activeSeasonIds: [seasonId] }));
const subsystems: Subsystem[] = [
  ["climber", "Climber"], ["controls", "Controls"], ["drive", "Drivetrain"], ["manipulator", "Manipulator"], ["vision", "Vision"], ["scouting", "Scouting"],
].map(([id, name]) => ({ id, projectId: project.id, name, description: `FRC ${name.toLowerCase()} system`, isCore: id === "drive", parentSubsystemId: null, responsibleEngineerId: null, mentorIds: [] }));
const mechanisms: Mechanism[] = [
  ["swerve-module", "drive", "Swerve Module"], ["intake-roller", "manipulator", "Intake Roller"], ["power-distribution", "drive", "Power Distribution"],
].map(([id, subsystemId, name]) => ({ id, subsystemId, name, description: "" }));
const requirements: Requirement[] = [{ id: "drive-req-1", subsystemId: "drive", title: "Reliable drivetrain", description: "", moscowPriority: "must", status: "planned" }];
const partDefinitions: PartDefinition[] = [
  ["pd-swerve-encoder-bracket", "Swerve Encoder Bracket", "DRV-101"], ["pd-intake-guard", "Intake Guard Plate", "MAN-214"], ["pd-pdh-label-sheet", "PDH Label Set", "ELE-052"],
  ["pd-swerve-wheel-service-kit", "Swerve Wheel Service Kit", "DRV-330"], ["pd-battery-cart-harness", "Battery Cart Harness", "OPS-305"], ["pd-driver-station-image", "Driver Station Image", "CTL-410"],
].map(([id, name, partNumber]) => ({ id, seasonId, activeSeasonIds: [seasonId], name, partNumber, revision: "A", iteration: 1, isArchived: false, type: "custom", defaultAcquisitionMethod: "manufacture", materialId: null, description: "", cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false }));
const partInstances: PartInstance[] = partDefinitions.slice(0, 3).map((definition, index) => ({
  id: `pi-${definition.id}`, partDefinitionId: definition.id, intendedSubsystemId: index === 1 ? "manipulator" : "drive", intendedMechanismId: index === 1 ? "intake-roller" : "swerve-module",
  location: { kind: "installed", subsystemId: index === 1 ? "manipulator" : "drive", mechanismId: index === 1 ? "intake-roller" : "swerve-module" }, readinessStatus: "ready",
  cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false,
}));
const events: Event[] = [{ id: "drive-practice-apr-25", seasonId, projectIds: [project.id], eventType: "practice", title: "Drive Practice", startAt: "2026-04-25T18:00:00Z", endAt: "2026-04-25T20:30:00Z", location: "Shop", description: "Robot practice" }];
const meetings: Meeting[] = [{ id: "design-review", seasonId, projectIds: [project.id], title: "Subsystem design review", meetingType: "review", startAt: "2026-04-23T18:30:00Z", endAt: null, location: "Shop", description: "" }];
const milestones: Milestone[] = [{ id: "internal-review-apr-24", seasonId, projectIds: [project.id], type: "internal-review", title: "Internal Design Review", startAt: "2026-04-24T19:00:00Z", endAt: "2026-04-24T20:00:00Z", status: "planned", description: "" }];
const vendors: Vendor[] = [{ id: "mcmaster", name: "McMaster", website: null, isArchived: false }, { id: "rev", name: "REV Robotics", website: null, isArchived: false }];
const purchaseItems: PurchaseItem[] = [
  ["polycarb-sheet", "Polycarbonate sheet for guard rework", "mcmaster", "ordered"], ["ferrule-kit", "Ferrule refill kit", "mcmaster", "not-ordered"],
  ["sprocket-pack", "Sprocket service pack", "rev", "delivered"], ["swerve-wheel-restock", "Swerve wheel restock", "rev", "ordered"],
].map(([id, title, vendorId, orderStatus], index) => ({
  id, taskId: tasks[index % tasks.length].id, kind: "cots-goods", partDefinitionId: partDefinitions[index % partDefinitions.length].id, materialId: null,
  title, quantity: 1, quotes: [{ id: `quote-${id}`, vendorId, reference: null, amount: { amount: 50, currency: "USD" }, quotedAt: null }], selectedQuoteId: `quote-${id}`,
  approvalStatus: "approved", approvedById: "riley", approvedAt: "2026-04-20", purchaseOrderNumber: null, orderStatus: orderStatus as PurchaseItem["orderStatus"],
  finalCost: null, expectedDeliveryDate: null, trackingNumber: null, trackingUrl: null, orderedAt: null, deliveredAt: null,
}));
const qaReports: QaReport[] = [{ id: "qa-1", projectId: project.id, targetRefs: [{ kind: "task", id: tasks[0].id }], createdByMemberId: "jordan", participantIds: ["ava"], mentorId: "jordan", requestedById: "ava", summary: "Inspection evidence", notes: "", createdAt: "2026-04-20", status: "reviewed", reportType: "qa", result: "pass", reviewedById: "jordan", reviewedAt: "2026-04-21" }];
const risks: Risk[] = [{ id: "risk-drive", projectId: project.id, title: "Sensor drift", detail: "Validate encoder readings", category: "design", severity: "medium", status: "open", blocksWork: false, source: { kind: "manual" }, relatedTargets: [{ kind: "subsystem", id: "drive" }], mitigationTaskId: null, ownerGroupId: "robot-build", createdAt: "2026-04-20", updatedAt: "2026-04-20", resolvedAt: null }];
const workLogs: WorkLog[] = [{ id: "log-1", taskId: tasks[0].id, date: "2026-04-20", hours: 3, participantIds: ["ava", "jordan"], notes: "Encoder check" }];
const attendanceRecords: AttendanceRecord[] = [{ id: "attendance-1", memberId: "ava", date: "2026-04-20", totalHours: 3 }];

export const mecoSnapshot = { seasons: [{ id: seasonId, teamId: project.teamId, name: "2026 FRC Season", type: "season" as const, startDate: "2026-01-01", endDate: "2026-12-31" }], projects, workTypes, responsibleGroups, vendors, members, subsystems, mechanisms, requirements, partDefinitions, partInstances, events, meetings, milestones, tasks, taskDependencies, purchaseItems, qaReports, risks, workLogs, attendanceRecords };
