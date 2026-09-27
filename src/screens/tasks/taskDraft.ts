import type { Mechanism, PartInstance, Task, TaskDependency, TaskPriority, TaskStatus } from "../../types/domain";
import { isoToday } from "../../ui/helpers";

export type TaskDraft = Pick<Task, "workstreamIds" | "subsystemIds" | "mechanismIds" | "partInstanceIds" | "artifactIds"> & {
  title: string;
  summary: string;
  disciplineId: string;
  ownerId: string;
  mentorId: string;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  targetEventId: string | null;
  estimatedHours: string;
  dependencies: Omit<TaskDependency, "id" | "taskId" | "createdAt">[];

  checklistItemsText: string;
  blockersText: string;
};

export function buildTaskDraft(seed?: Partial<Task>): TaskDraft {
  return {
    title: seed?.title ?? "",
    summary: seed?.summary ?? "",
    subsystemIds: [...(seed?.subsystemIds ?? [])],
    workstreamIds: [...(seed?.workstreamIds ?? [])],
    artifactIds: [...(seed?.artifactIds ?? [])],
    disciplineId: seed?.disciplineId ?? "",
    ownerId: seed?.ownerId ?? "",
    mentorId: seed?.mentorId ?? "",
    startDate: seed?.startDate ?? "",
    dueDate: seed?.dueDate ?? isoToday(),
    priority: seed?.priority ?? "medium",
    status: seed?.status ?? "not-started",
    mechanismIds: [...(seed?.mechanismIds ?? [])],
    partInstanceIds: [...(seed?.partInstanceIds ?? [])],
    targetEventId: seed?.targetEventId ?? null,
    estimatedHours:
      typeof seed?.estimatedHours === "number" ? String(seed.estimatedHours) : "0",
    dependencies: [],

    checklistItemsText: seed?.checklistItems?.join(", ") ?? "",
    blockersText: seed?.blockers?.join(", ") ?? "",
  };
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
  const partId = mechanismId ? parts.find((item) => item.mechanismId === mechanismId)?.id : undefined;
  return {
    ...draft,
    subsystemIds: replacePrimary(draft.subsystemIds, id),
    mechanismIds: [...new Set([
      ...(mechanismId ? [mechanismId] : []),
      ...draft.mechanismIds.filter((candidate) => !removedMechanisms.has(candidate)),
    ])],
    partInstanceIds: [...new Set([
      ...(partId ? [partId] : []),
      ...draft.partInstanceIds.filter((candidate) => {
        const part = parts.find((item) => item.id === candidate);
        return !part || (part.subsystemId !== removedId && !removedMechanisms.has(part.mechanismId ?? ""));
      }),
    ])],
  };
}

export function selectTaskMechanism(draft: TaskDraft, id: string, parts: PartInstance[]): TaskDraft {
  if (id === (draft.mechanismIds[0] ?? "")) return draft;
  const removedId = draft.mechanismIds[0];
  const partId = parts.find((item) => item.mechanismId === id)?.id;
  return {
    ...draft,
    mechanismIds: replacePrimary(draft.mechanismIds, id),
    partInstanceIds: [...new Set([
      ...(partId ? [partId] : []),
      ...draft.partInstanceIds.filter((candidate) => !removedId || parts.find((item) => item.id === candidate)?.mechanismId !== removedId),
    ])],
  };
}

export function selectTaskPart(draft: TaskDraft, id: string, parts: PartInstance[]): TaskDraft {
  const primaryMechanismId = draft.mechanismIds[0];
  const selectedPart = parts.find((part) => part.id === id);
  if (id === (draft.partInstanceIds[0] ?? "") && selectedPart?.mechanismId === primaryMechanismId) return draft;

  const retainedParts = draft.partInstanceIds.filter((candidate) => {
    const part = parts.find((item) => item.id === candidate);
    return !primaryMechanismId || !part || part.mechanismId !== primaryMechanismId;
  });
  const partInstanceIds = [...(id ? [id] : []), ...retainedParts.filter((candidate) => candidate !== id)];
  return partInstanceIds.every((candidate, index) => candidate === draft.partInstanceIds[index]) &&
    partInstanceIds.length === draft.partInstanceIds.length
    ? draft
    : { ...draft, partInstanceIds };
}
