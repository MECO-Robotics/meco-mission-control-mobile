import type {
  EventType,
  ManufacturingItem,
  MemberRole,
  PurchaseItem,
  TaskPriority,
  TaskStatus,
} from "../types/domain";
export type ViewTab =
  | "home"
  | "attendance"
  | "tasks"
  | "worklogs"
  | "manufacturing"
  | "inventory"
  | "subsystems"
  | "reports"
  | "risks"
  | "roster";

export type TaskViewTab = "timeline" | "queue" | "milestones";
export type TaskSubteamTab = "programming" | "mechanical" | "electrical";
export type ManufacturingViewTab = "cnc" | "prints" | "fabrication";
export type InventoryViewTab = "materials" | "parts" | "purchases";

export type StatusGroup = "success" | "info" | "warning" | "danger" | "neutral";

export type PartLifecycleStatus = "planned" | "needed" | "available" | "installed" | "retired";

export type WorkLogSortMode = "recent" | "oldest" | "longest" | "shortest";
export type AcquisitionMethod = "manufacture" | "purchase" | "stock";

export type NavItem = {
  key: ViewTab;
  label: string;
  shortLabel: string;
  count: number;
};

export type Option = {
  id: string;
  name: string;
};

export type SummaryChipData = {
  label: string;
  value: string;
};

export type MaterialRollup = {
  id: string;
  name: string;
  category: string;
  onHand: number;
  reorderPoint: number;
  openDemand: number;
  openPurchaseCount: number;
  openPurchaseQuantity: number;
  suggestedOrderQuantity: number;
  vendor: string;
  stock: "low" | "ok";
};

export type EditorMode = "create" | "edit";

export type TaskDraft = {
  title: string;
  summary: string;
  subsystemId: string;
  disciplineId: string;
  ownerId: string;
  mentorId: string;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  mechanismId: string | null;
  partInstanceId: string | null;
  targetEventId: string | null;
  estimatedHours: string;
  dependencyIdsText: string;
  checklistItemsText: string;
  blockersText: string;
};

export type WorkLogDraft = {
  taskId: string;
  date: string;
  hours: string;
  participantIdsText: string;
  notes: string;
};

export type ManufacturingDraft = {
  title: string;
  subsystemId: string;
  requestedById: string;
  process: ManufacturingItem["process"];
  dueDate: string;
  material: string;
  quantity: string;
  status: ManufacturingItem["status"];
  mentorReviewed: boolean;
  batchLabel: string;
  qaReviewCount: string;
};

export type PurchaseDraft = {
  title: string;
  subsystemId: string;
  requestedById: string;
  quantity: string;
  vendor: string;
  linkLabel: string;
  estimatedCost: string;
  finalCost: string;
  approvedByMentor: boolean;
  status: PurchaseItem["status"];
};

export type MemberDraft = {
  email: string;
  photoUrl: string;
  name: string;
  role: MemberRole;
  elevated: boolean;
  disciplineId: string;
  plannedWeeklyAttendanceHours: string;
  plannedAttendanceDays: string[];
  plannedAttendanceNotes: string;
};

export type MeetingDraft = {
  title: string;
  date: string;
  time: string;
};

export type SubsystemDraft = {
  name: string;
  description: string;
  responsibleEngineerId: string;
  mentorIdsText: string;
  risksText: string;
};

export type PartDefinitionDraft = {
  name: string;
  partNumber: string;
  revision: string;
  source: string;
  acquisitionMethod: AcquisitionMethod;
};

export type MilestoneDraft = {
  title: string;
  type: EventType;
  isExternal: boolean;
  description: string;
  relatedSubsystemIdsText: string;
};

export type MilestoneSortField = "startDateTime" | "title" | "type";

export type ArchiveFilterMode = "active" | "archived" | "all";
export type BlockerFilterMode =
  | "all"
  | "blocked"
  | "clear"
  | "over-estimate"
  | "overdue"
  | "due-soon"
  | "dependency-wait"
  | "ready-now"
  | "ready-to-qa"
  | "needs-fabrication"
  | "needs-purchase"
  | "unassigned";
export type QaReportDraft = {
  taskId: string;
  participantIdsText: string;
  result: "pass" | "minor-fix" | "iteration-worthy";
  mentorApproved: boolean;
  notes: string;
  evidenceNotes: string;
  followUpTaskTitle: string;
};

export type EventStyle = {
  label: string;
  rowBackground: string;
  borderColor: string;
  chipBackground: string;
  chipText: string;
};
