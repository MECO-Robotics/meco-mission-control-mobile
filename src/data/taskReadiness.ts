import type { Task, TaskDependency } from "../types/domain";

export function isTaskBlocked(task: Pick<Task, "isBlocked" | "isWaitingOnDependency">) {
  return task.isBlocked === true || task.isWaitingOnDependency === true;
}
export function hasOpenTaskDependency(task: Pick<Task, "isWaitingOnDependency">) {
  return task.isWaitingOnDependency === true;
}
export function getAutoTaskStatus(task: Pick<Task, "status" | "ownerId" | "isBlocked" | "isWaitingOnDependency">) {
  return task.status === "not-started" && task.ownerId && !isTaskBlocked(task)
    ? "in-progress" : task.status;
}
export function isTaskReadyForQaPass(task: Task) {
  return task.status === "waiting-for-qa" && !isTaskBlocked(task);
}
export function taskDependsOnTarget(taskId: string, targetTaskId: string,
  dependencies: TaskDependency[], visited = new Set<string>()): boolean {
  if (taskId === targetTaskId) return true;
  if (visited.has(taskId)) return false;
  visited.add(taskId);
  return dependencies.some((edge) => edge.taskId === taskId && edge.kind === "task" &&
    taskDependsOnTarget(edge.refId, targetTaskId, dependencies, visited));
}
