export type MemberRole = "student" | "lead" | "mentor" | "admin" | "external";
export type ClassYear = "freshman" | "sophomore" | "junior" | "senior";
export type PlannedAttendanceDay =
  | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type ProjectType = "robot" | "media" | "outreach" | "operations" | "strategy" | "training";
export type TaskStatus = "not-started" | "in-progress" | "waiting-for-qa" | "complete";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type ReadinessStatus = "not-ready" | "blocked" | "qa" | "ready";
export type FulfillmentSource = "in-house" | "outsourced";
export type AcquisitionMethod = "stock" | "purchase-cots" | "manufacture";
export type PurchaseKind = "cots-goods" | "manufacturing-service";
export type PurchaseApprovalStatus = "pending" | "approved" | "rejected";
export type PurchaseOrderStatus = "not-ordered" | "ordered" | "shipped" | "delivered" | "cancelled";
export type CadSource = "manual" | "step" | "onshape";
export type CadImportSource = "MANUAL" | "STEP_UPLOAD" | "ONSHAPE_API" | "ONSHAPE_BOM_CSV" | "MANUAL_BOM_CSV";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskStatus = "open" | "mitigating" | "accepted" | "resolved";
export type QaResult = "pass" | "minor-fix" | "iteration-worthy";

export interface Season {
  id: string;
  teamId: string;
  name: string;
  type: "season" | "offseason" | "initiative";
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  teamId: string;
  seasonId: string;
  name: "Robot" | "Media" | "Outreach" | "Operations" | "Strategy" | "Training";
  projectType: ProjectType;
  description: string;
  status: "planned" | "active" | "paused" | "complete";
}

