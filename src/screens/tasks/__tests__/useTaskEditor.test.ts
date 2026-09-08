import { act, renderHook } from "@testing-library/react-native";
import { useTaskEditor } from "../useTaskEditor";
import { mecoSnapshot } from "../../../data/mockData";
import type { TaskDependency } from "../../../types/domain";

function setup(failRelation = false, deletion?: Promise<void>) {
  const task = mecoSnapshot.tasks[0];
  const relation: TaskDependency = { id: "edge", taskId: task.id, kind: "part_instance", refId: "part", requiredState: "assembled", dependencyType: "soft", createdAt: "2026-09-08" };
  const calls: { path: string; init: RequestInit }[] = [];
  let failed = false;
  const request = async <T,>(path: string, init: RequestInit): Promise<T> => {
    calls.push({ path, init });
    if (init.method === "DELETE") await deletion;
    if (path === "/api/bootstrap") return { taskDependencies: [relation], taskBlockers: [] } as T;
    if (path === "/api/task-blockers" && failRelation && !failed) { failed = true; throw new Error("offline"); }
    return { item: task } as T;
  };
  const inputs = {
    tasks: mecoSnapshot.tasks, taskById: Object.fromEntries(mecoSnapshot.tasks.map((row) => [row.id, row])), taskDependencies: [relation],
    members: mecoSnapshot.members, membersById: Object.fromEntries(mecoSnapshot.members.map((row) => [row.id, row])), disciplines: mecoSnapshot.disciplines,
    subsystemsById: Object.fromEntries(mecoSnapshot.subsystems.map((row) => [row.id, row])), taskSubsystemOptions: mecoSnapshot.subsystems.map((row) => ({ id: row.id, name: row.name })),
    activeTaskSubteam: "programming" as const, setActiveTaskSubteam: jest.fn(), request, refresh: jest.fn(async () => undefined),
  };
  return { task, calls, ...renderHook(() => useTaskEditor(inputs)) };
}

test("editing preserves non-task dependency semantics and writes blockers as records", async () => {
  const { task, calls, result } = setup();
  act(() => result.current.openEditTaskEditor(task));
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, blockersText: "Waiting for supplies", checklistItemsText: "Measure bracket, Test fit" })));
  await act(async () => result.current.saveTaskDraft());
  const taskWrite = calls.find((call) => call.path === `/api/tasks/${task.id}`)!;
  const body = JSON.parse(taskWrite.init.body as string);
  expect(body).not.toHaveProperty("dependencyIds");
  expect(body).not.toHaveProperty("blockers");
  expect(body.checklistItems).toEqual(["Measure bracket", "Test fit"]);
  expect(calls.some((call) => call.path.startsWith("/api/task-dependencies"))).toBe(false);
  expect(JSON.parse(calls.find((call) => call.path === "/api/task-blockers")!.init.body as string)).toMatchObject({ blockedTaskId: task.id, description: "Waiting for supplies" });
  expect(result.current.taskEditorMode).toBeNull();
});

test("a partially saved create retains its ID and retries without creating another task", async () => {
  const { task, calls, result } = setup(true);
  act(() => result.current.openCreateTaskEditor());
  act(() => result.current.setTaskDraft((draft) => ({ ...draft, title: "New task", summary: "Build it", ownerId: task.ownerId!, blockersText: "Waiting" })));
  await act(async () => result.current.saveTaskDraft());
  expect(result.current.taskEditorError).toContain("offline");
  expect(result.current.taskEditorMode).toBe("edit");
  await act(async () => result.current.saveTaskDraft());
  expect(calls.filter((call) => call.path === "/api/tasks")).toHaveLength(1);
  expect(calls.some((call) => call.path === `/api/tasks/${task.id}` && call.init.method === "PATCH")).toBe(true);
  expect(result.current.taskEditorMode).toBeNull();
});

test.each(["resolve", "reject"])("deleting an old task cannot change a newer editor on %s", async (outcome) => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const deletion = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  const { task, result } = setup(false, deletion);
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
