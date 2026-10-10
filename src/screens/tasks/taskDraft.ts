import type { Mechanism, PartInstance, Task, TaskDependency, TaskPriority, TaskStatus } from "../../types/domain";
import { isoToday } from "../../ui/helpers";

export type TaskDependencyDraft<T extends TaskDependency = TaskDependency> = T extends TaskDependency ? Omit<T, "id" | "taskId" | "createdAt"> : never;

export type TaskDraft = Pick<Task, "workstreamIds" | "subsystemIds" | "mechanismIds" | "partInstanceIds" | "scheduleRefs" | "projectId" | "assigneeIds" | "manufacturingDetails"> & {
  title: string;
  summary: string;
  workTypeId: string;
  responsibleGroupId: string;
  ownerId: string;
  mentorId: string;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedHours: string;
  dependencies: TaskDependencyDraft[];
  checklistItemsText: string;
};

export function buildTaskDraft(seed?: Partial<Task>): TaskDraft {
  return {
    title: seed?.title ?? "",
    summary: seed?.summary ?? "",
    projectId: seed?.projectId ?? "",
    workTypeId: seed?.workTypeId ?? "",
    responsibleGroupId: seed?.responsibleGroupId ?? "",
    subsystemIds: [...(seed?.subsystemIds ?? [])],
    workstreamIds: [...(seed?.workstreamIds ?? [])],
    assigneeIds: [...(seed?.assigneeIds ?? [])],
    mechanismIds: [...(seed?.mechanismIds ?? [])],
    partInstanceIds: [...(seed?.partInstanceIds ?? [])],
    scheduleRefs: [...(seed?.scheduleRefs ?? [])],
    ownerId: seed?.ownerId ?? "",
    mentorId: seed?.mentorId ?? "",
    startDate: seed?.startDate ?? isoToday(),
    dueDate: seed?.dueDate ?? isoToday(),
    priority: seed?.priority ?? "medium",
    status: seed?.status ?? "not-started",
    manufacturingDetails: seed?.manufacturingDetails ?? null,
    estimatedHours: typeof seed?.estimatedHours === "number" ? String(seed.estimatedHours) : "0",
    dependencies: [],
    checklistItemsText: seed?.checklistItems?.join(", ") ?? "",
  };
}

function partSubsystemId(part: PartInstance | undefined) {
  return part?.location.kind === "installed" ? part.location.subsystemId : part?.intendedSubsystemId;
}
function partMechanismId(part: PartInstance | undefined) {
  return part?.location.kind === "installed" ? part.location.mechanismId : part?.intendedMechanismId;
}
function replacePrimary(ids: string[], id: string | null) {
  const remaining = ids.slice(1).filter((candidate) => candidate !== id);
  return id ? [id, ...remaining] : remaining;
}

export function selectTaskSubsystem(draft: TaskDraft, id: string, mechanisms: Mechanism[], parts: PartInstance[]): TaskDraft {
  if (id === (draft.subsystemIds[0] ?? "")) return draft;
  const removedId = draft.subsystemIds[0];
  const removedMechanisms = new Set(mechanisms.filter((item) => item.subsystemId === removedId).map((item) => item.id));
  const mechanismId = mechanisms.find((item) => item.subsystemId === id)?.id;
  const partId = mechanismId ? parts.find((item) => partMechanismId(item) === mechanismId)?.id : undefined;
  return {
    ...draft,
    subsystemIds: replacePrimary(draft.subsystemIds, id),
    mechanismIds: [...new Set([...(mechanismId ? [mechanismId] : []), ...draft.mechanismIds.filter((candidate) => !removedMechanisms.has(candidate))])],
    partInstanceIds: [...new Set([...(partId ? [partId] : []), ...draft.partInstanceIds.filter((candidate) => {
      const part = parts.find((item) => item.id === candidate);
      return !part || (partSubsystemId(part) !== removedId && !removedMechanisms.has(partMechanismId(part) ?? ""));
    })])],
  };
}

export function selectTaskMechanism(draft: TaskDraft, id: string, parts: PartInstance[]): TaskDraft {
  if (id === (draft.mechanismIds[0] ?? "")) return draft;
  const removedId = draft.mechanismIds[0];
  const partId = parts.find((item) => partMechanismId(item) === id)?.id;
  return {
    ...draft,
    mechanismIds: replacePrimary(draft.mechanismIds, id),
    partInstanceIds: [...new Set([...(partId ? [partId] : []), ...draft.partInstanceIds.filter((candidate) => !removedId || partMechanismId(parts.find((item) => item.id === candidate)) !== removedId)])],
  };
}

export function selectTaskPart(draft: TaskDraft, id: string, parts: PartInstance[]): TaskDraft {
  const primaryMechanismId = draft.mechanismIds[0];
  const partInstanceIds = [...(id ? [id] : []), ...draft.partInstanceIds.filter((candidate) => candidate !== id && (!primaryMechanismId || partMechanismId(parts.find((item) => item.id === candidate)) !== primaryMechanismId))];
  return partInstanceIds.every((candidate, index) => candidate === draft.partInstanceIds[index]) && partInstanceIds.length === draft.partInstanceIds.length
    ? draft
    : { ...draft, partInstanceIds };
}
