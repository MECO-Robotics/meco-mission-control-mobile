import type { Task } from "../../types/domain";

export type TaskSeed = Omit<Task, "blockers" | "isBlocked" | "isWaitingOnDependency" | "checklistItems"> & { checklistItems?: string[] };
