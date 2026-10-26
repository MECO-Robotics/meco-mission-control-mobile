import { isTaskBlocked } from "../../data/taskReadiness";
import { localTodayDate } from "../../ui/helpers";
import type { ResponsibleGroup, Task } from "../../types/domain";

export type TeamTaskMetrics = { open: number; blocked: number; overdue: number; remainingHours: number };

export function getRemainingHours(task: Task) { return Math.max(0, task.estimatedHours - task.actualHours); }

export function getGroupTasks(group: ResponsibleGroup, tasks: Task[]) {
  return tasks.filter((task) => task.responsibleGroupId === group.id);
}

export function getTaskMetrics(tasks: Task[], today = localTodayDate()): TeamTaskMetrics {
  const open = tasks.filter((task) => task.status !== "complete");
  return {
    open: open.length,
    blocked: open.filter(isTaskBlocked).length,
    overdue: open.filter((task) => task.dueDate !== null && task.dueDate < today).length,
    remainingHours: open.reduce((sum, task) => sum + getRemainingHours(task), 0),
  };
}

export function getVisibleGroups<T extends ResponsibleGroup>(groups: T[], filter: "active" | "archived" | "all") {
  return groups.filter((group) => filter === "all" || group.isArchived === (filter === "archived"));
}
