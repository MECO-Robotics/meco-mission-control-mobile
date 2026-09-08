import { useMemo, useRef, useState } from "react";
import type { Task, TaskDependency, TaskBlocker, Member, Discipline, Subsystem } from "../../types/domain";
import type { EditorMode, Option, TaskSubteamTab } from "../../ui/types";
import { STATUS_LABELS, TASK_SUBTEAM_DISCIPLINE_IDS } from "../../ui/constants";
import { isoToday, localTodayDate, splitList } from "../../ui/helpers";
import { taskDependsOnTarget } from "../../data/taskReadiness";
import { getTaskSubteamForDisciplineId } from "../../data/taskQueueOrdering";
import { getClientErrorMessage, mapTaskPayloadToServer } from "../../app/appModel";
import { buildTaskDraft, type TaskDraft } from "./taskDraft";

type Inputs = {
  tasks: Task[]; taskById: Record<string, Task>; taskDependencies: TaskDependency[];
  members: Member[]; membersById: Record<string, Member>; disciplines: Discipline[];
  subsystemsById: Record<string, Subsystem>; taskSubsystemOptions: Option[];
  activeTaskSubteam: TaskSubteamTab; setActiveTaskSubteam: (subteam: TaskSubteamTab) => void;
  request: <T>(path: string, init: RequestInit) => Promise<T>; refresh: () => Promise<unknown>;
};
export function useTaskEditor({ tasks, taskById, taskDependencies, members, membersById, disciplines,
  subsystemsById, taskSubsystemOptions, activeTaskSubteam, setActiveTaskSubteam, request, refresh }: Inputs) {
  const editorVersion = useRef(0);
  const saving = useRef(false);
  const [taskEditorMode, setTaskEditorMode] = useState<EditorMode | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(buildTaskDraft());
  const [taskEditorError, setTaskEditorError] = useState<string | null>(null);
  const [taskDependencySearch, setTaskDependencySearch] = useState("");

  const selectedTaskDependencyIds = useMemo(() => {
    return taskDraft.dependencies.filter((edge) => edge.kind === "task").map((edge) => edge.refId)
      .filter((dependencyId) => taskById[dependencyId])
      .filter((dependencyId) => dependencyId !== activeTaskId);
  }, [activeTaskId, taskById, taskDraft.dependencies]);
  const selectedTaskDependencies = useMemo(() => {
    return selectedTaskDependencyIds
      .map((dependencyId) => taskById[dependencyId])
      .filter((task): task is Task => Boolean(task));
  }, [selectedTaskDependencyIds, taskById]);
  const taskDependencyReadinessMessage = useMemo(() => {
    const unresolved = taskDraft.dependencies.filter((edge) => edge.kind === "task" && edge.dependencyType === "hard" && taskById[edge.refId]?.status !== edge.requiredState);
    if (unresolved.length === 0) return null;
    return `Waiting on: ${unresolved.map((edge) => `${taskById[edge.refId]?.title ?? `Missing task ${edge.refId}`} (${edge.requiredState} required)`).join(", ")}.`;
  }, [taskDraft.dependencies, taskById]);
  const downstreamTaskDependencies = useMemo(() => {
    if (!activeTaskId) {
      return [];
    }

    return tasks
      .filter((task) => task.id !== activeTaskId)
      .filter((task) => taskDependencies.some((edge) => edge.taskId === task.id && edge.kind === "task" && edge.refId === activeTaskId))
      .sort(
        (firstTask, secondTask) =>
          firstTask.dueDate.localeCompare(secondTask.dueDate) ||
          firstTask.title.localeCompare(secondTask.title),
      )
      .slice(0, 6);
  }, [activeTaskId, tasks, taskDependencies]);
  const availableTaskDependencyOptions = useMemo(() => {
    const selectedIds = new Set(selectedTaskDependencyIds);
    const search = taskDependencySearch.trim().toLowerCase();

    return tasks
      .filter((task) => task.id !== activeTaskId)
      .filter((task) => !selectedIds.has(task.id))
      .filter(
        (task) => !activeTaskId || !taskDependsOnTarget(task.id, activeTaskId, taskDependencies),
      )
      .filter((task) => {
        if (!search) {
          return true;
        }

        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "";
        const ownerName = task.ownerId ? (membersById[task.ownerId]?.name ?? "") : "";

        return [
          task.id,
          task.title,
          task.summary,
          STATUS_LABELS[task.status],
          subsystemName,
          ownerName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((firstTask, secondTask) => {
        const firstSubsystemScore = firstTask.subsystemId === taskDraft.subsystemId ? 0 : 1;
        const secondSubsystemScore = secondTask.subsystemId === taskDraft.subsystemId ? 0 : 1;
        const firstDisciplineScore = firstTask.disciplineId === taskDraft.disciplineId ? 0 : 1;
        const secondDisciplineScore = secondTask.disciplineId === taskDraft.disciplineId ? 0 : 1;

        return (
          firstSubsystemScore - secondSubsystemScore ||
          firstDisciplineScore - secondDisciplineScore ||
          firstTask.dueDate.localeCompare(secondTask.dueDate) ||
          firstTask.title.localeCompare(secondTask.title)
        );
      })
      .slice(0, search ? 20 : 10);
  }, [
    activeTaskId,
    membersById,
    selectedTaskDependencyIds,
    subsystemsById,
    taskDependencySearch,
    taskDraft.disciplineId,
    taskDraft.subsystemId,
    tasks,
    taskDependencies,
  ]);

  const openCreateTaskEditor = () => {
    editorVersion.current += 1;
    const today = localTodayDate();

    setActiveTaskId(null);
    setTaskDraft(
      buildTaskDraft({
        subsystemId: taskSubsystemOptions[0]?.id ?? "",
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
    setTaskDraft({ ...buildTaskDraft(task), dependencies: taskDependencies.filter((edge) => edge.taskId === task.id).map(({ kind, refId, requiredState, dependencyType }) => ({ kind, refId, requiredState, dependencyType })) });
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

  const addTaskDependency = (dependencyId: string) => {
    setTaskDraft((current) => {
      if (dependencyId === activeTaskId) {
        return current;
      }

      if (
        activeTaskId &&
        taskDependsOnTarget(dependencyId, activeTaskId, taskDependencies)
      ) {
        return current;
      }

      if (current.dependencies.some((edge) => edge.kind === "task" && edge.refId === dependencyId)) return current;
      return { ...current, dependencies: [...current.dependencies, { kind: "task", refId: dependencyId, requiredState: "complete", dependencyType: "hard" }] };
    });
  };
  const removeTaskDependency = (dependencyId: string) => {
    setTaskDraft((current) => ({ ...current, dependencies: current.dependencies.filter((edge) => edge.kind !== "task" || edge.refId !== dependencyId) }));
  };

  const saveTaskDraft = async () => {
    if (saving.current) return;
    const version = editorVersion.current;
    const assertCurrentEditor = () => { if (editorVersion.current !== version) throw new Error("The task editor changed during save."); };
    const isEdit = taskEditorMode === "edit" && activeTaskId;
    const existingTask = isEdit ? taskById[activeTaskId] : null;
    const blockers = splitList(taskDraft.blockersText);
    const checklistItems = splitList(taskDraft.checklistItemsText);
    const dependencyRefs = taskDraft.dependencies.filter((edge) => edge.kind === "task").map((edge) => edge.refId)
      .filter((dependencyId) => taskById[dependencyId])
      .filter((dependencyId) => dependencyId !== activeTaskId);
    const title = taskDraft.title.trim();
    const summary = taskDraft.summary.trim();
    const parsedEstimatedHours = Number(taskDraft.estimatedHours);

    const missingFields = [
      !title ? "title" : null,
      !summary ? "summary" : null,
      !taskDraft.subsystemId ? "subsystem" : null,
      !taskDraft.ownerId ? "owner" : null,
      Number.isNaN(parsedEstimatedHours) || parsedEstimatedHours < 0 ? "estimated hours" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setTaskEditorError(`Add ${missingFields.join(", ")} before saving this task.`);
      return;
    }

    if (activeTaskId) {
      const circularDependencies = dependencyRefs.filter((dependencyId) =>
        taskDependsOnTarget(dependencyId, activeTaskId, taskDependencies),
      );

      if (circularDependencies.length > 0) {
        const dependencyNames = circularDependencies
          .map((dependencyId) => taskById[dependencyId]?.title ?? dependencyId)
          .join(", ");
        setTaskEditorError(
          `Remove circular dependencies before saving: ${dependencyNames}.`,
        );
        return;
      }
    }

    setTaskEditorError(null);
    const status = taskDraft.status;

    const payload = mapTaskPayloadToServer({
      title,
      summary,
      subsystemId: taskDraft.subsystemId,
      disciplineId:
        taskDraft.disciplineId || disciplines[0]?.id || "mechanical",
      mechanismId: taskDraft.mechanismId,
      partInstanceId: taskDraft.partInstanceId,
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
      const existingEdges = relations.taskDependencies.filter((edge) => edge.taskId === taskId);
      const sameEdge = (left: TaskDraft["dependencies"][number], right: TaskDraft["dependencies"][number]) =>
        left.kind === right.kind && left.refId === right.refId && left.requiredState === right.requiredState && left.dependencyType === right.dependencyType;
      for (const edge of existingEdges) {
        assertCurrentEditor();
        if (!taskDraft.dependencies.some((desired) => sameEdge(edge, desired)))
          await request(`/api/task-dependencies/${edge.id}`, { method: "DELETE" });
      }
      for (const edge of taskDraft.dependencies) {
        assertCurrentEditor();
        if (!existingEdges.some((existing) => sameEdge(existing, edge)))
          await request("/api/task-dependencies", { method: "POST", body: JSON.stringify({ ...edge, taskId }) });
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

    try {
      await request(`/api/tasks/${activeTaskId}`, { method: "DELETE" });
      await refresh();
      closeTaskEditor();
    } catch (error) { setTaskEditorError(getClientErrorMessage(error)); }
  };

  return { taskDraft, taskEditorError, taskEditorMode, taskDependencySearch, setTaskDependencySearch, setTaskDraft, availableTaskDependencyOptions, downstreamTaskDependencies, selectedTaskDependencies, taskDependencyReadinessMessage, openCreateTaskEditor, openEditTaskEditor, openDuplicateTaskEditor, closeTaskEditor, addTaskDependency, removeTaskDependency, saveTaskDraft, deleteTaskDraft };
}
