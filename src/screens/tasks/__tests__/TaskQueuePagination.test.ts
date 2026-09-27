import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { TaskQueueScreen } from "../TaskQueueScreen";
import type { TaskScreenProps } from "../taskScreenTypes";
import { useTaskQueue } from "../useTaskQueue";
import type { Task } from "../../../types/domain";

function queueProps(count: number, taskSearch = "") {
  const tasks = Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`, title: `Measured task ${index}`, summary: "Prepare robot hardware",
    workstreamIds: [], artifactIds: [], subsystemIds: ["drive"], disciplineId: "mechanical", ownerId: null,
    dueDate: "2026-10-01", status: "not-started", priority: "medium",
    linkedManufacturingIds: [], linkedPurchaseIds: [], blockers: [], checklistItems: [],
    estimatedHours: 1, actualHours: 0, mechanismIds: [], partInstanceIds: [],
    targetEventId: null, mentorId: null, isBlocked: false, isWaitingOnDependency: false,
  } as Task));
  return {
    activeTaskSubteamLabel: "Mechanical", activeTaskSubteam: "mechanical",
    appResponsiveStyles: {}, themeColors: {}, members: [], membersById: {},
    rosterMentors: [], rosterStudents: [], subsystems: [], subsystemsById: {},
    disciplinesById: {}, mechanismsById: {}, partInstancesById: {}, eventsById: {},
    queue: { filteredTaskQueue: tasks, taskQueueSections: [{ id: "queue", title: "Ready", tasks }],
    taskSummary: [], setFilter: jest.fn(), resetFilters: jest.fn(),
    filters: { taskSearch, taskArchiveFilter: "active", taskOwnerFilter: "all", taskPriorityFilter: "all",
    taskBlockerFilter: "all", taskStatusFilter: "all", taskSubsystemFilter: "all" } },
    taskDependencies: [], taskById: {}, taskLoggedHoursById: {}, qaReviews: [],
  } as unknown as TaskScreenProps;
}

test("measures actual large task queue mount", () => {
  const started = performance.now();
  const view = render(createElement(TaskQueueScreen, queueProps(500)));
  const mounted = view.getAllByText(/^Measured task /).length;
  console.log(JSON.stringify({ tasks: 500, mounted, renderMs: Math.round(performance.now() - started) }));
  expect(mounted).toBe(30);
  fireEvent.press(view.getByRole("button", { name: "Next page" }));
  expect(view.queryByText("Measured task 0")).toBeNull();
  expect(view.getByText("Measured task 30")).toBeTruthy();
  view.rerender(createElement(TaskQueueScreen, queueProps(500, "hardware")));
  expect(view.getByText("Measured task 0")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Next page" }));
  view.rerender(createElement(TaskQueueScreen, queueProps(5, "hardware")));
  expect(view.getAllByText(/^Measured task /)).toHaveLength(5);
  expect(view.queryByText("Next page")).toBeNull();
});

test("search and both reset controls restore the first page without changing the person filter", () => {
  function Queue() {
    const props = queueProps(40);
    const tasks = props.queue.filteredTaskQueue.map((task) => ({ ...task, ownerId: "student" }));
    tasks.push({ ...tasks[0], id: "other", title: "Another person's task", ownerId: "other" });
    const queue = useTaskQueue({ tasks, activePersonFilter: "student", activeTaskSubteam: "mechanical",
      canMentorApprove: false, taskLoggedHoursById: {}, membersById: {}, mechanismsById: {}, subsystemsById: {} });
    return createElement(TaskQueueScreen, { ...props, queue });
  }
  const view = render(createElement(Queue));
  fireEvent.press(view.getByRole("button", { name: "Next page" }));
  expect(view.queryByText("Measured task 0")).toBeNull();
  fireEvent.press(view.getByText("Filters"));
  fireEvent.changeText(view.getByPlaceholderText("Search tasks"), "no match");
  fireEvent.press(view.getByText("Done"));
  expect(view.getByText("No matching tasks")).toBeTruthy();
  fireEvent.press(view.getByText("Reset filters"));
  expect(view.getByText("Measured task 0")).toBeTruthy();
  expect(view.queryByText("Another person's task")).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Next page" }));
  fireEvent.press(view.getByText("Filters"));
  fireEvent.changeText(view.getByPlaceholderText("Search tasks"), "Measured task 1");
  fireEvent.press(view.getByText("Reset filters"));
  fireEvent.press(view.getByText("Done"));
  expect(view.getByText("Measured task 0")).toBeTruthy();
  expect(view.queryByText("Another person's task")).toBeNull();
});
