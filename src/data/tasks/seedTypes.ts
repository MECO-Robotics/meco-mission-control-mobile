import type { Task } from "../../types/domain";

type DefaultedTaskField =
  | "checklistItems"
  | "linkedManufacturingIds"
  | "linkedPurchaseIds"
  | "partInstanceId"
  | "requirementId"
  | "mechanismId"
  | "actualHours"
  | "status";

export type TaskSeed = Omit<Task, "blockers" | "isBlocked" | "isWaitingOnDependency" | DefaultedTaskField> &
  Partial<Pick<Task, DefaultedTaskField>>;
