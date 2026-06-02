import type { Dispatch, SetStateAction } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

import type { AppThemeColors } from "../theme";
import type { HelpRequestInput } from "../data/helpRequests";
import type { WorkLogDraftSyncStatus } from "../services/workLogDraftSync";
import type {
  Discipline,
  Event,
  HelpRequest,
  ManufacturingItem,
  Mechanism,
  Member,
  PartDefinition,
  PartInstance,
  PurchaseItem,
  QaRequest,
  QaReview,
  Subsystem,
  Task,
  WorkLog,
} from "../types/domain";
import type {
  ArchiveFilterMode,
  BlockerFilterMode,
  EventReportDraft,
  InventoryViewTab,
  ManufacturingViewTab,
  MaterialRollup,
  MilestoneSortField,
  Option,
  PartLifecycleStatus,
  SummaryChipData,
  TaskSubteamTab,
  TaskViewTab,
  ViewTab,
  WorkLogSortMode,
} from "../ui/types";

export type AttendanceStatus = "yes" | "maybe" | "no";
export type AttendanceRow = {
  member: Member;
  status: AttendanceStatus;
};

export type PartInstanceStatusRow = {
  partInstance: PartInstance;
  status: PartLifecycleStatus;
};

export type RiskPriority = "high" | "medium" | "low";
export type RiskRow = {
  detail: string;
  id: string;
  priority: RiskPriority;
  source: string;
  subsystemId: string;
  title: string;
};

export type HomeActionItem = {
  detail: string;
  id: string;
  label: string;
  onPressTargetId: string;
  priority: "critical" | "high" | "medium";
  source: "manufacturing" | "purchase" | "task";
  title: string;
};

export type SubsystemCounts = {
  blockedTasks: number;
  health: "good" | "watch" | "risk";
  mechanisms: number;
  openTasks: number;
  openPurchases: number;
  overdueTasks: number;
  qaFindings: number;
  waitingQa: number;
  risks: number;
  tasks: number;
};

export type WorkLogListItem = WorkLog & {
  localDraftId?: string;
  syncError?: string;
  syncStatus?: WorkLogDraftSyncStatus;
};

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type TextSetter = StateSetter<string>;
type ResponsiveScreenStyles = {
  calloutBody: StyleProp<TextStyle>;
  calloutBox: StyleProp<ViewStyle>;
  calloutTitle: StyleProp<TextStyle>;
  editTag: StyleProp<TextStyle>;
  memberAvatar: StyleProp<ViewStyle>;
  memberRow: StyleProp<ViewStyle>;
  memberRowSelected: StyleProp<ViewStyle>;
  metaLine: StyleProp<TextStyle>;
  navCount: StyleProp<ViewStyle>;
  primaryAction: StyleProp<ViewStyle>;
  primaryActionLabel: StyleProp<TextStyle>;
  quickActionButton: StyleProp<ViewStyle>;
  quickActionButtonLabel: StyleProp<TextStyle>;
  rosterSection: StyleProp<ViewStyle>;
  rowBody: StyleProp<TextStyle>;
  rowCard: StyleProp<ViewStyle>;
  rowSubtitle: StyleProp<TextStyle>;
  rowTitle: StyleProp<TextStyle>;
  subsectionLabel: StyleProp<TextStyle>;
  tableHeaderText: StyleProp<TextStyle>;
};

