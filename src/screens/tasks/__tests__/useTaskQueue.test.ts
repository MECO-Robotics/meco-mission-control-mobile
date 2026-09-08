import { act, renderHook } from "@testing-library/react-native";
import type { Task } from "../../../types/domain";
import { useTaskQueue } from "../useTaskQueue";

const ready: Task = {
  id: "ready", title: "Build drive", summary: "", disciplineId: "software", subsystemId: "drive",
  ownerId: "student", mentorId: "mentor", dueDate: "2099-01-01", priority: "medium",
  status: "not-started", actualHours: 1, estimatedHours: 2, blockers: [], dependencyIds: [],
  checklistItems: [], linkedManufacturingIds: [], linkedPurchaseIds: [], isBlocked: false,
  mechanismId: null, partInstanceId: null, targetEventId: null,
};
const blocked: Task = { ...ready, id: "blocked", title: "Blocked", blockers: ["Supply"] };
const waiting: Task = { ...ready, id: "waiting", title: "Wait", dependencyIds: [blocked.id] };
const complete: Task = { ...ready, id: "complete", title: "Finished", status: "complete" };
const tasks = [ready, blocked, waiting, complete];
const inputs = {
  tasks, taskById: Object.fromEntries(tasks.map((task) => [task.id, task])),
  taskLoggedHoursById: { ready: 3 }, activeTaskSubteam: "programming" as const,
  canMentorApprove: false, activePersonFilter: "all", mechanismsById: {}, subsystemsById: {},
  membersById: { student: { id: "student", name: "Ada", role: "student" as const } },
};

test("filter changes compose and queue navigation resets the entire selection", () => {
  const { result } = renderHook(() => useTaskQueue(inputs));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).not.toContain("complete");
  act(() => {
    result.current.setTaskSearch("Ada");
    result.current.setTaskBlockerFilter("over-estimate");
  });
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["ready"]);
  expect(result.current.taskSummary).toContainEqual({ label: "Logged", value: "3.0h" });
  act(() => result.current.setTaskPriorityFilter("high"));
  expect(result.current.filteredTaskQueue).toEqual([]);
  act(() => result.current.resetFilters());
  expect(result.current.filteredTaskQueue).toHaveLength(3);
  expect(result.current.taskSearch).toBe("");
  expect(result.current.taskPriorityFilter).toBe("all");
});

test.each([
  ["blocked", ["blocked"]], ["dependency-wait", ["waiting"]], ["ready-now", ["ready"]],
] as const)("%s selection preserves dependency and readiness behavior", (filter, ids) => {
  const { result } = renderHook(() => useTaskQueue(inputs));
  act(() => result.current.setTaskBlockerFilter(filter));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(ids);
});

test("archive and active-person changes recompute selection from current input", () => {
  const { result, rerender } = renderHook((activePersonFilter: string) => useTaskQueue({ ...inputs, activePersonFilter }), {
    initialProps: "mentor",
  });
  act(() => result.current.setTaskArchiveFilter(() => "archived"));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["complete"]);
  rerender("other-person");
  expect(result.current.filteredTaskQueue).toEqual([]);
});
