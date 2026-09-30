import { useMemo, useRef, useState } from "react";
import type { Mechanism, PartInstance, Task, TaskDependency, TaskBlocker, Member, Discipline, Subsystem, WorkItem } from "../../types/domain";
import type { EditorMode, Option, TaskSubteamTab } from "../../ui/types";
import { STATUS_LABELS, TASK_SUBTEAM_DISCIPLINE_IDS } from "../../ui/constants";
import { isoToday, localTodayDate, splitList } from "../../ui/helpers";
import { getTaskSubteamForDisciplineId } from "../../data/taskQueueOrdering";
import { getClientErrorMessage, mapTaskPayloadToServer } from "../../app/appModel";
import { buildTaskDraft, selectTaskSubsystem, selectTaskMechanism, selectTaskPart, type TaskDraft } from "./taskDraft";

type Inputs = {
  mechanisms: Mechanism[]; partInstances: PartInstance[];
  tasks: Task[]; taskById: Record<string, Task>; taskDependencies: TaskDependency[]; workItems: WorkItem[];
  members: Member[]; membersById: Record<string, Member>; disciplines: Discipline[];
  subsystemsById: Record<string, Subsystem>; taskSubsystemOptions: Option[];
  activeTaskSubteam: TaskSubteamTab; setActiveTaskSubteam: (subteam: TaskSubteamTab) => void;
  request: <T>(path: string, init: RequestInit) => Promise<T>; refresh: () => Promise<unknown>;
};
export function useTaskEditor({ mechanisms, partInstances, tasks, taskById, taskDependencies, workItems, members, membersById, disciplines,
  subsystemsById, taskSubsystemOptions, activeTaskSubteam, setActiveTaskSubteam, request, refresh }: Inputs) {
  const editorVersion = useRef(0);
  const saving = useRef(false);
  const [taskEditorMode, setTaskEditorMode] = useState<EditorMode | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(buildTaskDraft());
  const [taskEditorError, setTaskEditorError] = useState<string | null>(null);
  const [taskDependencySearch, setTaskDependencySearch] = useState("");

  const selectedTaskDependencies = useMemo(() => taskDraft.dependencies.filter((edge) => edge.kind === "work_item")
    .map((edge) => workItems.find((item) => item.sourceType === edge.refType && item.sourceId === edge.refId))
    .filter((item): item is WorkItem => Boolean(item)), [taskDraft.dependencies, workItems]);
  const taskDependencyReadinessMessage = useMemo(() => {
    const unresolved = taskDraft.dependencies.filter((edge) => edge.kind === "work_item" && edge.dependencyType === "hard" && workItems.find((item) => item.sourceType === edge.refType && item.sourceId === edge.refId)?.status !== edge.requiredState);
    return unresolved.length ? `Waiting on: ${unresolved.map((edge) => `${workItems.find((item) => item.sourceType === edge.refType && item.sourceId === edge.refId)?.title ?? edge.refId} (${edge.requiredState} required)`).join(", ")}.` : null;
  }, [taskDraft.dependencies, workItems]);
  const downstreamTaskDependencies = useMemo(() => !activeTaskId ? [] : workItems.filter((item) =>
    taskDependencies.some((edge) => (edge.workItemId ?? edge.taskId) === activeTaskId && (edge.sourceType ?? "task") === "task" && edge.kind === "work_item" && edge.refId === item.sourceId && edge.refType === item.sourceType)), [activeTaskId, workItems, taskDependencies]);
  const availableTaskDependencyOptions = useMemo(() => {
    const selectedIds = new Set(taskDraft.dependencies.filter((edge) => edge.kind === "work_item").map((edge) => `${edge.refType}:${edge.refId}`));
    const search = taskDependencySearch.trim().toLowerCase();
    return workItems.filter((item) => !(item.sourceType === "task" && item.sourceId === activeTaskId) && !selectedIds.has(`${item.sourceType}:${item.sourceId}`))
      .filter((item) => !search || [item.title, item.sourceId, item.workType, item.responsibleGroup ?? "", item.status, subsystemsById[item.subsystemId]?.name ?? ""].join(" ").toLowerCase().includes(search))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)).slice(0, search ? 20 : 10);
  }, [activeTaskId, workItems, taskDraft.dependencies, taskDependencySearch, subsystemsById]);

  const openCreateTaskEditor = () => {
    editorVersion.current += 1;
    const today = localTodayDate();

    setActiveTaskId(null);
    setTaskDraft(
      buildTaskDraft({
        subsystemIds: taskSubsystemOptions[0] ? [taskSubsystemOptions[0].id] : [],
        disciplineId:
          TASK_SUBTEAM_DISCIPLINE_IDS[activeTaskSubteam][0] ?? disciplines[0]?.id ?? "",
        ownerId: members[0]?.id ?? "",
        mentorId:
          members.find((member) => member.role === "mentor" || member.role === "admin")?.id ??
          members[0]?.id ??
          "",
        startDate: today,
        dueDate: today,
      }),
    );
    setTaskEditorError(null);
    setTaskDependencySearch("");
    setTaskEditorMode("create");
  };

  const openEditTaskEditor = (task: Task) => {
    editorVersion.current += 1;
    setActiveTaskId(task.id);
    setTaskDraft({ ...buildTaskDraft(task), dependencies: taskDependencies.filter((edge) => (edge.workItemId ?? edge.taskId) === task.id && (edge.sourceType ?? "task") === "task").map((edge) => ({ kind: edge.kind === "task" ? "work_item" : edge.kind, refType: edge.refType ?? (edge.kind === "task" ? "task" : undefined), refId: edge.refId, requiredState: edge.requiredState, dependencyType: edge.dependencyType })) });
    setTaskEditorError(null);
    setTaskDependencySearch("");
    setTaskEditorMode("edit");
  };

  const openDuplicateTaskEditor = (task: Task) => {
    editorVersion.current += 1;
    setActiveTaskId(null);
    setTaskDraft(
      buildTaskDraft({
        ...task,
        id: "",
        title: `Copy of ${task.title}`,
        dueDate: isoToday(),
        status: "not-started",
        blockers: [],
        actualHours: 0,
        isBlocked: false,
      }),
    );
    setTaskEditorError(null);
    setTaskDependencySearch("");
    setTaskEditorMode("create");
  };

  const closeTaskEditor = () => {
    editorVersion.current += 1;
    setTaskEditorMode(null);
    setActiveTaskId(null);
    setTaskEditorError(null);
    setTaskDependencySearch("");
  };

  const addTaskDependency = (dependency: WorkItem) => {
    setTaskDraft((current) => {
      if (dependency.sourceType === "task" && dependency.sourceId === activeTaskId) {
        return current;
      }
      if (current.dependencies.some((edge) => edge.kind === "work_item" && edge.refType === dependency.sourceType && edge.refId === dependency.sourceId)) return current;
      return { ...current, dependencies: [...current.dependencies, { kind: "work_item", refType: dependency.sourceType, refId: dependency.sourceId, requiredState: "complete", dependencyType: "hard" }] };
    });
  };
  const removeTaskDependency = (dependencyId: string, sourceType: "task" | "manufacturing") => {
    setTaskDraft((current) => ({ ...current, dependencies: current.dependencies.filter((edge) => edge.kind !== "work_item" || edge.refType !== sourceType || edge.refId !== dependencyId) }));
  };

  const selectSubsystem = (id: string) => setTaskDraft((draft) => selectTaskSubsystem(draft, id, mechanisms, partInstances));
  const selectMechanism = (id: string) => setTaskDraft((draft) => selectTaskMechanism(draft, id, partInstances));
  const selectPart = (id: string) => setTaskDraft((draft) => selectTaskPart(draft, id, partInstances));

  const saveTaskDraft = async () => {
    if (saving.current) return;
    const version = editorVersion.current;
    const assertCurrentEditor = () => { if (editorVersion.current !== version) throw new Error("The task editor changed during save."); };
    const isEdit = taskEditorMode === "edit" && activeTaskId;
    const existingTask = isEdit ? taskById[activeTaskId] : null;
    const blockers = splitList(taskDraft.blockersText);
    const checklistItems = splitList(taskDraft.checklistItemsText);
    const title = taskDraft.title.trim();
    const summary = taskDraft.summary.trim();
    const parsedEstimatedHours = Number(taskDraft.estimatedHours);

    const missingFields = [
      !title ? "title" : null,
      !summary ? "summary" : null,
      !taskDraft.subsystemIds.length ? "subsystem" : null,
      !taskDraft.ownerId ? "owner" : null,
      Number.isNaN(parsedEstimatedHours) || parsedEstimatedHours < 0 ? "estimated hours" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setTaskEditorError(`Add ${missingFields.join(", ")} before saving this task.`);
      return;
    }

    setTaskEditorError(null);
    const status = taskDraft.status;

    const payload = mapTaskPayloadToServer({
      title,
      workType: taskDraft.workType,
      responsibleGroup: taskDraft.responsibleGroup,
      summary,
      subsystemIds: taskDraft.subsystemIds,
      workstreamIds: taskDraft.workstreamIds,
      artifactIds: taskDraft.artifactIds,
      disciplineId:
        taskDraft.disciplineId || disciplines[0]?.id || "mechanical",
      mechanismIds: taskDraft.mechanismIds,
      partInstanceIds: taskDraft.partInstanceIds,
      targetEventId: taskDraft.targetEventId,
      ownerId: taskDraft.ownerId,
      mentorId: taskDraft.mentorId || null,
      startDate: taskDraft.startDate || undefined,
      dueDate: taskDraft.dueDate || isoToday(),
      priority: taskDraft.priority,
      status,
      checklistItems,
      linkedManufacturingIds: existingTask?.linkedManufacturingIds ?? [],
      linkedPurchaseIds: existingTask?.linkedPurchaseIds ?? [],
      estimatedHours: parsedEstimatedHours,
      actualHours: existingTask?.actualHours ?? 0,
    });

    saving.current = true;
    try {
      const response = await request<{ item: Task }>(isEdit ? `/api/tasks/${activeTaskId}` : "/api/tasks", {
        method: isEdit ? "PATCH" : "POST", body: JSON.stringify(payload),
      });
      assertCurrentEditor();
      const taskId = response.item.id;
      // Keep the created ID immediately: a relation failure must retry a PATCH,
      // never create another task.
      setActiveTaskId(taskId);
      setTaskEditorMode("edit");
      const relations = await request<{ taskDependencies: TaskDependency[]; taskBlockers: TaskBlocker[] }>("/api/bootstrap", {});
      assertCurrentEditor();
      const existingEdges = relations.taskDependencies.filter((edge) => (edge.workItemId ?? edge.taskId) === taskId && (edge.sourceType ?? "task") === "task");
      const sameEdge = (left: TaskDraft["dependencies"][number], right: TaskDraft["dependencies"][number]) =>
        (left.kind === "task" ? "work_item" : left.kind) === (right.kind === "task" ? "work_item" : right.kind) && left.refId === right.refId && (left.kind !== "work_item" || left.refType === (right.refType ?? "task")) && left.requiredState === right.requiredState && left.dependencyType === right.dependencyType;
      for (const edge of existingEdges) {
        assertCurrentEditor();
        if (!taskDraft.dependencies.some((desired) => sameEdge(edge, desired)))
          await request(`/api/task-dependencies/${edge.id}`, { method: "DELETE" });
      }
      for (const edge of taskDraft.dependencies) {
        assertCurrentEditor();
        if (!existingEdges.some((existing) => sameEdge(existing, edge)))
          await request("/api/task-dependencies", { method: "POST", body: JSON.stringify({ ...edge, workItemId: taskId, sourceType: "task" }) });
      }
      const openBlockers = relations.taskBlockers.filter((blocker) => blocker.blockedTaskId === taskId && blocker.status === "open");
      for (const blocker of openBlockers) {
        assertCurrentEditor();
        if (!blockers.includes(blocker.description))
          await request(`/api/task-blockers/${blocker.id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
      }
      for (const description of blockers) {
        assertCurrentEditor();
        if (!openBlockers.some((blocker) => blocker.description === description))
          await request("/api/task-blockers", { method: "POST", body: JSON.stringify({ blockedTaskId: taskId, blockerType: "external", blockerId: null, description, severity: "medium", status: "open" }) });
      }
      await refresh();
      assertCurrentEditor();
      setActiveTaskSubteam(getTaskSubteamForDisciplineId(taskDraft.disciplineId, activeTaskSubteam));
      closeTaskEditor();
    } catch (error) {
      if (editorVersion.current === version) setTaskEditorError(`Task save incomplete: ${getClientErrorMessage(error)}. Review and retry.`);
    } finally { saving.current = false; }
  };

  const deleteTaskDraft = async () => {
    if (!activeTaskId) {
      return;
    }

    const version = editorVersion.current;
    try {
      await request(`/api/tasks/${activeTaskId}`, { method: "DELETE" });
      await refresh();
      if (editorVersion.current === version) closeTaskEditor();
    } catch (error) {
      if (editorVersion.current === version) setTaskEditorError(getClientErrorMessage(error));
    }
  };

  return { selectSubsystem, selectMechanism, selectPart, taskDraft, taskEditorError, taskEditorMode, taskDependencySearch, setTaskDependencySearch, setTaskDraft, availableTaskDependencyOptions, downstreamTaskDependencies, selectedTaskDependencies, taskDependencyReadinessMessage, openCreateTaskEditor, openEditTaskEditor, openDuplicateTaskEditor, closeTaskEditor, addTaskDependency, removeTaskDependency, saveTaskDraft, deleteTaskDraft };
}
