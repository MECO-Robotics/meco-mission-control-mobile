import type { HelpRequest, Member, Risk, Task, WorkLog } from "../types/domain";

export function helpRequestsFromRisks(risks: Risk[]): HelpRequest[] {
  return risks.filter((risk) => risk.category === "help")
    .map((risk) => ({ id: risk.id, taskId: risk.source.kind === "task" ? risk.source.id : risk.relatedTargets.find((target) => target.kind === "task")?.id ?? null,
      reason: risk.detail, mentorId: risk.ownerMemberId ?? "", requestedById: risk.createdByMemberId ?? null,
      createdAt: risk.createdAt, status: risk.status }));
}

export type HelpRequestInput = {
  taskId?: string | null;
  workLogId?: string | null;
  reason: string;
  mentorId: string;
  requestedById: string | null;
  createdAt?: string;
  id?: string;
};

export type HelpRequestDisplayRow = {
  id: string;
  reason: string;
  mentorName: string;
  requesterName: string;
  status: HelpRequest["status"];
  taskTitle: string;
  workLogLabel: string;
  createdAt: string;
};

export function getHelpRequestValidationError(input: HelpRequestInput) {
  if (!input.reason.trim()) {
    return "Add a short reason before requesting help.";
  }

  if (!input.mentorId.trim()) {
    return "Choose a mentor before requesting help.";
  }

  return null;
}

export function getDefaultHelpMentorId(
  task: Pick<Task, "mentorId"> | null | undefined,
  mentors: Pick<Member, "id">[],
) {
  const taskMentorId = task?.mentorId ?? "";

  if (taskMentorId && mentors.some((mentor) => mentor.id === taskMentorId)) {
    return taskMentorId;
  }

  return mentors[0]?.id || "";
}

export function buildHelpRequestDisplayRows({
  helpRequests,
  membersById,
  taskById,
  workLogsById,
}: {
  helpRequests: HelpRequest[];
  membersById: Record<string, Member>;
  taskById: Record<string, Task>;
  workLogsById: Record<string, WorkLog>;
}): HelpRequestDisplayRow[] {
  return helpRequests.map((request) => {
    const workLog = request.workLogId ? workLogsById[request.workLogId] : null;
    const task = request.taskId
      ? taskById[request.taskId]
      : workLog
        ? taskById[workLog.taskId]
        : null;

    return {
      id: request.id,
      reason: request.reason,
      mentorName: membersById[request.mentorId]?.name ?? "Unassigned mentor",
      requesterName: request.requestedById
        ? membersById[request.requestedById]?.name ?? "Unknown student"
        : "Unknown student",
      status: request.status,
      taskTitle: task?.title ?? "Not linked",
      workLogLabel: workLog ? `${workLog.date} - ${workLog.hours.toFixed(1)}h` : "Not linked",
      createdAt: request.createdAt,
    };
  });
}
