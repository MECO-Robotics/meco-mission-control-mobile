import { useMemo, useState, type SetStateAction } from "react";
import type { Member, Mechanism, Subsystem, Task } from "../../types/domain";
import type { ArchiveFilterMode, BlockerFilterMode, SummaryChipData, TaskSubteamTab } from "../../ui/types";
import { localTodayDate, shiftDateByDays } from "../../ui/helpers";
import { hasOpenTaskDependency, isTaskBlocked } from "../../data/taskReadiness";
import { buildTaskQueueSections } from "../../data/taskQueueOrdering";

type QueueInputs = {
  tasks: Task[];
  taskLoggedHoursById: Record<string, number>;
  activeTaskSubteam: TaskSubteamTab;
  canMentorApprove: boolean;
  activePersonFilter: string;
  membersById: Record<string, Member>;
  mechanismsById: Record<string, Mechanism>;
  subsystemsById: Record<string, Subsystem>;
};

const initialFilters = {
  taskSearch: "", taskStatusFilter: "all", taskSubsystemFilter: "all",
  taskOwnerFilter: "all", taskPriorityFilter: "all",
  taskArchiveFilter: "active" as ArchiveFilterMode,
  taskBlockerFilter: "all" as BlockerFilterMode,
};

// Keep queue selection and its summary chips on the same readiness rules.
function matchesBlockerFilter(task: Task, filter: BlockerFilterMode, loggedHours: number): boolean {
  switch (filter) {
    case "blocked": return task.blockers.length > 0;
    case "clear": return task.blockers.length === 0;
    case "over-estimate": return task.estimatedHours > 0 && loggedHours > task.estimatedHours;
    case "overdue": return task.status !== "complete" && task.dueDate < localTodayDate();
    case "due-soon": {
      const today = localTodayDate();
      return task.status !== "complete" && task.dueDate >= today && task.dueDate <= shiftDateByDays(today, 7);
    }
    case "dependency-wait": return hasOpenTaskDependency(task);
    case "ready-now":
      return task.status !== "complete" && task.status !== "waiting-for-qa" &&
        !isTaskBlocked(task) && !hasOpenTaskDependency(task) && Boolean(task.ownerId);
    case "ready-to-qa":
      return task.status === "waiting-for-qa" && !isTaskBlocked(task) && !hasOpenTaskDependency(task);
    case "needs-fabrication": return task.linkedManufacturingIds.length > 0;
    case "needs-purchase": return task.linkedPurchaseIds.length > 0;
    case "unassigned": return !task.ownerId;
    case "all": return true;
  }
}

