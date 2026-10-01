import { isTaskBlocked } from "../../data/taskReadiness";
import type { Member, ResponsibleGroup, Task, WorkLog } from "../../types/domain";

export const CLASS_YEARS = ["freshman", "sophomore", "junior", "senior"] as const;
export type TeamTaskMetrics = { open: number; blocked: number; overdue: number; remainingHours: number };

export function getRemainingHours(task: Task) { return Math.max(0, task.estimatedHours - task.actualHours); }

export function getGroupTasks(group: ResponsibleGroup, tasks: Task[]) {
  return tasks.filter((task) => task.responsibleGroupId === group.id);
}

export function getTaskMetrics(tasks: Task[], today = new Date().toISOString().slice(0, 10)): TeamTaskMetrics {
  const open = tasks.filter((task) => task.status !== "complete");
  return {
    open: open.length,
    blocked: open.filter(isTaskBlocked).length,
    overdue: open.filter((task) => Boolean(task.dueDate) && task.dueDate < today).length,
    remainingHours: open.reduce((sum, task) => sum + getRemainingHours(task), 0),
  };
}

export function getCohortMetrics(members: Member[], tasks: Task[], logs: WorkLog[]) {
  return CLASS_YEARS.map((classYear) => {
    const cohort = members.filter((member) => (member.role === "student" || member.role === "lead") && member.classYear === classYear);
    const ids = new Set(cohort.map((member) => member.id));
    const cohortTasks = tasks.filter((task) => task.status !== "complete" && (ids.has(task.ownerId ?? "") || task.assigneeIds.some((id) => ids.has(id))));
    return {
      classYear,
      members: cohort.length,
      openTasks: cohortTasks.length,
      remainingHours: cohortTasks.reduce((sum, task) => sum + getRemainingHours(task), 0),
      loggedHours: logs.filter((log) => log.participantIds.some((id) => ids.has(id))).reduce((sum, log) => sum + log.hours, 0),
    };
  });
}

export function getVisibleGroups<T extends ResponsibleGroup>(groups: T[], filter: "active" | "archived" | "all") {
  return groups.filter((group) => filter === "all" || group.isArchived === (filter === "archived"));
}
