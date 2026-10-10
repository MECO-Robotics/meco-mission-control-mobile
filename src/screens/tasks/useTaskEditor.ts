import { useMemo, useRef, useState } from "react";
import type { Mechanism, PartInstance, Task, TaskDependency, Member, WorkType, Project } from "../../types/domain";
import type { EditorMode, Option } from "../../ui/types";
import { STATUS_LABELS } from "../../ui/constants";
import { isoToday, localTodayDate } from "../../ui/helpers";
import { taskDependsOnTarget } from "../../data/taskReadiness";
import { getClientErrorMessage } from "../../app/appModel";
import { buildTaskDraft, selectTaskSubsystem, selectTaskMechanism, selectTaskPart, type TaskDraft } from "./taskDraft";

type DependencyDraft = TaskDependency extends infer Edge ? Edge extends TaskDependency ? Omit<Edge, "id" | "taskId" | "createdAt"> : never : never;
type Inputs = {
  mechanisms: Mechanism[];
  partInstances: PartInstance[];
  projects: Project[];
  workTypes: WorkType[];
  tasks: Task[];
  taskById: Record<string, Task>;
  taskDependencies: TaskDependency[];
  members: Member[];
  membersById: Record<string, Member>;
  subsystemsById: Record<string, import("../../types/domain").Subsystem>;
  taskSubsystemOptions: Option[];
  activeResponsibleGroupId: string;
  setActiveResponsibleGroupId: (groupId: string) => void;
  request: <T>(path: string, init: RequestInit) => Promise<T>;
  refresh: () => Promise<unknown>;
};

