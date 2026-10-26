import { act, renderHook } from "@testing-library/react-native";
import { useTaskEditor } from "../useTaskEditor";
import { mecoSnapshot } from "../../../data/__tests__/fixtures/mockData";
import type { Member, Project, Task, TaskDependency, WorkType } from "../../../types/domain";

const project: Project = { id: "robot-project", teamId: "team", seasonId: "season-2026", name: "Robot", projectType: "robot", description: "", status: "active" };
const workType: WorkType = { id: "robot-planning", projectType: "robot", code: "planning", name: "Planning", isActive: true };
const task: Task = {
  id: "robot-task", projectId: project.id, workTypeId: workType.id, responsibleGroupId: "robot-build", workstreamIds: [], title: "Robot work", summary: "",
  subsystemIds: [], mechanismIds: [], partInstanceIds: [], scheduleRefs: [], requestedById: "ava", ownerId: "ava", assigneeIds: [], mentorId: "jordan",
  startDate: "2026-09-01", dueDate: "2026-09-10", priority: "medium", status: "not-started", checklistItems: [], estimatedHours: 1, actualHours: 0,
  requiresDocumentation: false, manufacturingDetails: null,
};

function setup(deletion?: Promise<void>, members: Member[] = mecoSnapshot.members, projects: Project[] = [project], sourceTask: Task = task) {
  const relation: TaskDependency = { id: "edge", taskId: sourceTask.id, kind: "part-instance", refId: "part", requiredCondition: { kind: "physical-location", value: "stock" }, dependencyType: "soft", createdAt: "2026-09-08" };
  const calls: { path: string; init: RequestInit }[] = [];
  const request = async <T,>(path: string, init: RequestInit): Promise<T> => {
    calls.push({ path, init });
    if (init.method === "DELETE") await deletion;
    if (path === "/api/bootstrap") return { taskDependencies: [relation] } as T;
    return { item: sourceTask } as T;
  };
  const inputs = {
    projects, workTypes: [workType],
    mechanisms: mecoSnapshot.mechanisms, partInstances: mecoSnapshot.partInstances,
    tasks: [sourceTask], taskById: { [sourceTask.id]: sourceTask }, taskDependencies: [relation],
    members, membersById: Object.fromEntries(members.map((row) => [row.id, row])),
    subsystemsById: Object.fromEntries(mecoSnapshot.subsystems.map((row) => [row.id, row])), taskSubsystemOptions: mecoSnapshot.subsystems.map((row) => ({ id: row.id, name: row.name })),
    activeResponsibleGroupId: "robot-build", setActiveResponsibleGroupId: jest.fn(), request, refresh: jest.fn(async () => undefined),
  };
  return { task: sourceTask, calls, ...renderHook(() => useTaskEditor(inputs)) };
}

test("task edits keep execution data on Task and do not write a duplicate blocker store", async () => {
  const { task, calls, result } = setup();
  act(() => result.current.openEditTaskEditor(task));
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, summary: "Prepare and verify the bracket", checklistItemsText: "Measure bracket, Test fit", workstreamIds: ["robot-build"] })));
  await act(async () => result.current.saveTaskDraft());
  const taskWrite = calls.find((call) => call.path === `/api/tasks/${task.id}`)!;
  const body = JSON.parse(taskWrite.init.body as string);
  expect(body.checklistItems).toEqual(["Measure bracket", "Test fit"]);
  expect(body.workstreamIds).toEqual(["robot-build"]);
  expect(body).not.toHaveProperty("blockers");
  expect(body).not.toHaveProperty("actualHours");
  expect(calls.some((call) => call.path.includes("blocker"))).toBe(false);
});

test("editing an unrecorded source task preserves its status without sending an unsupported PATCH status", async () => {
  const sourceTask = { ...task, status: "unrecorded" as const };
  const { task: openedTask, calls, result } = setup(undefined, mecoSnapshot.members, [project], sourceTask);
  act(() => result.current.openEditTaskEditor(openedTask));
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, summary: "Keep imported work evidence unchanged" })));
  await act(async () => result.current.saveTaskDraft());

  const update = calls.find((call) => call.path === `/api/tasks/${sourceTask.id}`)!;
  expect(update).toBeDefined();
  expect(JSON.parse(update.init.body as string)).not.toHaveProperty("status");
});

test("creating a work item sends one canonical Task payload", async () => {
  const setupResult = setup();
  const { task, calls, result } = setupResult;
  act(() => result.current.openCreateTaskEditor());
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, title: "New task", summary: "Build it", ownerId: task.ownerId ?? "member" })));
  await act(async () => result.current.saveTaskDraft());
  expect(result.current.taskEditorMode).toBeNull();
  const writes = calls.filter((call) => call.path === "/api/tasks");
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0].init.body as string)).toMatchObject({ projectId: task.projectId, workTypeId: task.workTypeId, responsibleGroupId: "robot-build", title: "New task" });
  expect(JSON.parse(writes[0].init.body as string)).not.toHaveProperty("disciplineId");
  expect(JSON.parse(writes[0].init.body as string)).not.toHaveProperty("actualHours");
});

