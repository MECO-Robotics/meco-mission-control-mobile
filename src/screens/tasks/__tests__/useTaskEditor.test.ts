import { act, renderHook } from "@testing-library/react-native";
import { useTaskEditor } from "../useTaskEditor";
import { mecoSnapshot } from "../../../data/__tests__/fixtures/mockData";
import type { Project, Task, TaskDependency, WorkType } from "../../../types/domain";

const project: Project = { id: "robot-project", teamId: "team", seasonId: "season", name: "Robot", projectType: "robot", description: "", status: "active" };
const workType: WorkType = { id: "robot-planning", projectType: "robot", code: "planning", name: "Planning", isActive: true };
const task: Task = {
  id: "robot-task", projectId: project.id, workTypeId: workType.id, responsibleGroupId: "robot-build", workstreamIds: [], title: "Robot work", summary: "",
  subsystemIds: [], mechanismIds: [], partInstanceIds: [], scheduleRefs: [], requestedById: "member", ownerId: "member", assigneeIds: [], mentorId: null,
  startDate: "2026-09-01", dueDate: "2026-09-10", priority: "medium", status: "not-started", checklistItems: [], estimatedHours: 1, actualHours: 0,
  requiresDocumentation: false, manufacturingDetails: null,
};

function setup(deletion?: Promise<void>) {
  const relation: TaskDependency = { id: "edge", taskId: task.id, kind: "part-instance", refId: "part", requiredCondition: { kind: "physical-location", value: "stock" }, dependencyType: "soft", createdAt: "2026-09-08" };
  const calls: { path: string; init: RequestInit }[] = [];
  const request = async <T,>(path: string, init: RequestInit): Promise<T> => {
    calls.push({ path, init });
    if (init.method === "DELETE") await deletion;
    if (path === "/api/bootstrap") return { taskDependencies: [relation] } as T;
    return { item: task } as T;
  };
  const inputs = {
    projects: [project], workTypes: [workType],
    mechanisms: mecoSnapshot.mechanisms, partInstances: mecoSnapshot.partInstances,
    tasks: [task], taskById: { [task.id]: task }, taskDependencies: [relation],
    members: mecoSnapshot.members, membersById: Object.fromEntries(mecoSnapshot.members.map((row) => [row.id, row])),
    subsystemsById: Object.fromEntries(mecoSnapshot.subsystems.map((row) => [row.id, row])), taskSubsystemOptions: mecoSnapshot.subsystems.map((row) => ({ id: row.id, name: row.name })),
    activeResponsibleGroupId: "robot-build", setActiveResponsibleGroupId: jest.fn(), request, refresh: jest.fn(async () => undefined),
  };
  return { task, calls, ...renderHook(() => useTaskEditor(inputs)) };
}

test("task edits keep execution data on Task and do not write a duplicate blocker store", async () => {
  const { task, calls, result } = setup();
  act(() => result.current.openEditTaskEditor(task));
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, summary: "Prepare and verify the bracket", checklistItemsText: "Measure bracket, Test fit" })));
  await act(async () => result.current.saveTaskDraft());
  const taskWrite = calls.find((call) => call.path === `/api/tasks/${task.id}`)!;
  const body = JSON.parse(taskWrite.init.body as string);
  expect(body.checklistItems).toEqual(["Measure bracket", "Test fit"]);
  expect(body).not.toHaveProperty("blockers");
  expect(calls.some((call) => call.path.includes("blocker"))).toBe(false);
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
