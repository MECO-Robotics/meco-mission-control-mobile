import type { ManufacturingItem, Task, WorkItem } from "../types/domain";

/** Build the shared client projection while retaining Task and ManufacturingItem as their source records. */
export function projectWorkItems(tasks: Task[], manufacturingItems: ManufacturingItem[]): WorkItem[] {
  const manufacturingIds = new Set(manufacturingItems.map((item) => item.id));
  const linkedTasksByManufacturingId = new Map<string, Task[]>();
  for (const task of tasks) for (const id of task.linkedManufacturingIds ?? []) {
    const linked = linkedTasksByManufacturingId.get(id) ?? [];
    linked.push(task);
    linkedTasksByManufacturingId.set(id, linked);
  }
  const pairedTasks = new Map<string, Task>();
  for (const item of manufacturingItems) {
    const linked = linkedTasksByManufacturingId.get(item.id) ?? [];
    const typed = linked.filter((task) => task.workType === "Manufacturing");
    const sameTitle = linked.filter((task) => task.title.trim().toLocaleLowerCase() === item.title.trim().toLocaleLowerCase());
    const candidates = typed.length > 0 ? typed : sameTitle;
    if (candidates.length === 1) pairedTasks.set(item.id, candidates[0]);
  }
  const taskItems: WorkItem[] = tasks.filter((task) => !(task.linkedManufacturingIds ?? []).some((id) => manufacturingIds.has(id) && pairedTasks.get(id)?.id === task.id)).map((task) => ({
    id: `task:${task.id}`,
    sourceType: "task",
    sourceId: task.id,
    taskId: task.id,
    title: task.title,
    workType: task.workType ?? "Design",
    responsibleGroup: task.responsibleGroup ?? null,
    manufacturingProcess: null,
    subsystemId: task.subsystemIds[0] ?? "",
    dueDate: task.dueDate,
    status: task.status,
    quantity: null,
    material: null,
    materialId: null,
    partDefinitionId: null,
    partInstanceIds: task.partInstanceIds ?? [],
    batchLabel: null,
    mentorReviewed: null,
  }));
  const manufacturingWorkItems: WorkItem[] = manufacturingItems
    .map((item) => ({
      id: `manufacturing:${item.id}`,
      sourceType: "manufacturing",
      sourceId: item.id,
      taskId: pairedTasks.get(item.id)?.id ?? null,
      title: item.title,
      workType: "Manufacturing",
      responsibleGroup: pairedTasks.get(item.id)?.responsibleGroup ?? item.responsibleGroup ?? null,
      manufacturingProcess: item.process,
      subsystemId: item.subsystemId,
      dueDate: item.dueDate,
      status: item.status,
      quantity: item.quantity,
      material: item.material,
      materialId: null,
      partDefinitionId: item.partDefinitionId ?? null,
      partInstanceIds: [],
      batchLabel: item.batchLabel ?? null,
      mentorReviewed: item.mentorReviewed,
    }));
  return [...taskItems, ...manufacturingWorkItems].sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title));
}

export function resolveWorkItems(serverItems: WorkItem[] | undefined, tasks: Task[], manufacturingItems: ManufacturingItem[]): WorkItem[] {
  return serverItems ?? projectWorkItems(tasks, manufacturingItems);
}