test("create defaults use eligible members and keep the current project selection", () => {
  const setupResult = setup();
  act(() => setupResult.result.current.openCreateTaskEditor());
  expect(setupResult.result.current.taskDraft).toMatchObject({ projectId: project.id, ownerId: "ava", mentorId: "jordan" });
});

test("create and duplicate defaults use the selected task project's season", () => {
  const otherSeasonProject: Project = { ...project, id: "past-robot-project", seasonId: "past-season" };
  const ava = mecoSnapshot.members.find((member) => member.id === "ava")!;
  const jordan = mecoSnapshot.members.find((member) => member.id === "jordan")!;
  const members: Member[] = [
    { ...ava, id: "past-owner", seasonId: "past-season", activeSeasonIds: ["past-season"] },
    { ...ava, id: "current-owner", seasonId: project.seasonId, activeSeasonIds: [project.seasonId] },
    { ...ava, id: "cross-season-owner", role: "lead", seasonId: "past-season", activeSeasonIds: [project.seasonId] },
    { ...jordan, id: "past-mentor", seasonId: "past-season", activeSeasonIds: ["past-season"] },
    { ...jordan, id: "current-mentor", seasonId: project.seasonId, activeSeasonIds: [project.seasonId] },
    { ...jordan, id: "cross-season-mentor", seasonId: "past-season", activeSeasonIds: [project.seasonId] },
  ];
  const { result } = setup(undefined, members, [project, otherSeasonProject]);

  act(() => result.current.openCreateTaskEditor());
  expect(result.current.taskDraft).toMatchObject({ projectId: project.id, ownerId: "current-owner", mentorId: "current-mentor" });

  act(() => result.current.openDuplicateTaskEditor({
    ...task, projectId: otherSeasonProject.id, ownerId: "current-owner", mentorId: "current-mentor",
  }));
  expect(result.current.taskDraft).toMatchObject({ projectId: otherSeasonProject.id, ownerId: "past-owner", mentorId: "past-mentor" });

  act(() => result.current.openDuplicateTaskEditor({
    ...task, projectId: otherSeasonProject.id, ownerId: "past-owner", mentorId: "past-mentor",
  }));
  expect(result.current.taskDraft).toMatchObject({ projectId: otherSeasonProject.id, ownerId: "past-owner", mentorId: "past-mentor" });
});

test("duplicate defaults leave an owner blank when its project season has no eligible owner", async () => {
  const otherSeasonProject: Project = { ...project, id: "past-robot-project", seasonId: "past-season" };
  const ava = mecoSnapshot.members.find((member) => member.id === "ava")!;
  const jordan = mecoSnapshot.members.find((member) => member.id === "jordan")!;
  const members: Member[] = [
    { ...ava, id: "current-owner", seasonId: project.seasonId, activeSeasonIds: [project.seasonId] },
    { ...jordan, id: "current-mentor", seasonId: project.seasonId, activeSeasonIds: [project.seasonId] },
  ];
  const { calls, result } = setup(undefined, members, [project, otherSeasonProject]);
  act(() => result.current.openDuplicateTaskEditor({
    ...task, projectId: otherSeasonProject.id, summary: "Existing summary", ownerId: "current-owner", mentorId: "current-mentor",
  }));

  expect(result.current.taskDraft).toMatchObject({ projectId: otherSeasonProject.id, ownerId: "", mentorId: "" });
  await act(async () => result.current.saveTaskDraft());
  expect(result.current.taskEditorError).toMatch(/owner/);
  expect(calls).toHaveLength(0);
});

