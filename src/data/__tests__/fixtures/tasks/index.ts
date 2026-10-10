import type { Task } from "../../../../types/domain";
import { taskDependencies } from "./dependencies";
import { electricalTasks } from "./electricalTasks";
import { mechanicalTasks } from "./mechanicalTasks";
import { programmingOffseasonTasks } from "./programmingOffseasonTasks";
import { programmingTasks } from "./programmingTasks";

const seeds = [...programmingTasks, ...programmingOffseasonTasks, ...mechanicalTasks, ...electricalTasks];

export const tasks: Task[] = seeds.map((seed) => ({
  projectId: "robot-project",
  responsibleGroupId: "robot-build",
  workstreamIds: [],
  subsystemIds: [],
  mechanismIds: [],
  partInstanceIds: [],
  scheduleRefs: [],
  requestedById: null,
  ownerId: null,
  assigneeIds: [],
  mentorId: null,
  startDate: "2026-09-01",
  dueDate: "2026-09-30",
  priority: "medium",
  status: "not-started",
  checklistItems: [],
  estimatedHours: 0,
  actualHours: 0,
  requiresDocumentation: false,
  manufacturingDetails: null,
  ...seed,
  workTypeId: seed.workTypeId ?? "planning",
}));

export { taskDependencies };
