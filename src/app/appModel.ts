import {
  ApiNetworkError,
  ApiRequestError,
  classifyMobileAuthError,
  getMobileAuthErrorMessage,
} from "../data/api";
import type { PendingWorkLogDraft } from "../services/workLogDraftSync";
import type {
  BootstrapMilestone,
  Event,
  EventType,
  PlatformBootstrapPayload,
  QaReview,
  SessionUser,
  Subsystem,
  Task,
  ServerTask,
  TaskPriority,
  WorkLog,
} from "../types/domain";
import type { AttendanceStatus, RiskPriority, WorkLogListItem } from "../screens/types";

export const SWIPE_ACTIVATION_DISTANCE = 18;
export const SWIPE_COMMIT_DISTANCE = 52;
export const SUBTAB_SWIPE_ACTIVATION_DISTANCE = 24;
export const SUBTAB_SWIPE_COMMIT_DISTANCE = 72;
export const REQUIRED_EMAIL_DOMAIN = "mecorobotics.org";
export const AUTH_REQUEST_TIMEOUT_MS = 15000;

export type SeasonOption = {
  id: string;
  label: string;
};
export type StartTaskOptions = {
  openWorkLog?: boolean;
};
export type BackendReachability = "unknown" | "reachable" | "unreachable";
export type WorkLogMutationResponse = {
  item?: WorkLog;
};
export type MilestoneMutationResponse = {
  item?: BootstrapMilestone;
};

export const RISK_PRIORITY_RANK: Record<RiskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const ATTENDANCE_STATUS_BY_MEMBER_ID: Record<string, AttendanceStatus> = {
  ava: "yes",
  ethan: "maybe",
  jordan: "yes",
  lucas: "no",
  maya: "yes",
  priya: "maybe",
  riley: "yes",
  noah: "yes",
  zoe: "maybe",
  diego: "yes",
  emma: "yes",
  samira: "yes",
  caleb: "maybe",
  nina: "yes",
};

export const INITIAL_SEASONS: SeasonOption[] = [
  { id: "2026-offseason", label: "2026 FRC Offseason" },
  { id: "2027-preseason", label: "2027 FRC Preseason" },
];

export const PLANNED_ATTENDANCE_DAY_OPTIONS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
] as const;

export const REQUIRED_TASK_SUBSYSTEMS: Subsystem[] = [
  {
    id: "climber",
    name: "Climber",
    description: "Endgame lift, latch, and climb release mechanisms.",
    isCore: false,
    parentSubsystemId: null,
    responsibleEngineerId: "priya",
    mentorIds: ["jordan"],
    risks: ["Hook alignment", "Winch load margin"],
  },
  {
    id: "controls",
    name: "Controls",
    description: "Robot software, safety, and autonomous logic.",
    isCore: false,
    parentSubsystemId: "drive",
    responsibleEngineerId: "ethan",
    mentorIds: ["riley"],
    risks: ["Auto safety interlocks"],
  },
  {
    id: "drive",
    name: "Drivetrain",
    description: "Core drivetrain, chassis interfaces, and shared base electronics.",
    isCore: true,
    parentSubsystemId: null,
    responsibleEngineerId: "ava",
    mentorIds: ["jordan"],
    risks: ["Sensor drift", "Cable clearance"],
  },
  {
    id: "manipulator",
    name: "Manipulator",
    description: "Intake, handling, and game-piece interaction hardware.",
    isCore: false,
    parentSubsystemId: "drive",
    responsibleEngineerId: "lucas",
    mentorIds: ["riley"],
    risks: ["Chain wear", "Assembly tolerance"],
  },
  {
    id: "vision",
    name: "Vision",
    description: "Camera targeting, pose estimation, and visual feedback.",
    isCore: false,
    parentSubsystemId: "drive",
    responsibleEngineerId: "ethan",
    mentorIds: ["riley"],
    risks: ["Camera calibration", "Lighting variability"],
  },
];

export function shouldQueueWorkLogDraftAfterError(error: unknown) {
  return (
    error instanceof ApiNetworkError ||
    (error instanceof ApiRequestError && error.status >= 500)
  );
}

export function backendReachabilityAfterError(
  error: unknown,
): BackendReachability {
  return error instanceof ApiNetworkError ? "unreachable" : "reachable";
}

export function mapPendingWorkLogDraftToWorkLog(
  draft: PendingWorkLogDraft,
): WorkLogListItem {
  return {
    id: draft.id,
    localDraftId: draft.id,
    syncError: draft.error,
    syncStatus: draft.status,
    ...draft.payload,
  };
}

export function buildSubsystemOptions(subsystems: Subsystem[]) {
  return subsystems.map((subsystem) => ({
    id: subsystem.id,
    name: subsystem.name,
  }));
}

