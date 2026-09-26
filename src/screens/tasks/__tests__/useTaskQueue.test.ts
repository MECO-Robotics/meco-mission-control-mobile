import { act, renderHook } from "@testing-library/react-native";
import type { Task } from "../../../types/domain";
import { useTaskQueue } from "../useTaskQueue";

const ready: Task = {
  id: "ready", title: "Build drive", summary: "", disciplineId: "software", workstreamIds: [], artifactIds: [], subsystemIds: ["drive"],
  ownerId: "student", mentorId: "mentor", dueDate: "2099-01-01", priority: "medium",
  status: "not-started", actualHours: 1, estimatedHours: 2, blockers: [], linkedManufacturingIds: [], linkedPurchaseIds: [], isBlocked: false, isWaitingOnDependency: false, checklistItems: [],
  mechanismIds: [], partInstanceIds: [], targetEventId: null,
};
const blocked: Task = { ...ready, id: "blocked", title: "Blocked", blockers: ["Supply"], isBlocked: true };
const waiting: Task = { ...ready, id: "waiting", title: "Wait", isBlocked: true, isWaitingOnDependency: true, };
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
    result.current.setFilter("taskSearch", "Ada");
    result.current.setFilter("taskBlockerFilter", "over-estimate");
  });
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["ready"]);
  expect(result.current.taskSummary).toContainEqual({ label: "Logged", value: "3.0h" });
  act(() => result.current.setFilter("taskPriorityFilter", "high"));
  expect(result.current.filteredTaskQueue).toEqual([]);
  act(() => result.current.resetFilters());
  expect(result.current.filteredTaskQueue).toHaveLength(3);
  expect(result.current.filters.taskSearch).toBe("");
  expect(result.current.filters.taskPriorityFilter).toBe("all");
});

test.each([
  ["blocked", ["blocked"]], ["dependency-wait", ["waiting"]], ["ready-now", ["ready"]],
] as const)("%s selection preserves dependency and readiness behavior", (filter, ids) => {
  const { result } = renderHook(() => useTaskQueue(inputs));
  act(() => result.current.setFilter("taskBlockerFilter", filter));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(ids);
});

test("archive and active-person changes recompute selection from current input", () => {
  const { result, rerender } = renderHook((activePersonFilter: string) => useTaskQueue({ ...inputs, activePersonFilter }), {
    initialProps: "mentor",
  });
  act(() => result.current.setFilter("taskArchiveFilter", () => "archived"));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["complete"]);
  rerender("other-person");
  expect(result.current.filteredTaskQueue).toEqual([]);
});

test("summary counts and readiness selection agree for owned, unassigned, QA and blocked tasks", () => {
  const candidates: Task[] = [
    ready, blocked, waiting, complete,
    { ...ready, id: "unassigned", ownerId: null },
    { ...ready, id: "qa", status: "waiting-for-qa" },
    { ...blocked, id: "blocked-qa", status: "waiting-for-qa" },
  ];
  const { result } = renderHook(() => useTaskQueue({ ...inputs, tasks: candidates }));
  expect(result.current.taskSummary).toEqual(expect.arrayContaining([
    { label: "Ready now", value: "1" },
    { label: "Ready QA", value: "1" },
    { label: "Blocked", value: "2" },
    { label: "Waiting QA", value: "2" },
    { label: "Over est.", value: "1" },
  ]));
  act(() => result.current.setFilter("taskBlockerFilter", "ready-to-qa"));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["qa"]);
  act(() => result.current.setFilter("taskBlockerFilter", "unassigned"));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["unassigned"]);
});

test("due-soon includes today and seven days away, excluding completed and overdue tasks", () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 26, 12));
  try {
    const candidates: Task[] = [
      { ...ready, id: "yesterday", dueDate: "2026-09-25" },
      { ...ready, id: "today", dueDate: "2026-09-26" },
      { ...ready, id: "week", dueDate: "2026-10-03" },
      { ...ready, id: "later", dueDate: "2026-10-04" },
      { ...complete, dueDate: "2026-09-26" },
    ];
    const { result } = renderHook(() => useTaskQueue({ ...inputs, tasks: candidates }));
    act(() => {
      result.current.setFilter("taskArchiveFilter", "all");
      result.current.setFilter("taskBlockerFilter", "due-soon");
    });
    expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["today", "week"]);
    act(() => result.current.setFilter("taskBlockerFilter", "overdue"));
    expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["yesterday"]);
  } finally {
    jest.useRealTimers();
  }
});

test("queue filters and search include secondary subsystem and mechanism targets once", () => {
  const multi = { ...ready, subsystemIds: ["drive", "arm", "arm"], mechanismIds: ["wheel", "wrist"] };
  const { result } = renderHook(() => useTaskQueue({
    ...inputs, tasks: [multi], mechanismsById: {
      wrist: { id: "wrist", name: "Secondary wrist", subsystemId: "arm", description: "" },
    },
  }));
  act(() => result.current.setFilter("taskSubsystemFilter", "arm"));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["ready"]);
  act(() => result.current.setFilter("taskSearch", "Secondary wrist"));
  expect(result.current.filteredTaskQueue.map((task) => task.id)).toEqual(["ready"]);
});