export function useTaskQueue({ tasks, taskLoggedHoursById, activeTaskSubteam,
  canMentorApprove, activePersonFilter, membersById, mechanismsById, subsystemsById }: QueueInputs) {
  const [filters, setFilters] = useState(initialFilters);
  const { taskSearch, taskStatusFilter, taskSubsystemFilter, taskOwnerFilter,
    taskPriorityFilter, taskArchiveFilter, taskBlockerFilter } = filters;
  const setFilter = <K extends keyof typeof filters>(key: K, value: SetStateAction<typeof filters[K]>) => {
    setFilters((current) => ({ ...current,
      [key]: typeof value === "function" ? value(current[key]) : value,
    }));
  };
  const filteredTaskQueueCandidates = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();

    return tasks
      .filter((task) => {
        if (
          activePersonFilter !== "all" &&
          task.ownerId !== activePersonFilter &&
          task.mentorId !== activePersonFilter
        ) {
          return false;
        }

        if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) {
          return false;
        }

        if (taskArchiveFilter === "active" && task.status === "complete") {
          return false;
        }

        if (taskArchiveFilter === "archived" && task.status !== "complete") {
          return false;
        }

        if (!matchesBlockerFilter(task, taskBlockerFilter, taskLoggedHoursById[task.id] ?? task.actualHours)) {
          return false;
        }

        if (taskSubsystemFilter !== "all" && task.subsystemId !== taskSubsystemFilter) {
          return false;
        }

        if (taskOwnerFilter !== "all" && task.ownerId !== taskOwnerFilter) {
          return false;
        }

        if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) {
          return false;
        }

        if (!search) {
          return true;
        }

        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "";
        const ownerName = task.ownerId ? (membersById[task.ownerId]?.name ?? "") : "";
        const mechanismName = task.mechanismId ? (mechanismsById[task.mechanismId]?.name ?? "") : "";

        return `${task.title} ${task.summary} ${subsystemName} ${ownerName} ${mechanismName}`
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [
    activePersonFilter,
    membersById,
    mechanismsById,
    subsystemsById,
    taskOwnerFilter,
    taskPriorityFilter,
    taskArchiveFilter,
    taskBlockerFilter,
    taskLoggedHoursById,
    taskSearch,
    taskStatusFilter,
    taskSubsystemFilter,
    tasks,
  ]);

  const taskQueueSections = useMemo(() => {
    return buildTaskQueueSections({
      activeTaskSubteam,
      canViewAllQueues: canMentorApprove,
      tasks: filteredTaskQueueCandidates,
    });
  }, [activeTaskSubteam, canMentorApprove, filteredTaskQueueCandidates]);

  const filteredTaskQueue = useMemo(() => {
    return taskQueueSections.flatMap((section) => section.tasks);
  }, [taskQueueSections]);

  const taskSummary = useMemo(() => {
    const countMatching = (filter: BlockerFilterMode) => filteredTaskQueue.filter((task) =>
      matchesBlockerFilter(task, filter, taskLoggedHoursById[task.id] ?? task.actualHours),
    ).length;
    const waiting = filteredTaskQueue.filter(
      (task) => task.status === "waiting-for-qa",
    ).length;
    const complete = filteredTaskQueue.filter((task) => task.status === "complete").length;
    const loggedHours = filteredTaskQueue.reduce(
      (sum, task) => sum + (taskLoggedHoursById[task.id] ?? task.actualHours),
      0,
    );

    return [
      { label: "Visible tasks", value: String(filteredTaskQueue.length) },
      { label: "Ready now", value: String(countMatching("ready-now")) },
      { label: "Ready QA", value: String(countMatching("ready-to-qa")) },
      { label: "Blocked", value: String(countMatching("blocked")) },
      { label: "Waiting QA", value: String(waiting) },
      { label: "Logged", value: `${loggedHours.toFixed(1)}h` },
      { label: "Over est.", value: String(countMatching("over-estimate")) },
      { label: "Complete", value: String(complete) },
    ] satisfies SummaryChipData[];
  }, [filteredTaskQueue, taskLoggedHoursById]);

  return {
    ...filters, filteredTaskQueue, taskQueueSections, taskSummary,
    resetFilters: () => setFilters(initialFilters),
    setTaskSearch: (value: SetStateAction<typeof filters.taskSearch>) => setFilter("taskSearch", value),
    setTaskStatusFilter: (value: SetStateAction<typeof filters.taskStatusFilter>) => setFilter("taskStatusFilter", value),
    setTaskSubsystemFilter: (value: SetStateAction<typeof filters.taskSubsystemFilter>) => setFilter("taskSubsystemFilter", value),
    setTaskOwnerFilter: (value: SetStateAction<typeof filters.taskOwnerFilter>) => setFilter("taskOwnerFilter", value),
    setTaskPriorityFilter: (value: SetStateAction<typeof filters.taskPriorityFilter>) => setFilter("taskPriorityFilter", value),
    setTaskArchiveFilter: (value: SetStateAction<typeof filters.taskArchiveFilter>) => setFilter("taskArchiveFilter", value),
    setTaskBlockerFilter: (value: SetStateAction<typeof filters.taskBlockerFilter>) => setFilter("taskBlockerFilter", value),
  };
}
