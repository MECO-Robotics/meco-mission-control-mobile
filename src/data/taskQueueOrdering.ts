import { isTaskBlocked } from "./taskReadiness";
import type { Task } from "../types/domain";
import { TASK_SUBTEAM_DISCIPLINE_IDS, TASK_SUBTEAM_OPTIONS } from "../ui/constants";
import type { TaskSubteamTab } from "../ui/types";

export type TaskQueueSectionId =
  | "primary-available"
  | "other-available"
  | "blocked"
  | "waiting-qa"
  | "completed";

export type TaskQueueSection = {
  emptyBody?: string;
  emptyTitle?: string;
  id: TaskQueueSectionId;
  tasks: Task[];
  title: string;
};

type BuildTaskQueueSectionsInput = {
  activeTaskSubteam: TaskSubteamTab;
  canViewAllQueues: boolean;
  tasks: Task[];
};

function compareTasksByDueDate(left: Task, right: Task) {
  return left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title);
}

function getSubteamLabel(subteam: TaskSubteamTab) {
  return TASK_SUBTEAM_OPTIONS.find((option) => option.value === subteam)?.label ?? "Subteam";
}

export function getTaskSubteamForDisciplineId(
  disciplineId: string | null | undefined,
  fallback: TaskSubteamTab,
) {
  if (!disciplineId) {
    return fallback;
  }

  return (
    TASK_SUBTEAM_OPTIONS.find((option) =>
      TASK_SUBTEAM_DISCIPLINE_IDS[option.value].includes(disciplineId),
    )?.value ?? fallback
  );
}

export function buildTaskQueueSections({
  activeTaskSubteam,
  canViewAllQueues,
  tasks,
}: BuildTaskQueueSectionsInput): TaskQueueSection[] {
  const primarySubteam = activeTaskSubteam;
  const primarySubteamLabel = getSubteamLabel(primarySubteam);
  const primaryAvailable: Task[] = [];
  const otherAvailable: Task[] = [];
  const blocked: Task[] = [];
  const waitingQa: Task[] = [];
  const completed: Task[] = [];

  for (const task of [...tasks].sort(compareTasksByDueDate)) {
    const isPrimary = getTaskSubteamForDisciplineId(task.disciplineId, primarySubteam) === primarySubteam;
    const restrictedQueue = task.status === "complete" ? completed
      : task.status === "waiting-for-qa" ? waitingQa
        : isTaskBlocked(task) ? blocked : null;
    if (restrictedQueue) {
      if (canViewAllQueues || isPrimary) restrictedQueue.push(task);
    } else {
      (isPrimary ? primaryAvailable : otherAvailable).push(task);
    }
  }

  return [
    {
      emptyBody:
        "No ready tasks are currently available for your subteam. Check other available work below or clear filters if you expected something here.",
      emptyTitle: `No available ${primarySubteamLabel} work`,
      id: "primary-available",
      tasks: primaryAvailable,
      title: canViewAllQueues
        ? `${primarySubteamLabel} available`
        : `Your ${primarySubteamLabel} work`,
    },
    {
      id: "other-available",
      tasks: otherAvailable,
      title: "Other available work",
    },
    {
      id: "blocked",
      tasks: blocked,
      title: "Blocked",
    },
    {
      id: "waiting-qa",
      tasks: waitingQa,
      title: "Waiting QA",
    },
    {
      id: "completed",
      tasks: completed,
      title: "Completed",
    },
  ];
}
