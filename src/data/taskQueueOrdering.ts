import type { Member, Task } from "../types/domain";
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
  signedInMember: Member | null;
  taskById: Record<string, Task>;
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

function hasOpenDependency(task: Task, taskById: Record<string, Task>) {
  return task.dependencyIds
    .map((dependencyId) => taskById[dependencyId])
    .some((dependency) => dependency && dependency.status !== "complete");
}

function isAvailableTask(task: Task, taskById: Record<string, Task>) {
  return (
    task.status !== "complete" &&
    task.status !== "waiting-for-qa" &&
    task.blockers.length === 0 &&
    !hasOpenDependency(task, taskById)
  );
}

function getTaskSubteam(task: Task, fallback: TaskSubteamTab) {
  return getTaskSubteamForDisciplineId(task.disciplineId, fallback);
}

export function buildTaskQueueSections({
  activeTaskSubteam,
  canViewAllQueues,
  signedInMember,
  taskById,
  tasks,
}: BuildTaskQueueSectionsInput): TaskQueueSection[] {
  const primarySubteam = canViewAllQueues
    ? activeTaskSubteam
    : getTaskSubteamForDisciplineId(signedInMember?.disciplineId, activeTaskSubteam);
  const primarySubteamLabel = getSubteamLabel(primarySubteam);
  const scopedTasks = tasks.filter((task) => {
    if (canViewAllQueues) {
      return true;
    }

    return (
      getTaskSubteam(task, primarySubteam) === primarySubteam ||
      isAvailableTask(task, taskById)
    );
  });

  const primaryAvailable = scopedTasks
    .filter((task) => getTaskSubteam(task, primarySubteam) === primarySubteam)
    .filter((task) => isAvailableTask(task, taskById))
    .sort(compareTasksByDueDate);
  const otherAvailable = scopedTasks
    .filter((task) => getTaskSubteam(task, primarySubteam) !== primarySubteam)
    .filter((task) => isAvailableTask(task, taskById))
    .sort(compareTasksByDueDate);
  const blocked = scopedTasks
    .filter((task) => task.status !== "waiting-for-qa")
    .filter((task) => task.status !== "complete")
    .filter((task) => task.blockers.length > 0 || hasOpenDependency(task, taskById))
    .sort(compareTasksByDueDate);
  const waitingQa = scopedTasks
    .filter((task) => task.status === "waiting-for-qa")
    .sort(compareTasksByDueDate);
  const completed = scopedTasks
    .filter((task) => task.status === "complete")
    .sort(compareTasksByDueDate);

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
