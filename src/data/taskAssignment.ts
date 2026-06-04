import type { ApiRequestError } from "./api";
import { requestJson } from "./api";
import type { Member, Task, TaskStatus } from "../types/domain";

export const TASK_ALREADY_CLAIMED_CODE = "task_already_claimed";

export type TaskAssignmentResponse = {
  item?: Task;
};

export type TaskAssignmentConflict = {
  code: typeof TASK_ALREADY_CLAIMED_CODE;
  message: string;
  ownerId: string | null;
  taskId: string | null;
};

export type TaskAssignmentState = {
  canClaim: boolean;
  canRelease: boolean;
  canReassign: boolean;
  canStartWork: boolean;
  isClaimedByCurrentMember: boolean;
  isClaimedByOtherMember: boolean;
  ownerName: string;
};

type AssignmentStateInput = {
  canReassignTasks: boolean;
  hasOpenDependencies: boolean;
  membersById: Record<string, Member>;
  signedInMember: Member | null;
  task: Task;
};

function canOwnTask(member: Member | null) {
  return member?.role === "student" || member?.role === "lead";
}

function isConflictPayload(value: unknown): value is {
  code?: unknown;
  message?: unknown;
  ownerId?: unknown;
  taskId?: unknown;
} {
  return typeof value === "object" && value !== null;
}

export function getTaskAssignmentConflict(error: unknown): TaskAssignmentConflict | null {
  const candidate = error as Partial<ApiRequestError> | null;
  if (!candidate || candidate.status !== 409 || !isConflictPayload(candidate.body)) {
    return null;
  }

  if (candidate.body.code !== TASK_ALREADY_CLAIMED_CODE) {
    return null;
  }

  return {
    code: TASK_ALREADY_CLAIMED_CODE,
    message:
      typeof candidate.body.message === "string"
        ? candidate.body.message
        : "This task was already claimed.",
    ownerId:
      typeof candidate.body.ownerId === "string" ? candidate.body.ownerId : null,
    taskId:
      typeof candidate.body.taskId === "string" ? candidate.body.taskId : null,
  };
}

export function getTaskAssignmentConflictMessage(
  conflict: TaskAssignmentConflict,
  membersById: Record<string, Member>,
  refreshed = true,
) {
  const ownerName = conflict.ownerId
    ? membersById[conflict.ownerId]?.name ?? "someone else"
    : "someone else";

  return refreshed
    ? `Already claimed by ${ownerName}. The task list has been refreshed.`
    : `Already claimed by ${ownerName}. Refresh failed; pull to refresh before trying again.`;
}

export function getTaskAssignmentState({
  canReassignTasks,
  hasOpenDependencies,
  membersById,
  signedInMember,
  task,
}: AssignmentStateInput): TaskAssignmentState {
  const isClaimed = Boolean(task.ownerId);
  const canSignedInMemberOwnTasks = canOwnTask(signedInMember);
  const isClaimedByCurrentMember = Boolean(
    canSignedInMemberOwnTasks && task.ownerId === signedInMember?.id,
  );
  const isClaimedByOtherMember = isClaimed && !isClaimedByCurrentMember;
  const isDone = task.status === "complete";
  const isBlocked = task.blockers.length > 0 || hasOpenDependencies;

  return {
    canClaim: canSignedInMemberOwnTasks && !isDone && !isClaimed,
    canRelease:
      !isDone && (isClaimedByCurrentMember || (canReassignTasks && isClaimed)),
    canReassign: canReassignTasks && !isDone,
    canStartWork:
      canSignedInMemberOwnTasks &&
      !isDone &&
      !isBlocked &&
      (task.status === "not-started" || task.status === "in-progress") &&
      (!task.ownerId || isClaimedByCurrentMember),
    isClaimedByCurrentMember,
    isClaimedByOtherMember,
    ownerName: task.ownerId
      ? membersById[task.ownerId]?.name ?? "Unknown owner"
      : "Unassigned",
  };
}

export function getDefaultWorkLogParticipantIds(
  signedInMember: Member | null,
  members: Member[],
) {
  if (signedInMember?.id) {
    return [signedInMember.id];
  }

  return members[0]?.id ? [members[0].id] : [];
}

export function getTaskStartActionLabel(task: Pick<Task, "ownerId">) {
  return task.ownerId ? "Start work" : "Claim + log work";
}

export function buildOwnedTaskStartPayload(task: Task, status: TaskStatus) {
  return {
    title: task.title,
    summary: task.summary,
    subsystemId: task.subsystemId,
    disciplineId: task.disciplineId,
    mechanismId: task.mechanismId,
    partInstanceId: task.partInstanceId,
    targetMilestoneId: task.targetEventId ?? null,
    ownerId: task.ownerId,
    mentorId: task.mentorId,
    dueDate: task.dueDate,
    priority: task.priority,
    status,
    dependencyIds: task.dependencyIds,
    checklistItems: task.checklistItems ?? [],
    blockers: task.blockers,
    linkedManufacturingIds: task.linkedManufacturingIds,
    linkedPurchaseIds: task.linkedPurchaseIds,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
  };
}

export function claimTaskRequest(
  baseUrl: string,
  taskId: string,
  start: boolean,
  token?: string | null,
) {
  return requestJson<TaskAssignmentResponse>(
    baseUrl,
    `/api/tasks/${taskId}/claim`,
    {
      method: "POST",
      body: JSON.stringify({ start }),
    },
    token,
  );
}

export function releaseTaskRequest(
  baseUrl: string,
  taskId: string,
  token?: string | null,
) {
  return requestJson<TaskAssignmentResponse>(
    baseUrl,
    `/api/tasks/${taskId}/release`,
    { method: "POST" },
    token,
  );
}

export function reassignTaskRequest(
  baseUrl: string,
  taskId: string,
  ownerId: string | null,
  token?: string | null,
) {
  return requestJson<TaskAssignmentResponse>(
    baseUrl,
    `/api/tasks/${taskId}/reassign`,
    {
      method: "POST",
      body: JSON.stringify({ ownerId }),
    },
    token,
  );
}