test("saving after a project change rejects stale people until eligible current-season members are selected", async () => {
  const otherSeasonProject: Project = { ...project, id: "past-robot-project", seasonId: "past-season" };
  const ava = mecoSnapshot.members.find((member) => member.id === "ava")!;
  const jordan = mecoSnapshot.members.find((member) => member.id === "jordan")!;
  const members: Member[] = [
    { ...ava, id: "past-owner", seasonId: "past-season", activeSeasonIds: ["past-season"] },
    { ...ava, id: "current-owner", seasonId: project.seasonId, activeSeasonIds: [project.seasonId] },
    { ...jordan, id: "past-mentor", seasonId: "past-season", activeSeasonIds: ["past-season"] },
    { ...jordan, id: "current-mentor", seasonId: project.seasonId, activeSeasonIds: [project.seasonId] },
  ];
  const { calls, result } = setup(undefined, members, [project, otherSeasonProject]);
  act(() => result.current.openEditTaskEditor(task));
  act(() => result.current.setTaskDraft((draft) => ({
    ...draft, projectId: otherSeasonProject.id, title: "Robot work", summary: "Existing summary",
    ownerId: "current-owner", mentorId: "current-mentor",
  })));

  await act(async () => result.current.saveTaskDraft());
  expect(result.current.taskEditorError).toMatch(/selected project's season/i);
  expect(calls).toHaveLength(0);

  act(() => result.current.setTaskDraft((draft) => ({ ...draft, ownerId: "past-owner", mentorId: "past-mentor" })));
  await act(async () => result.current.saveTaskDraft());
  expect(result.current.taskEditorError).toBeNull();
  const update = calls.find((call) => call.path === `/api/tasks/${task.id}`)!;
  expect(update).toBeTruthy();
  expect(JSON.parse(update.init.body as string)).toMatchObject({ ownerId: "past-owner", mentorId: "past-mentor" });
});

test("task editor fails closed when the draft has no project season", async () => {
  const { calls, result } = setup(undefined, mecoSnapshot.members, []);
  act(() => result.current.openCreateTaskEditor());
  act(() => result.current.setTaskDraft((draft) => ({
    ...draft, title: "Unscoped work", summary: "Must choose a project", workTypeId: workType.id,
    ownerId: "ava", mentorId: "jordan",
  })));

  await act(async () => result.current.saveTaskDraft());
  expect(result.current.taskEditorError).toMatch(/project/);
  expect(calls).toHaveLength(0);
});

test("task submission keeps mentor optional when the required owner is season-eligible", async () => {
  const { calls, result } = setup();
  act(() => result.current.openCreateTaskEditor());
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, title: "Student-owned work", summary: "No mentor assigned", mentorId: "" })));

  await act(async () => result.current.saveTaskDraft());
  const create = calls.find((call) => call.path === "/api/tasks")!;
  expect(JSON.parse(create.init.body as string)).toMatchObject({ ownerId: "ava", mentorId: null });
});

test("editing retains the existing owner and mentor fields", () => {
  const { result } = setup();
  act(() => result.current.openEditTaskEditor(task));
  expect(result.current.taskDraft).toMatchObject({ ownerId: "ava", mentorId: "jordan", projectId: project.id });
});

test("empty and mentor-only rosters leave the owner unassigned", () => {
  const members = [mecoSnapshot.members.find((member) => member.role === "mentor")!];
  // Exercise the same editor hook with a roster that has no owner-eligible member.
  const hook = renderHook(() => useTaskEditor({
    projects: [project], workTypes: [workType], mechanisms: mecoSnapshot.mechanisms, partInstances: mecoSnapshot.partInstances,
    tasks: [task], taskById: { [task.id]: task }, taskDependencies: [], members, membersById: Object.fromEntries(members.map((row) => [row.id, row])),
    subsystemsById: {}, taskSubsystemOptions: [], activeResponsibleGroupId: "all", setActiveResponsibleGroupId: jest.fn(),
    request: async <T,>() => ({ item: task } as T), refresh: async () => undefined,
  }));
  act(() => hook.result.current.openCreateTaskEditor());
  expect(hook.result.current.taskDraft.ownerId).toBe("");
  expect(hook.result.current.taskDraft.mentorId).toBe(members[0].id);
  hook.unmount();
  const empty = renderHook(() => useTaskEditor({
    projects: [project], workTypes: [workType], mechanisms: [], partInstances: [], tasks: [], taskById: {}, taskDependencies: [], members: [], membersById: {},
    subsystemsById: {}, taskSubsystemOptions: [], activeResponsibleGroupId: "all", setActiveResponsibleGroupId: jest.fn(),
    request: async <T,>() => ({ item: task } as T), refresh: async () => undefined,
  }));
  act(() => empty.result.current.openCreateTaskEditor());
  expect(empty.result.current.taskDraft.ownerId).toBe("");
  expect(empty.result.current.taskDraft.mentorId).toBe("");
  empty.unmount();
});

test.each(["resolve", "reject"])("deleting an old task cannot change a newer editor on %s", async (outcome) => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const deletion = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  const { task, result } = setup(deletion);
  act(() => result.current.openEditTaskEditor(task));
  let pending!: Promise<void>;
  act(() => { pending = result.current.deleteTaskDraft(); });
  act(() => result.current.openCreateTaskEditor());
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, title: "New unsaved work" })));
  await act(async () => {
    if (outcome === "resolve") resolve();
    else reject(new Error("Old deletion failed"));
    await pending;
  });
  expect(result.current.taskEditorMode).toBe("create");
  expect(result.current.taskDraft.title).toBe("New unsaved work");
  expect(result.current.taskEditorError).toBeNull();
});
