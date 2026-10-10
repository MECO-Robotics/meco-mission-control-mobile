import { isTaskBlocked } from "./taskReadiness";
import type { ResponsibleGroup, Task } from "../types/domain";

export type TaskQueueSectionId = "primary-available" | "other-available" | "blocked" | "waiting-qa" | "completed";
export type TaskQueueSection = { emptyBody?: string; emptyTitle?: string; id: TaskQueueSectionId; tasks: Task[]; title: string };
type BuildTaskQueueSectionsInput = { activeResponsibleGroupId: string; responsibleGroups: ResponsibleGroup[]; canViewAllQueues: boolean; tasks: Task[] };

function compareTasksByDueDate(left: Task, right: Task) { return left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title); }

export function buildTaskQueueSections({ activeResponsibleGroupId, responsibleGroups, canViewAllQueues, tasks }: BuildTaskQueueSectionsInput) {
  const group = responsibleGroups.find((item) => item.id === activeResponsibleGroupId);
  const groupLabel = activeResponsibleGroupId === "all" ? "All groups" : group?.name ?? "Responsible group";
  const primaryAvailable: Task[] = [];
  const otherAvailable: Task[] = [];
  const blocked: Task[] = [];
  const waitingQa: Task[] = [];
  const completed: Task[] = [];
  for (const task of [...tasks].sort(compareTasksByDueDate)) {
    const isPrimary = activeResponsibleGroupId === "all" || task.responsibleGroupId === activeResponsibleGroupId;
    const restrictedQueue = task.status === "complete" ? completed : task.status === "waiting-for-qa" ? waitingQa : isTaskBlocked(task) ? blocked : null;
    if (restrictedQueue) {
      if (canViewAllQueues || isPrimary) restrictedQueue.push(task);
    } else (isPrimary ? primaryAvailable : otherAvailable).push(task);
  }
  return [
    { emptyBody: "No ready work is assigned to this responsible group. Check other available work or clear filters if you expected a task here.", emptyTitle: `No available ${groupLabel} work`, id: "primary-available" as const, tasks: primaryAvailable, title: `${groupLabel} work` },
    { id: "other-available" as const, tasks: otherAvailable, title: "Other available work" },
    { id: "blocked" as const, tasks: blocked, title: "Blocked" },
    { id: "waiting-qa" as const, tasks: waitingQa, title: "Waiting QA" },
    { id: "completed" as const, tasks: completed, title: "Completed" },
  ];
}
