import { useMemo, useState, type SetStateAction } from "react";
import type { Member, Mechanism, Subsystem, Task } from "../../types/domain";
import type { ArchiveFilterMode, BlockerFilterMode, SummaryChipData, TaskSubteamTab } from "../../ui/types";
import { localTodayDate } from "../../ui/helpers";
import { hasOpenTaskDependency, shiftDateByDays } from "../../app/appModel";
import { buildTaskQueueSections } from "../../data/taskQueueOrdering";

type QueueInputs = {
  tasks: Task[];
  taskById: Record<string, Task>;
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

export function useTaskQueue({ tasks, taskById, taskLoggedHoursById, activeTaskSubteam,
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

    return [...tasks]
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

        if (taskBlockerFilter === "blocked" && task.blockers.length === 0) {
          return false;
        }

        if (taskBlockerFilter === "clear" && task.blockers.length > 0) {
          return false;
        }

        if (taskBlockerFilter === "over-estimate") {
          const loggedHours = taskLoggedHoursById[task.id] ?? task.actualHours;
          if (task.estimatedHours <= 0 || loggedHours <= task.estimatedHours) {
            return false;
          }
        }

        if (
          taskBlockerFilter === "overdue" &&
          (task.status === "complete" || task.dueDate >= localTodayDate())
        ) {
          return false;
        }

        if (taskBlockerFilter === "due-soon") {
          const today = localTodayDate();
          const soonDate = shiftDateByDays(today, 7);

          if (task.status === "complete" || task.dueDate < today || task.dueDate > soonDate) {
            return false;
          }
        }

        if (taskBlockerFilter === "dependency-wait") {
          const hasOpenDependency = hasOpenTaskDependency(task, taskById);

          if (!hasOpenDependency) {
            return false;
          }
        }

        if (taskBlockerFilter === "ready-now") {
          const hasOpenDependency = hasOpenTaskDependency(task, taskById);

          if (
            task.status === "complete" ||
            task.status === "waiting-for-qa" ||
            task.blockers.length > 0 ||
            hasOpenDependency ||
            !task.ownerId
          ) {
            return false;
          }
        }

        if (taskBlockerFilter === "ready-to-qa") {
          const hasOpenDependency = hasOpenTaskDependency(task, taskById);

          if (
            task.status !== "waiting-for-qa" ||
            task.blockers.length > 0 ||
            hasOpenDependency
          ) {
            return false;
          }
        }

        if (taskBlockerFilter === "needs-fabrication" && task.linkedManufacturingIds.length === 0) {
          return false;
        }

        if (taskBlockerFilter === "needs-purchase" && task.linkedPurchaseIds.length === 0) {
          return false;
        }

        if (taskBlockerFilter === "unassigned" && task.ownerId) {
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
    taskById,
    taskSearch,
    taskStatusFilter,
    taskSubsystemFilter,
    tasks,
  ]);

  const taskQueueSections = useMemo(() => {
    return buildTaskQueueSections({
      activeTaskSubteam,
      canViewAllQueues: canMentorApprove,
      taskById,
      tasks: filteredTaskQueueCandidates,
    });
  }, [activeTaskSubteam, canMentorApprove, filteredTaskQueueCandidates, taskById]);

  const filteredTaskQueue = useMemo(() => {
    return taskQueueSections.flatMap((section) => section.tasks);
  }, [taskQueueSections]);

  const taskSummary = useMemo(() => {
    const blocked = filteredTaskQueue.filter((task) => task.blockers.length > 0).length;
    const waiting = filteredTaskQueue.filter(
      (task) => task.status === "waiting-for-qa",
    ).length;
    const complete = filteredTaskQueue.filter((task) => task.status === "complete").length;
    const loggedHours = filteredTaskQueue.reduce(
      (sum, task) => sum + (taskLoggedHoursById[task.id] ?? task.actualHours),
      0,
    );
    const overEstimate = filteredTaskQueue.filter((task) => {
      const taskLoggedHours = taskLoggedHoursById[task.id] ?? task.actualHours;
      return task.estimatedHours > 0 && taskLoggedHours > task.estimatedHours;
    }).length;
    const readyNow = filteredTaskQueue.filter((task) => {
      const hasOpenDependency = hasOpenTaskDependency(task, taskById);

      return (
        task.status !== "complete" &&
        task.status !== "waiting-for-qa" &&
        task.blockers.length === 0 &&
        !hasOpenDependency &&
        Boolean(task.ownerId)
      );
    }).length;
    const readyForQa = filteredTaskQueue.filter((task) => {
      const hasOpenDependency = hasOpenTaskDependency(task, taskById);

      return (
        task.status === "waiting-for-qa" &&
        task.blockers.length === 0 &&
        !hasOpenDependency
      );
    }).length;

    return [
      { label: "Visible tasks", value: String(filteredTaskQueue.length) },
      { label: "Ready now", value: String(readyNow) },
      { label: "Ready QA", value: String(readyForQa) },
      { label: "Blocked", value: String(blocked) },
      { label: "Waiting QA", value: String(waiting) },
      { label: "Logged", value: `${loggedHours.toFixed(1)}h` },
      { label: "Over est.", value: String(overEstimate) },
      { label: "Complete", value: String(complete) },
    ] satisfies SummaryChipData[];
  }, [filteredTaskQueue, taskById, taskLoggedHoursById]);

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