export interface WorkType {
  id: string;
  projectType: ProjectType;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ResponsibleGroup {
  id: string;
  seasonId: string;
  name: string;
  projectIds: string[];
  memberIds: string[];
  isArchived: boolean;
}

export interface Workstream {
  id: string;
  projectId: string;
  name: string;
  color?: string;
  description: string;
  isArchived: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: MemberRole;
  classYear?: ClassYear | null;
  elevated: boolean;
  seasonId: string;
  activeSeasonIds: string[];
  plannedWeeklyAttendanceHours?: number;
  plannedAttendanceDays?: PlannedAttendanceDay[];
  plannedAttendanceNotes?: string;
}

export interface Subsystem {
  id: string;
  projectId: string;
  name: string;
  description: string;
  isCore: boolean;
  parentSubsystemId: string | null;
  responsibleEngineerId: string | null;
  mentorIds: string[];
}

export interface Mechanism {
  id: string;
  subsystemId: string;
  name: string;
  description: string;
}

export interface Requirement {
  id: string;
  subsystemId: string;
  title: string;
  description: string;
  moscowPriority: "must" | "should" | "could" | "wont";
  status: "planned" | "in-progress" | "complete";
}

export interface Material {
  id: string;
  name: string;
  category: "metal" | "plastic" | "filament" | "electronics" | "hardware" | "consumable" | "other";
  unit: string;
  onHandQuantity: number;
  reorderPoint: number;
  location: string;
  preferredVendorId: string | null;
  notes: string;
  photoUrl?: string;
}

export interface PartDefinition {
  id: string;
  seasonId: string;
  activeSeasonIds: string[];
  name: string;
  partNumber: string;
  revision: string;
  iteration: number;
  isArchived: boolean;
  isHardware?: boolean;
  type: string;
  defaultAcquisitionMethod: AcquisitionMethod;
  materialId: string | null;
  description: string;
  cadSource: CadSource;
  cadImportSource: CadImportSource;
  cadEditedAfterImport: boolean;
  cadSourceLabel?: string;
  cadUpdatedAt?: string | null;
  photoUrl?: string;
}

export type PartInstanceLocation =
  | { kind: "stock"; location: string }
  | { kind: "installed"; subsystemId: string; mechanismId: string | null }
  | { kind: "repair"; location: string }
  | { kind: "retired"; location: string | null }
  | { kind: "lost" }
  | { kind: "unlocated" };

export interface PartInstance {
  id: string;
  partDefinitionId: string;
  intendedSubsystemId: string | null;
  intendedMechanismId: string | null;
  location: PartInstanceLocation;
  readinessStatus?: ReadinessStatus;
  photoUrl?: string;
  cadSource: CadSource;
  cadImportSource: CadImportSource;
  cadEditedAfterImport: boolean;
  cadSourceLabel?: string;
  cadUpdatedAt?: string | null;
}

export type ScheduleReference =
  | { kind: "meeting"; id: string }
  | { kind: "event"; id: string }
  | { kind: "milestone"; id: string };

export type TaskDependency =
  | { id: string; taskId: string; kind: "task"; refId: string; requiredState: TaskStatus; dependencyType: "hard" | "soft"; createdAt: string }
  | { id: string; taskId: string; kind: "milestone"; refId: string; requiredState: ReadinessStatus; dependencyType: "hard" | "soft"; createdAt: string }
  | { id: string; taskId: string; kind: "part-instance"; refId: string; requiredCondition: { kind: "physical-location"; value: PartInstanceLocation["kind"] } | { kind: "derived-readiness"; value: ReadinessStatus }; dependencyType: "hard" | "soft"; createdAt: string };

export type ManufacturedPartRef =
  | { kind: "part-definition"; partDefinitionId: string }
  | { kind: "provisional"; partNumber: string; revision: string };
export type MaterialRequirement =
  | { kind: "inventory-material"; materialId: string }
  | { kind: "specified-material"; name: string };

export interface ManufacturingProcess {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ManufacturingDetails {
  part: ManufacturedPartRef;
  quantity: number;
  processId: string;
  fulfillmentSource: FulfillmentSource;
  material: MaterialRequirement;
  fileArtifactIds: string[];
  tolerances: string[];
  qaRequirements: string[];
  batchLabel?: string;
}

export interface Task {
  id: string;
  createdAt?: string;
  serialNumber?: number;
  serial?: string;
  projectId: string;
  workTypeId: string;
  responsibleGroupId: string | null;
  workstreamIds: string[];
  title: string;
  summary: string;
  photoUrl?: string;
  subsystemIds: string[];
  mechanismIds: string[];
  partInstanceIds: string[];
  scheduleRefs: ScheduleReference[];
  requestedById: string | null;
  ownerId: string | null;
  assigneeIds: string[];
  mentorId: string | null;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  checklistItems: string[];
  estimatedHours: number;
  actualHours: number;
  requiresDocumentation: boolean;
  manufacturingDetails: ManufacturingDetails | null;
  isBlocked?: boolean;
  isWaitingOnDependency?: boolean;
}

export type ManufacturingProcessRecord = ManufacturingProcess;

export interface Vendor {
  id: string;
  name: string;
  website: string | null;
  isArchived: boolean;
}

export interface Money {
  amount: number;
  currency: string | null;
}

export interface PurchaseQuote {
  id: string;
  vendorId: string;
  reference: string | null;
  amount: Money | null;
  url?: string;
  expiresAt?: string | null;
  quotedAt: string | null;
}

export interface PurchaseItem {
  id: string;
  taskId: string;
  kind: PurchaseKind;
  partDefinitionId: string | null;
  materialId: string | null;
  title: string;
  quantity: number;
  quotes: PurchaseQuote[];
  selectedQuoteId: string | null;
  approvalStatus: PurchaseApprovalStatus;
  approvedById: string | null;
  approvedAt: string | null;
  purchaseOrderNumber: string | null;
  orderStatus: PurchaseOrderStatus;
  finalCost: Money | null;
  expectedDeliveryDate: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  orderedAt: string | null;
  deliveredAt: string | null;
}

export type DomainReference =
  | { kind: "project" | "workstream" | "responsible-group" | "task" | "subsystem" | "mechanism" | "part-definition" | "part-instance" | "material" | "vendor" | "manufacturing-details" | "purchase-item" | "meeting" | "event" | "milestone" | "qa-request" | "test-result" | "report" | "artifact" | "qa-finding" | "test-finding" | "task-dependency" | "risk" | "design-iteration"; id: string };

export type RiskSource = { kind: "manual" } | { kind: "task" | "task-dependency" | "qa-finding" | "test-finding" | "qa-request" | "test-result" | "report" | "event" | "milestone" | "manufacturing-details" | "part-instance" | "material"; id: string };
export type RiskCategory = "dependency" | "design" | "manufacturing" | "supply" | "schedule" | "qa" | "inventory" | "other";
export interface Risk {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  category: RiskCategory;
  severity: RiskSeverity;
  status: RiskStatus;
  blocksWork: boolean;
  source: RiskSource;
  relatedTargets: DomainReference[];
  mitigationTaskId: string | null;
  ownerGroupId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export type RiskMutationPayload = Omit<Risk, "id" | "createdAt" | "updatedAt" | "resolvedAt">;

export interface Meeting {
  id: string;
  seasonId: string;
  projectIds: string[];
  title: string;
  meetingType: "general" | "build" | "review" | "outreach" | "competition" | "other";
  startAt: string;
  endAt: string | null;
  location: string;
  description: string;
}

export interface Event {
  id: string;
  seasonId: string;
  projectIds: string[];
  eventType: "competition" | "practice" | "other";
  title: string;
  startAt: string;
  endAt: string | null;
  location: string;
  description: string;
}

export interface Milestone {
  id: string;
  seasonId: string;
  projectIds: string[];
  type: "practice" | "competition" | "deadline" | "internal-review" | "demo";
  title: string;
  startAt: string;
  endAt: string | null;
  status: "planned" | "active" | "complete";
  readinessStatus?: ReadinessStatus;
  description: string;
}

export interface MilestoneRequirement {
  id: string;
  milestoneId: string;
  targetRefs: DomainReference[];
  conditionType: "iteration" | "workflow-state" | "custom";
  conditionValue: string;
  required: boolean;
  sortOrder: number;
  notes: string;
}

export interface ReportBase {
  id: string;
  projectId: string;
  targetRefs: DomainReference[];
  createdByMemberId: string | null;
  participantIds: string[];
  mentorId: string | null;
  requestedById: string | null;
  summary: string;
  notes: string;
  evidenceNotes?: string;
  photoUrl?: string;
  createdAt: string;
  status: "draft" | "submitted" | "reviewed";
}
export interface QaReport extends ReportBase { reportType: "qa"; result: QaResult; reviewedById: string | null; reviewedAt: string | null }
export interface TeamReport extends ReportBase { reportType: "practice" | "competition" | "review"; result: string | null }
export type Report = QaReport | TeamReport;

export interface QaRequest {
  id: string;
  projectId: string;
  targetRefs: DomainReference[];
  subject: string;
  requestedById: string | null;
  mentorId: string | null;
  createdAt: string;
  status: "requested" | "in-review" | "complete" | "cancelled";
}
export interface QaFinding {
  id: string;
  reportId: string | null;
  projectId: string;
  targetRefs: DomainReference[];
  title: string;
  detail: string;
  severity: RiskSeverity;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  updatedAt: string;
}
export interface TestResult { id: string; projectId: string; targetRefs: DomainReference[]; title: string; status: "pass" | "fail" | "blocked" }
export interface TestFinding extends QaFinding { testResultId: string }
export interface Artifact {
  id: string;
  projectId: string;
  kind: "document" | "evidence" | "media" | "other";
  title: string;
  summary: string;
  status: "draft" | "in-review" | "published" | "archived";
  uri: string;
  targetRefs: DomainReference[];
  updatedAt: string;
  photoUrl?: string;
}

export interface WorkLog { id: string; taskId: string; date: string; hours: number; participantIds: string[]; notes: string }
export interface AttendanceRecord { id: string; memberId: string; date: string; totalHours: number }
export interface HelpRequest { id: string; taskId?: string | null; workLogId?: string | null; reason: string; mentorId: string; requestedById: string | null; createdAt: string; status: "requested" }
export interface DesignIteration { id: string; taskId?: string | null; artifactId?: string | null; artifactIds?: string[]; [key: string]: unknown }

export interface PlatformBootstrapPayload {
  x_contract: { contractVersion: "v1" };
  seasons: Season[];
  projects: Project[];
  workTypes: WorkType[];
  responsibleGroups: ResponsibleGroup[];
  workstreams: Workstream[];
  vendors: Vendor[];
  members: Member[];
  subsystems: Subsystem[];
  mechanisms: Mechanism[];
  requirements: Requirement[];
  tasks: Task[];
  taskDependencies: TaskDependency[];
  manufacturingProcesses: ManufacturingProcess[];
  purchaseItems: PurchaseItem[];
  materials: Material[];
  partDefinitions: PartDefinition[];
  partInstances: PartInstance[];
  meetings: Meeting[];
  events: Event[];
  milestones: Milestone[];
  risks: Risk[];
  reports: Report[];
  qaRequests: QaRequest[];
  qaFindings: QaFinding[];
  testResults: TestResult[];
  testFindings: TestFinding[];
  artifacts: Artifact[];
  workLogs: WorkLog[];
  attendanceRecords: AttendanceRecord[];
  milestoneRequirements: MilestoneRequirement[];
  helpRequests?: HelpRequest[];
  designIterations?: DesignIteration[];
}

export interface PublicAuthConfig { enabled: boolean; googleClientId: string | null; hostedDomain: string; emailEnabled: boolean; devBypassAvailable?: boolean }
export interface SessionUser {
  accountId: string;
  authProvider: "google" | "email";
  email: string;
  name: string;
  picture: string | null;
  hostedDomain: string;
  role?: MemberRole;
}
export interface SessionResponse { token: string; user: SessionUser }
export interface MobileDeviceSessionSummary { createdAt: string; current: boolean; deviceName?: string | null; expiresAt: string; id: string; lastUsedAt: string }
export interface MobileSessionResponse extends SessionResponse {
  accessTokenExpiresAt: string;
  refreshToken: string;
  session: Pick<MobileDeviceSessionSummary, "createdAt" | "id" | "lastUsedAt">;
  sessionExpiresAt: string;
}
