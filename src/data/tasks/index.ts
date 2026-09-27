import type { Task } from "../../types/domain";
import { taskDependencies } from "./dependencies";
import { taskBlockers } from "./blockers";
import { electricalTasks } from "./electricalTasks";
import { mechanicalTasks } from "./mechanicalTasks";
import { programmingOffseasonTasks } from "./programmingOffseasonTasks";
import { programmingTasks } from "./programmingTasks";

const seeds = [
  ...programmingTasks,
  ...programmingOffseasonTasks,
  ...mechanicalTasks,
  ...electricalTasks,
].map(({
  workstreamIds = [],
  artifactIds = [],
  checklistItems = [],
  linkedManufacturingIds = [],
  linkedPurchaseIds = [],
  partInstanceIds = [],
  requirementId = null,
  mechanismIds = [],
  actualHours = 0,
  status = "not-started",
  ...fields
}) => ({
  ...fields,
  workstreamIds,
  artifactIds,
  checklistItems,
  linkedManufacturingIds,
  linkedPurchaseIds,
  partInstanceIds,
  requirementId,
  mechanismIds,
  actualHours,
  status,
}));

export const tasks: Task[] = seeds.map((task) => {
  const blockers = taskBlockers.filter((blocker) => blocker.blockedTaskId === task.id && blocker.status === "open").map((blocker) => blocker.description);
  const isWaitingOnDependency = taskDependencies.some((edge) => edge.taskId === task.id && edge.dependencyType === "hard" && seeds.find((candidate) => candidate.id === edge.refId)?.status !== edge.requiredState);
  return { ...task, blockers, isWaitingOnDependency, isBlocked: blockers.length > 0 };
});
