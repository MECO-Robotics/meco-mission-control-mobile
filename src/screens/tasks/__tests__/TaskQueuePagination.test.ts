import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { TaskQueueScreen } from "../TaskQueueScreen";
import type { TaskScreenProps } from "../taskScreenTypes";
import { useTaskQueue } from "../useTaskQueue";
import { makeTask } from "../../../data/__tests__/fixtures/factories";
import { localTodayDate, shiftDateByDays } from "../../../ui/helpers";

function queueProps(count: number, taskSearch = "", dueDate = "2026-10-01") {
  const tasks = Array.from({ length: count }, (_, index) => makeTask({
    id: `task-${index}`, title: `Measured task ${index}`, summary: "Prepare robot hardware", subsystemIds: ["drive"], ownerId: null,
    dueDate, status: "not-started", priority: "medium", estimatedHours: 1, actualHours: 0,
  }));
  return {
    activeResponsibleGroupLabel: "Robot Build", activeResponsibleGroupId: "robot-build", responsibleGroups: [{ id: "robot-build", seasonId: "season", name: "Robot Build", projectIds: ["robot-project"], memberIds: [], isArchived: false }],
    appResponsiveStyles: {}, themeColors: {}, members: [], membersById: {},
    rosterMentors: [], rosterStudents: [], subsystems: [], subsystemsById: {},
    workTypesById: {}, mechanismsById: {}, partInstancesById: {}, eventsById: {},
    queue: { filteredTaskQueue: tasks, taskQueueSections: [{ id: "queue", title: "Ready", tasks }],
    taskSummary: [], setFilter: jest.fn(), resetFilters: jest.fn(),
    filters: { taskSearch, taskArchiveFilter: "active", taskOwnerFilter: "all", taskPriorityFilter: "all",
    taskBlockerFilter: "all", taskStatusFilter: "all", taskSubsystemFilter: "all" } },
    taskDependencies: [], taskById: {}, taskLoggedHoursById: {}, qaReports: [],
  } as unknown as TaskScreenProps;
}

test("due-soon pill includes the seventh local calendar day east of UTC", () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = "Australia/Sydney";
    const seventhDay = shiftDateByDays(localTodayDate(), 7);
    const view = render(createElement(TaskQueueScreen, queueProps(1, "", seventhDay)));
    expect(view.getByText("Due soon")).toBeTruthy();
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

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
    const queue = useTaskQueue({ tasks, activePersonFilter: "student", activeResponsibleGroupId: "robot-build", responsibleGroups: [{ id: "robot-build", seasonId: "season", name: "Robot Build", projectIds: ["robot-project"], memberIds: [], isArchived: false }], purchaseTaskIds: new Set(),
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