export function normalizeTaskSubsystems(currentSubsystems: Subsystem[]) {
  return currentSubsystems.length > 0 ? currentSubsystems : REQUIRED_TASK_SUBSYSTEMS;
}

export function parseClientError(error: unknown) {
  const authErrorState = classifyMobileAuthError(error);
  if (authErrorState !== "unknown") {
    return getMobileAuthErrorMessage(authErrorState);
  }

  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Request failed unexpectedly.";
}

export function getClientErrorMessage(
  error: unknown,
  context: "auth-config" | "authenticated" | "general" = "general",
) {
  const authErrorState = classifyMobileAuthError(error, context);
  if (authErrorState !== "unknown") {
    return getMobileAuthErrorMessage(authErrorState);
  }

  return parseClientError(error);
}

export function getEmailCodeVerificationErrorMessage(error: unknown) {
  if (
    error instanceof ApiRequestError &&
    (error.status === 400 || error.status === 401 || error.status === 403)
  ) {
    return "Invalid code. Check the code and try again.";
  }

  return getClientErrorMessage(error);
}

export function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidTimeInput(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function buildTaskById(tasks: Task[]) {
  return Object.fromEntries(tasks.map((task) => [task.id, task])) as Record<string, Task>;
}

export function getQaReviewTaskId(review: QaReview) {
  if (review.taskId) {
    return review.taskId;
  }

  return review.subjectType === "task" && review.subjectId ? review.subjectId : null;
}

export function getOptionalCreatedAt(item: { id: string; createdAt?: string }) {
  return item.createdAt ?? item.id;
}

export function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeTaskFromServer({ targetMilestoneId, ...task }: ServerTask): Task {
  return { ...task, targetEventId: targetMilestoneId };
}

export function mapTaskPayloadToServer<T extends { targetEventId?: string | null }>(
  payload: T,
) {
  const { targetEventId, ...serverPayload } = payload;

  return {
    ...serverPayload,
    targetMilestoneId: targetEventId ?? null,
  };
}

export function mapTaskPriorityToRiskPriority(priority: TaskPriority): RiskPriority {
  if (priority === "critical" || priority === "high") {
    return "high";
  }

  return priority === "low" ? "low" : "medium";
}

export function mapMilestoneTypeToEventType(type: string | undefined): EventType {
  switch (type) {
    case "practice":
      return "drive-practice";
    case "competition":
    case "deadline":
    case "internal-review":
    case "demo":
      return type;
    default:
      return "deadline";
  }
}

export function mapEventTypeToMilestoneType(type: EventType) {
  return type === "drive-practice" ? "practice" : type;
}

export function getPhotoFileName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "No image selected";
  }

  const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
  const fileName = withoutQuery.split("/").filter(Boolean).pop();
  return fileName || "Selected image";
}

export function normalizeRequiredEmailDomain(domain: string | null | undefined) {
  return domain?.trim().toLowerCase().replace(/^@/, "") || REQUIRED_EMAIL_DOMAIN;
}

export function hasRequiredEmailDomain(email: string, requiredDomain: string) {
  const [, domain = ""] = email.split("@");
  const normalizedDomain = domain.toLowerCase();
  return (
    normalizedDomain === requiredDomain ||
    normalizedDomain.endsWith(`.${requiredDomain}`)
  );
}

export function getWorkLogDraftOwnerKey(user: SessionUser | null) {
  return (
    user?.email.trim().toLowerCase() ||
    user?.accountId.trim().toLowerCase() ||
    user?.name.trim().toLowerCase() ||
    null
  );
}

export function isWorkLogDraftOwnedBy(
  draft: PendingWorkLogDraft,
  ownerKey: string | null,
) {
  return (draft.ownerKey ?? null) === ownerKey;
}

export function mapMilestonesToEvents(payload: PlatformBootstrapPayload): Event[] {
  const subsystems = ensureArray(payload.subsystems);

  return ensureArray(payload.milestones).map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    type: mapMilestoneTypeToEventType(milestone.type),
    startDateTime: milestone.startDateTime,
    endDateTime: milestone.endDateTime,
    isExternal: milestone.isExternal,
    description: milestone.description,
    relatedSubsystemIds:
      milestone.relatedSubsystemIds ??
      subsystems
        .filter((subsystem) => ensureArray(milestone.projectIds).includes(subsystem.projectId ?? ""))
        .map((subsystem) => subsystem.id),
  }));
}

export function applyMilestoneSubsystemLinks(
  currentEvents: Event[],
  milestone: BootstrapMilestone | undefined,
  fallbackMilestoneId: string | null,
  relatedSubsystemIds: string[],
) {
  const milestoneId = milestone?.id ?? fallbackMilestoneId;
  if (!milestoneId) {
    return currentEvents;
  }

  return currentEvents.map((event) =>
    event.id === milestoneId ? { ...event, relatedSubsystemIds } : event,
  );
}
