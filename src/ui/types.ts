import type { MemberRole } from "../types/domain";
export type ViewTab =
  | "home"
  | "work-tasks" | "work-schedule" | "work-risks" | "work-activity" | "work-documents" | "work-reports"
  | "resources-materials" | "resources-parts" | "resources-purchases"
  | "resources-structure"
  | "team-people";

export type TaskViewTab = "timeline" | "queue" | "milestones" | "calendar";
export type ResponsibleGroupFilter = string;

export type StatusGroup = "success" | "info" | "warning" | "danger" | "neutral";

export type WorkLogSortMode = "recent" | "oldest" | "longest" | "shortest";
export type AcquisitionMethod = "stock" | "purchase-cots" | "manufacture";

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

export type WorkLogDraft = {
  taskId: string;
  date: string;
  hours: string;
  participantIdsText: string;
  notes: string;
};

export type MemberDraft = {
  email: string;
  photoUrl: string;
  name: string;
  role: MemberRole;
  elevated: boolean;
  plannedWeeklyAttendanceHours: string;
  plannedAttendanceDays: string[];
  plannedAttendanceNotes: string;
};

export type SubsystemDraft = {
  name: string;
  description: string;
  responsibleEngineerId: string;
  mentorIdsText: string;
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
