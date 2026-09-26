import type { Task } from "../../types/domain";

type DefaultedTaskField =
  | "workstreamIds"
  | "artifactIds"
  | "checklistItems"
  | "linkedManufacturingIds"
  | "linkedPurchaseIds"
  | "partInstanceIds"
  | "requirementId"
  | "mechanismIds"
  | "actualHours"
  | "status";

export type TaskSeed = Omit<Task, "blockers" | "isBlocked" | "isWaitingOnDependency" | DefaultedTaskField> &
  Partial<Pick<Task, DefaultedTaskField>>;
