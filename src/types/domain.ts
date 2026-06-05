export type MemberRole = "student" | "lead" | "mentor" | "admin" | "external";
export type PlannedAttendanceDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type EventType =
  | "drive-practice"
  | "competition"
  | "deadline"
  | "internal-review"
  | "demo";
export type DisciplineCode =
  | "mechanical"
  | "electrical"
  | "software"
  | "integration"
  | "qa-test";
export type TaskStatus =
  | "not-started"
  | "in-progress"
  | "waiting-for-qa"
  | "complete";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type MoscowPriority = "must" | "should" | "could" | "wont";
export type RequirementStatus = "planned" | "in-progress" | "complete";
export type ManufacturingStatus =
  | "requested"
  | "approved"
  | "in-progress"
  | "qa"
  | "complete";
export type ManufacturingProcess = "3d-print" | "cnc" | "fabrication";
export type PurchaseStatus =
  | "requested"
  | "approved"
  | "purchased"
  | "shipped"
  | "delivered";
export type PartInstanceStatus =
  | "planned"
  | "needed"
  | "available"
  | "installed"
  | "retired";
export type QaResult = "pass" | "minor-fix" | "iteration-worthy";

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  email?: string;
  photoUrl?: string;
  elevated?: boolean;
  disciplineId?: string | null;
  seasonId?: string;
  plannedWeeklyAttendanceHours?: number;
  plannedAttendanceDays?: PlannedAttendanceDay[];
  plannedAttendanceNotes?: string;
}

export interface Subsystem {
  id: string;
  projectId?: string;
  name: string;
  description: string;
  isCore: boolean;
  parentSubsystemId: string | null;
  responsibleEngineerId: string | null;
  mentorIds: string[];
  risks: string[];
}

export interface Discipline {
  id: string;
  code: DisciplineCode;
  name: string;
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
  moscowPriority: MoscowPriority;
  status: RequirementStatus;
}

export interface PartDefinition {
  id: string;
  name: string;
  partNumber: string;
  revision: string;
  type: string;
  source: string;
  materialId?: string | null;
  description?: string;
}

export interface PartInstance {
  id: string;
  subsystemId: string;
  mechanismId: string | null;
  partDefinitionId: string;
  name: string;
  quantity: number;
  trackIndividually: boolean;
  status?: PartInstanceStatus;
}

export interface Task {
  id: string;
  projectId?: string;
  workstreamId?: string | null;
  title: string;
  summary: string;
  subsystemId: string;
  disciplineId: string;
  requirementId?: string | null;
  mechanismId: string | null;
  partInstanceId: string | null;
  targetEventId: string | null;
  artifactId?: string | null;
  artifactIds?: string[];
  ownerId: string | null;
  assigneeIds?: string[];
  mentorId: string | null;
  startDate?: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencyIds: string[];
  checklistItems?: string[];
  blockers: string[];
  isBlocked: boolean;
  linkedManufacturingIds: string[];
  linkedPurchaseIds: string[];
  estimatedHours: number;
  actualHours: number;
  requiresDocumentation?: boolean;
  documentationLinked?: boolean;
}

export interface Event {
  id: string;
  title: string;
  type: EventType;
  startDateTime: string;
  endDateTime: string | null;
  isExternal: boolean;
  description: string;
  relatedSubsystemIds: string[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  rsvpsYes: number;
  rsvpsMaybe: number;
  openSignIns: number;
}

export interface WorkLog {
  id: string;
  taskId: string;
  date: string;
  hours: number;
  participantIds: string[];
  notes: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  totalHours: number;
}

export interface ManufacturingItem {
  id: string;
  title: string;
  subsystemId: string;
  requestedById: string | null;
  process: ManufacturingProcess;
  dueDate: string;
  material: string;
  partDefinitionId?: string | null;
  quantity: number;
  status: ManufacturingStatus;
  mentorReviewed: boolean;
  batchLabel?: string;
  qaReviewCount: number;
}

export interface PurchaseItem {
  id: string;
  title: string;
  subsystemId: string;
  requestedById: string | null;
  partDefinitionId?: string | null;
  quantity: number;
  vendor: string;
  linkLabel: string;
  estimatedCost: number;
  finalCost?: number;
  approvedByMentor: boolean;
  status: PurchaseStatus;
}

export interface QaReview {
  id: string;
  taskId?: string | null;
  subjectId?: string | null;
  subjectType?: "task" | "manufacturing" | string;
  subjectTitle: string;
  participantIds: string[];
  requestedById?: string | null;
  mentorId?: string | null;
  result: QaResult;
  mentorApproved: boolean;
  notes: string;
  evidenceNotes?: string;
}

export interface QaRequest {
  id: string;
  taskId?: string | null;
  subject: string;
  mentorId: string;
  requestedById: string | null;
  createdAt: string;
  status: "requested";
}

export interface HelpRequest {
  id: string;
  taskId?: string | null;
  workLogId?: string | null;
  reason: string;
  mentorId: string;
  requestedById: string | null;
  createdAt: string;
  status: "requested";
}

export interface QAFinding {
  id: string;
  taskId?: string | null;
  artifactId?: string | null;
  artifactIds?: string[];
  [key: string]: unknown;
}

export interface TestFinding {
  id: string;
  taskId?: string | null;
  artifactId?: string | null;
  artifactIds?: string[];
  [key: string]: unknown;
}

export interface DesignIteration {
  id: string;
  taskId?: string | null;
  artifactId?: string | null;
  artifactIds?: string[];
  [key: string]: unknown;
}

export interface Escalation {
  title: string;
  detail: string;
  severity: "high" | "medium";
}

export interface BootstrapMilestone {
  id: string;
  title: string;
  type?: string;
  startDateTime: string;
  endDateTime: string | null;
  isExternal: boolean;
  description: string;
  projectIds?: string[];
  relatedSubsystemIds?: string[];
}

export interface PlatformBootstrapPayload {
  members?: Member[];
  subsystems?: Subsystem[];
  disciplines?: Discipline[];
  mechanisms?: Mechanism[];
  partDefinitions?: PartDefinition[];
  partInstances?: PartInstance[];
  tasks?: Task[];
  events?: Event[];
  milestones?: BootstrapMilestone[];
  meetings?: Meeting[];
  workLogs?: WorkLog[];
  manufacturingItems?: ManufacturingItem[];
  purchaseItems?: PurchaseItem[];
  qaRequests?: QaRequest[];
  helpRequests?: HelpRequest[];
  qaFindings?: QAFinding[];
  testFindings?: TestFinding[];
  designIterations?: DesignIteration[];
}

export interface PublicAuthConfig {
  enabled: boolean;
  googleClientId: string | null;
  hostedDomain: string;
  emailEnabled: boolean;
  devBypassAvailable?: boolean;
}

export interface SessionUser {
  accountId: string;
  authProvider: "google" | "email";
  email: string;
  name: string;
  picture: string | null;
  hostedDomain: string;
  taskSubteamIds?: (
    | "programming"
    | "mechanical"
    | "electrical"
    | "media-marketing"
    | "business"
    | "scouting"
  )[];
  role?: MemberRole;
}

export interface SessionResponse {
  token: string;
  user: SessionUser;
}