export interface AppScreenProps {
  activeTaskSubteam: TaskSubteamTab;
  activeTaskSubteamLabel: string;
  appResponsiveStyles: ResponsiveScreenStyles;
  attendancePreview: AttendanceRow[];
  attendanceSummary: SummaryChipData[];
  canMentorApprove: boolean;
  clearTaskBlockers: (task: Task, resolutionNote: string) => Promise<void>;
  disciplinesById: Record<string, Discipline>;
  editTagStyle: StyleProp<TextStyle>;
  eventOptions: Option[];
  eventReports: EventReportDraft[];
  events: Event[];
  eventsById: Record<string, Event>;
  filteredManufacturing: ManufacturingItem[];
  filteredMaterialRollups: MaterialRollup[];
  filteredMilestones: Event[];
  filteredPartDefinitions: PartDefinition[];
  filteredPartInstances: PartInstanceStatusRow[];
  filteredPurchases: PurchaseItem[];
  filteredSubsystems: Subsystem[];
  filteredTaskQueue: Task[];
  filteredWorkLogs: WorkLogListItem[];
  helpRequests: HelpRequest[];
  homeInventoryNeeds: PurchaseItem[];
  homeActionItems: HomeActionItem[];
  homeMeetingExport: string;
  homePriorityTasks: Task[];
  homeTaskSummary: SummaryChipData[];
  inventoryView: InventoryViewTab;
  isCompactLayout: boolean;
  isLandscapeCardLayout: boolean;
  isLandscapeTimelineLayout: boolean;
  isSyncing: boolean;
  manufacturingItems: ManufacturingItem[];
  manufacturingArchiveFilter: ArchiveFilterMode;
  manufacturingMaterialFilter: string;
  manufacturingMaterialOptions: { id: string; name: string }[];
  manufacturingRequesterFilter: string;
  manufacturingSearch: string;
  manufacturingStatusFilter: string;
  manufacturingSubsystemFilter: string;
  manufacturingSummary: SummaryChipData[];
  manufacturingView: ManufacturingViewTab;
  materialsCategoryFilter: string;
  materialsSearch: string;
  materialsStockFilter: string;
  mechanisms: Mechanism[];
  mechanismsById: Record<string, Mechanism>;
  meetingAttendance: AttendanceRow[];
  members: Member[];
  membersById: Record<string, Member>;
  milestoneSearch: string;
  milestoneSortField: MilestoneSortField;
  milestoneSortOrder: "asc" | "desc";
  milestoneSummary: SummaryChipData[];
  milestoneTypeFilter: string;
  openCreateDeadlineEditor: () => void;
  openCreateEventReportEditor: (eventId?: string) => void;
  openCreateManufacturingEditor: () => void;
  openCreateMemberEditor: (role?: Member["role"]) => void;
  openCreateMilestoneEditor: () => void;
  openCreatePartDefinitionEditor: () => void;
  openCreatePurchaseEditor: () => void;
  openCreateQaReportEditor: (taskId?: string, qaRequestId?: string) => void;
  openCreateSubsystemEditor: () => void;
  openCreateTaskEditor: () => void;
  openCreateWorkLogEditor: (taskId?: string) => void;
  openWorkLogFromTimer: () => void;
  createQaRequest: (subject: string, mentorId: string, taskId?: string | null) => void;
  openEditManufacturingEditor: (item: ManufacturingItem) => void;
  openEditMemberEditor: (memberId: string) => void;
  openEditMilestoneEditor: (event: Event) => void;
  openEditPartDefinitionEditor: (partDefinitionId: string) => void;
  openEditPurchaseEditor: (item: PurchaseItem) => void;
  openEditSubsystemEditor: (subsystem: Subsystem) => void;
  openEditTaskEditor: (task: Task) => void;
  openEditWorkLogEditor: (workLog: WorkLog) => void;
  openDuplicateTaskEditor: (task: Task) => void;
  openInventoryPurchases: () => void;
  openMaterialRestockEditor: (row: MaterialRollup) => void;
  openTaskQueueFromTask: (task: Task) => void;
  requestTaskQa: (task: Task) => Promise<void>;
  startTask: (task: Task) => Promise<void>;
  partDefinitions: PartDefinition[];
  partDefinitionsById: Record<string, PartDefinition>;
  partInstancesById: Record<string, PartInstance>;
  partInstancesWithStatus: PartInstanceStatusRow[];
  partsSearch: string;
  partsStatusFilter: string;
  partsSubsystemFilter: string;
  patchManufacturingItem: (
    item: ManufacturingItem,
    patch: Partial<Pick<ManufacturingItem, "mentorReviewed" | "status">>,
  ) => Promise<void>;
  purchaseApprovalFilter: string;
  purchaseItems: PurchaseItem[];
  purchaseArchiveFilter: ArchiveFilterMode;
  purchaseRequesterFilter: string;
  purchaseSearch: string;
  purchaseStatusFilter: string;
  purchaseSubsystemFilter: string;
  purchaseVendorFilter: string;
  purchaseVendorOptions: { id: string; name: string }[];
  qaRequests: QaRequest[];
  qaReviews: QaReview[];
  reportSummary: SummaryChipData[];
  requestHelp: (input: HelpRequestInput) => boolean;
  riskRows: RiskRow[];
  riskSummary: SummaryChipData[];
  rosterAdmins: Member[];
  rosterExternal: Member[];
  rosterMentors: Member[];
  rosterStudents: Member[];
  selectedMemberId: string | null;
  selectedSubsystem: Subsystem | null;
  setActiveTab: StateSetter<ViewTab>;
  setActiveTaskSubteam: StateSetter<TaskSubteamTab>;
  setAttendanceStatusByMemberId: StateSetter<Record<string, AttendanceStatus>>;
  setManufacturingArchiveFilter: StateSetter<ArchiveFilterMode>;
  setManufacturingMaterialFilter: TextSetter;
  setManufacturingRequesterFilter: TextSetter;
  setManufacturingSearch: TextSetter;
  setManufacturingStatusFilter: TextSetter;
  setManufacturingSubsystemFilter: TextSetter;
  setMaterialsCategoryFilter: TextSetter;
  setMaterialsSearch: TextSetter;
  setMaterialsStockFilter: TextSetter;
  setMilestoneSearch: TextSetter;
  setMilestoneSortField: StateSetter<MilestoneSortField>;
  setMilestoneSortOrder: StateSetter<"asc" | "desc">;
  setMilestoneTypeFilter: TextSetter;
  setPartsSearch: TextSetter;
  setPartsStatusFilter: TextSetter;
  setPartsSubsystemFilter: TextSetter;
  setPurchaseApprovalFilter: TextSetter;
  setPurchaseArchiveFilter: StateSetter<ArchiveFilterMode>;
  setPurchaseRequesterFilter: TextSetter;
  setPurchaseSearch: TextSetter;
  setPurchaseStatusFilter: TextSetter;
  setPurchaseSubsystemFilter: TextSetter;
  setPurchaseVendorFilter: TextSetter;
  setSelectedMemberId: StateSetter<string | null>;
  setSelectedSubsystemId: StateSetter<string>;
  setSubsystemSearch: TextSetter;
  setTaskArchiveFilter: StateSetter<ArchiveFilterMode>;
  setTaskBlockerFilter: StateSetter<BlockerFilterMode>;
  setTaskOwnerFilter: TextSetter;
  setTaskPriorityFilter: TextSetter;
  setTaskSearch: TextSetter;
  setTaskStatusFilter: TextSetter;
  setTaskSubsystemFilter: TextSetter;
  setTaskView: StateSetter<TaskViewTab>;
  setTimelineMilestoneFilter: TextSetter;
  setTimelineSubsystemFilter: TextSetter;
  setWorkLogSearch: TextSetter;
  setWorkLogSortMode: StateSetter<WorkLogSortMode>;
  setWorkLogSubsystemFilter: TextSetter;
  shiftTaskDueDates: (tasksToShift: Task[], dayDelta: number) => Promise<void>;
  subsystemCountsById: Record<string, SubsystemCounts>;
  subsystemSearch: string;
  subsystems: Subsystem[];
  subsystemsById: Record<string, Subsystem>;
  syncFromBackend: () => Promise<void>;
  taskArchiveFilter: ArchiveFilterMode;
  taskBlockerFilter: BlockerFilterMode;
  taskById: Record<string, Task>;
  taskOwnerFilter: string;
  taskPriorityFilter: string;
  taskSearch: string;
  taskStatusFilter: string;
  taskSubsystemFilter: string;
  taskLoggedHoursById: Record<string, number>;
  taskSummary: SummaryChipData[];
  taskView: TaskViewTab;
  tasks: Task[];
  themeColors: AppThemeColors;
  timelineMilestoneFilter: string;
  timelineSubsystemFilter: string;
  timelineTasks: Task[];
  workLogSearch: string;
  workLogs: WorkLog[];
  workLogSortMode: WorkLogSortMode;
  workLogSubsystemFilter: string;
  workLogSummary: SummaryChipData[];
  workTimerElapsedLabel: string;
  workTimerIsActive: boolean;
  workTimerIsPaused: boolean;
  startWorkLogTimer: () => void;
  pauseWorkLogTimer: () => void;
}
