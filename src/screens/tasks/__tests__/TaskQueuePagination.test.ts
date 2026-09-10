import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { TaskQueueScreen } from "../TaskQueueScreen";
import type { TaskScreenProps } from "../taskScreenTypes";
import type { Task } from "../../../types/domain";

function queueProps(count: number) {
  const tasks = Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`, title: `Measured task ${index}`, summary: "Prepare robot hardware",
    subsystemId: "drive", disciplineId: "mechanical", ownerId: null,
    dueDate: "2026-10-01", status: "not-started", priority: "medium",
    linkedManufacturingIds: [], linkedPurchaseIds: [], blockers: [], checklistItems: [],
    estimatedHours: 1, actualHours: 0, mechanismId: null, partInstanceId: null,
    targetEventId: null, mentorId: null, isBlocked: false, isWaitingOnDependency: false,
  } as Task));
  return {
    activeTaskSubteamLabel: "Mechanical", activeTaskSubteam: "mechanical",
    appResponsiveStyles: {}, themeColors: {}, members: [], membersById: {},
    rosterMentors: [], rosterStudents: [], subsystems: [], subsystemsById: {},
    disciplinesById: {}, mechanismsById: {}, partInstancesById: {}, eventsById: {},
    filteredTaskQueue: tasks, taskQueueSections: [{ id: "queue", title: "Ready", tasks }],
    taskDependencies: [], taskById: {}, taskLoggedHoursById: {}, taskSummary: [], qaReviews: [],
    taskSearch: "", taskArchiveFilter: "active", taskOwnerFilter: "all", taskPriorityFilter: "all",
    taskBlockerFilter: "all", taskStatusFilter: "all", taskSubsystemFilter: "all",
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
  view.rerender(createElement(TaskQueueScreen, { ...queueProps(500), taskSearch: "hardware" }));
  expect(view.getByText("Measured task 0")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Next page" }));
  view.rerender(createElement(TaskQueueScreen, { ...queueProps(5), taskSearch: "hardware" }));
  expect(view.getAllByText(/^Measured task /)).toHaveLength(5);
  expect(view.queryByText("Next page")).toBeNull();
});
