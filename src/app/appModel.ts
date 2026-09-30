import {
  ApiNetworkError,
  ApiRequestError,
  classifyMobileAuthError,
  getMobileAuthErrorMessage,
} from "../data/api";
import type { PendingWorkLogDraft } from "../services/workLogDraftSync";
import type {
  Event,
  Meeting,
  Milestone,
  QaReport,
  RiskSeverity,
  SessionUser,
  Subsystem,
  Task,
  WorkLog,
} from "../types/domain";
import type { WorkLogListItem } from "../screens/types";

export const REQUIRED_EMAIL_DOMAIN = "mecorobotics.org";
export const AUTH_REQUEST_TIMEOUT_MS = 15000;

export type StartTaskOptions = {
  openWorkLog?: boolean;
};
export type BackendReachability = "unknown" | "reachable" | "unreachable";
export type WorkLogMutationResponse = {
  item?: WorkLog;
};
export const RISK_PRIORITY_RANK: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PLANNED_ATTENDANCE_DAY_OPTIONS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
] as const;

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

export function getQaReviewTaskId(report: QaReport) {
  return report.targetRefs.find((target) => target.kind === "task")?.id ?? null;
}

export function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function mapTaskPayloadToServer<T>(payload: T) { return payload; }

export type ScheduleEntry = {
  id: string;
  recordType: "meeting" | "event" | "milestone";
  title: string;
  type: string;
  startDateTime: string;
  endAt: string | null;
  description: string;
  projectIds: string[];
};

export function buildScheduleEntries(
  meetings: Meeting[], events: Event[], milestones: Milestone[],
): ScheduleEntry[] {
  return [
    ...meetings.map((item) => ({ id: item.id, recordType: "meeting" as const, title: item.title, type: item.meetingType, startDateTime: item.startAt, endAt: item.endAt, description: item.description, projectIds: item.projectIds })),
    ...events.map((item) => ({ id: item.id, recordType: "event" as const, title: item.title, type: item.eventType, startDateTime: item.startAt, endAt: item.endAt, description: item.description, projectIds: item.projectIds })),
    ...milestones.map((item) => ({ id: item.id, recordType: "milestone" as const, title: item.title, type: item.type, startDateTime: item.startAt, endAt: item.endAt, description: item.description, projectIds: item.projectIds })),
  ];
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
