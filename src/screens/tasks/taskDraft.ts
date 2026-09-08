import type { Task, TaskPriority, TaskStatus } from "../../types/domain";
import { isoToday } from "../../ui/helpers";

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

export function buildTaskDraft(seed?: Partial<Task>): TaskDraft {
  return {
    title: seed?.title ?? "",
    summary: seed?.summary ?? "",
    subsystemId: seed?.subsystemId ?? "",
    disciplineId: seed?.disciplineId ?? "",
    ownerId: seed?.ownerId ?? "",
    mentorId: seed?.mentorId ?? "",
    startDate: seed?.startDate ?? "",
    dueDate: seed?.dueDate ?? isoToday(),
    priority: seed?.priority ?? "medium",
    status: seed?.status ?? "not-started",
    mechanismId: seed?.mechanismId ?? null,
    partInstanceId: seed?.partInstanceId ?? null,
    targetEventId: seed?.targetEventId ?? null,
    estimatedHours:
      typeof seed?.estimatedHours === "number" ? String(seed.estimatedHours) : "0",
    dependencyIdsText: seed?.dependencyIds?.join(", ") ?? "",
    checklistItemsText: seed?.checklistItems?.join(", ") ?? "",
    blockersText: seed?.blockers?.join(", ") ?? "",
  };
}