export function useTaskEditor({ mechanisms, partInstances, projects, workTypes, tasks, taskById, taskDependencies, members, membersById,
  subsystemsById, taskSubsystemOptions, activeResponsibleGroupId, setActiveResponsibleGroupId, request, refresh }: Inputs) {
  const editorVersion = useRef(0);
  const saving = useRef(false);
  const [taskEditorMode, setTaskEditorMode] = useState<EditorMode | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(buildTaskDraft());
  const [taskEditorError, setTaskEditorError] = useState<string | null>(null);
  const [taskDependencySearch, setTaskDependencySearch] = useState("");

  const selectedTaskDependencyIds = useMemo(() => taskDraft.dependencies.filter((edge) => edge.kind === "task").map((edge) => edge.refId)
    .filter((id) => taskById[id] && id !== activeTaskId), [activeTaskId, taskById, taskDraft.dependencies]);
  const selectedTaskDependencies = useMemo(() => selectedTaskDependencyIds.map((id) => taskById[id]).filter((task): task is Task => Boolean(task)), [selectedTaskDependencyIds, taskById]);
  const taskDependencyReadinessMessage = useMemo(() => {
    const unresolved = taskDraft.dependencies.filter((edge): edge is Extract<DependencyDraft, { kind: "task" }> => edge.kind === "task" && edge.dependencyType === "hard" && taskById[edge.refId]?.status !== edge.requiredState);
    return unresolved.length ? `Waiting on: ${unresolved.map((edge) => `${taskById[edge.refId]?.title ?? `Missing task ${edge.refId}`} (${edge.requiredState} required)`).join(", ")}.` : null;
  }, [taskDraft.dependencies, taskById]);
  const downstreamTaskDependencies = useMemo(() => !activeTaskId ? [] : tasks.filter((task) => task.id !== activeTaskId)
    .filter((task) => taskDependencies.some((edge) => edge.taskId === task.id && edge.kind === "task" && edge.refId === activeTaskId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)).slice(0, 6), [activeTaskId, tasks, taskDependencies]);
  const availableTaskDependencyOptions = useMemo(() => {
    const selected = new Set(selectedTaskDependencyIds);
    const search = taskDependencySearch.trim().toLowerCase();
    return tasks.filter((task) => task.id !== activeTaskId && !selected.has(task.id))
      .filter((task) => !activeTaskId || !taskDependsOnTarget(task.id, activeTaskId, taskDependencies))
      .filter((task) => !search || `${task.id} ${task.title} ${task.summary} ${STATUS_LABELS[task.status]} ${task.subsystemIds.map((id) => subsystemsById[id]?.name ?? "").join(" ")} ${task.ownerId ? membersById[task.ownerId]?.name ?? "" : ""}`.toLowerCase().includes(search))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)).slice(0, search ? 20 : 10);
  }, [activeTaskId, membersById, selectedTaskDependencyIds, subsystemsById, taskDependencySearch, tasks, taskDependencies]);

  const openCreateTaskEditor = () => {
    editorVersion.current += 1;
    const today = localTodayDate();
    const project = projects.find((item) => item.projectType === "robot") ?? projects[0];
    const workType = workTypes.find((item) => item.projectType === project?.projectType && item.code === "planning") ?? workTypes.find((item) => item.projectType === project?.projectType);
    setActiveTaskId(null);
    setTaskDraft(buildTaskDraft({ projectId: project?.id ?? "", workTypeId: workType?.id ?? "", responsibleGroupId: activeResponsibleGroupId === "all" ? "" : activeResponsibleGroupId,
      subsystemIds: taskSubsystemOptions[0] ? [taskSubsystemOptions[0].id] : [], ownerId: members[0]?.id ?? "",
      mentorId: members.find((member) => member.role === "mentor" || member.role === "admin")?.id ?? "", startDate: today, dueDate: today }));
    setTaskEditorError(null); setTaskDependencySearch(""); setTaskEditorMode("create");
  };
  const openEditTaskEditor = (task: Task) => {
    editorVersion.current += 1; setActiveTaskId(task.id);
    setTaskDraft({ ...buildTaskDraft(task), dependencies: taskDependencies.filter((edge) => edge.taskId === task.id).map((edge): DependencyDraft => {
      if (edge.kind === "task") return { kind: edge.kind, refId: edge.refId, dependencyType: edge.dependencyType, requiredState: edge.requiredState };
      if (edge.kind === "milestone") return { kind: edge.kind, refId: edge.refId, dependencyType: edge.dependencyType, requiredState: edge.requiredState };
      return { kind: edge.kind, refId: edge.refId, dependencyType: edge.dependencyType, requiredCondition: edge.requiredCondition };
    }) });
    setTaskEditorError(null); setTaskDependencySearch(""); setTaskEditorMode("edit");
  };
  const openDuplicateTaskEditor = (task: Task) => {
    editorVersion.current += 1; setActiveTaskId(null);
    setTaskDraft(buildTaskDraft({ ...task, id: "", title: `Copy of ${task.title}`, dueDate: isoToday(), status: "not-started", actualHours: 0, isBlocked: false }));
    setTaskEditorError(null); setTaskDependencySearch(""); setTaskEditorMode("create");
  };
  const closeTaskEditor = () => { editorVersion.current += 1; setTaskEditorMode(null); setActiveTaskId(null); setTaskEditorError(null); setTaskDependencySearch(""); };
  const addTaskDependency = (id: string) => setTaskDraft((current) => {
    if (id === activeTaskId || (activeTaskId && taskDependsOnTarget(id, activeTaskId, taskDependencies)) || current.dependencies.some((edge) => edge.kind === "task" && edge.refId === id)) return current;
    return { ...current, dependencies: [...current.dependencies, { kind: "task", refId: id, requiredState: "complete", dependencyType: "hard" }] };
  });
  const removeTaskDependency = (id: string) => setTaskDraft((current) => ({ ...current, dependencies: current.dependencies.filter((edge) => edge.kind !== "task" || edge.refId !== id) }));
  const selectSubsystem = (id: string) => setTaskDraft((draft) => selectTaskSubsystem(draft, id, mechanisms, partInstances));
  const selectMechanism = (id: string) => setTaskDraft((draft) => selectTaskMechanism(draft, id, partInstances));
  const selectPart = (id: string) => setTaskDraft((draft) => selectTaskPart(draft, id, partInstances));

  const saveTaskDraft = async () => {
    if (saving.current) return;
    const version = editorVersion.current;
    const assertCurrent = () => { if (editorVersion.current !== version) throw new Error("The task editor changed during save."); };
    const isEdit = taskEditorMode === "edit" && activeTaskId;
    const existingTask = isEdit ? taskById[activeTaskId] : null;
    const checklistItems = taskDraft.checklistItemsText.split(",").map((item) => item.trim()).filter(Boolean);
    const dependencyRefs = taskDraft.dependencies.filter((edge) => edge.kind === "task").map((edge) => edge.refId).filter((id) => taskById[id] && id !== activeTaskId);
    const title = taskDraft.title.trim(); const summary = taskDraft.summary.trim(); const estimatedHours = Number(taskDraft.estimatedHours);
    const missing = [!title ? "title" : null, !summary ? "summary" : null, !taskDraft.projectId ? "project" : null, !taskDraft.workTypeId ? "work type" : null,
      !taskDraft.ownerId ? "owner" : null, Number.isNaN(estimatedHours) || estimatedHours < 0 ? "estimated hours" : null].filter((field): field is string => Boolean(field));
    if (missing.length) { setTaskEditorError(`Add ${missing.join(", ")} before saving this work item.`); return; }
    if (activeTaskId) {
      const circular = dependencyRefs.filter((id) => taskDependsOnTarget(id, activeTaskId, taskDependencies));
      if (circular.length) { setTaskEditorError(`Remove circular dependencies before saving: ${circular.map((id) => taskById[id]?.title ?? id).join(", ")}.`); return; }
    }
    setTaskEditorError(null);
    const payload = {
      projectId: taskDraft.projectId, workTypeId: taskDraft.workTypeId, responsibleGroupId: taskDraft.responsibleGroupId || null,
      title, summary, subsystemIds: taskDraft.subsystemIds, mechanismIds: taskDraft.mechanismIds, partInstanceIds: taskDraft.partInstanceIds,
      scheduleRefs: taskDraft.scheduleRefs, workstreamIds: taskDraft.workstreamIds, ownerId: taskDraft.ownerId || null,
      assigneeIds: taskDraft.assigneeIds, requestedById: existingTask?.requestedById ?? null, mentorId: taskDraft.mentorId || null,
      startDate: taskDraft.startDate || isoToday(), dueDate: taskDraft.dueDate || isoToday(), priority: taskDraft.priority, status: taskDraft.status,
      checklistItems, estimatedHours, actualHours: existingTask?.actualHours ?? 0,
      requiresDocumentation: existingTask?.requiresDocumentation ?? false, manufacturingDetails: taskDraft.manufacturingDetails,
    };
    saving.current = true;
    try {
      const response = await request<{ item: Task }>(isEdit ? `/api/tasks/${activeTaskId}` : "/api/tasks", { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(payload) });
      assertCurrent(); const taskId = response.item.id; setActiveTaskId(taskId); setTaskEditorMode("edit");
      const { taskDependencies: currentEdges } = await request<{ taskDependencies: TaskDependency[] }>("/api/bootstrap", {}); assertCurrent();
      const current = currentEdges.filter((edge) => edge.taskId === taskId);
      const same = (a: DependencyDraft, b: DependencyDraft) => JSON.stringify(a) === JSON.stringify(b);
      for (const edge of current) {
        const { id: _id, taskId: _taskId, createdAt: _createdAt, ...value } = edge;
        if (!taskDraft.dependencies.some((desired) => same(value as DependencyDraft, desired))) { assertCurrent(); await request(`/api/task-dependencies/${edge.id}`, { method: "DELETE" }); }
      }
      for (const edge of taskDraft.dependencies) {
        if (!current.some((existing) => { const { id: _id, taskId: _taskId, createdAt: _createdAt, ...value } = existing; return same(value as DependencyDraft, edge); })) {
          assertCurrent(); await request("/api/task-dependencies", { method: "POST", body: JSON.stringify({ ...edge, taskId }) });
        }
      }
      await refresh(); assertCurrent();
      if (taskDraft.responsibleGroupId) setActiveResponsibleGroupId(taskDraft.responsibleGroupId);
      closeTaskEditor();
    } catch (error) {
      if (editorVersion.current === version) setTaskEditorError(`Work item save incomplete: ${getClientErrorMessage(error)}. Review and retry.`);
    } finally { saving.current = false; }
  };

  const deleteTaskDraft = async () => {
    if (!activeTaskId) return;
    const version = editorVersion.current;
    try { await request(`/api/tasks/${activeTaskId}`, { method: "DELETE" }); await refresh(); if (editorVersion.current === version) closeTaskEditor(); }
    catch (error) { if (editorVersion.current === version) setTaskEditorError(getClientErrorMessage(error)); }
  };

  return { selectSubsystem, selectMechanism, selectPart, taskDraft, taskEditorError, taskEditorMode, taskDependencySearch, setTaskDependencySearch, setTaskDraft,
    availableTaskDependencyOptions, downstreamTaskDependencies, selectedTaskDependencies, taskDependencyReadinessMessage, openCreateTaskEditor, openEditTaskEditor,
    openDuplicateTaskEditor, closeTaskEditor, addTaskDependency, removeTaskDependency, saveTaskDraft, deleteTaskDraft };
}
