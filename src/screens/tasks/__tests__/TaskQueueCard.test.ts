import { fireEvent, render } from "@testing-library/react-native";
import { createElement } from "react";
import { TaskQueueCard } from "../TaskQueueCard";
import type { Risk, Task, TaskDependency } from "../../../types/domain";

const task: Task = {
  actualHours: 0, projectId: "robot", workTypeId: "programming", responsibleGroupId: "programming", dueDate: "2026-06-10", estimatedHours: 2,
  id: "task", isBlocked: true, isWaitingOnDependency: false, checklistItems: [], scheduleRefs: [], manufacturingDetails: null,
  mechanismIds: [], mentorId: null, ownerId: null, requestedById: null, assigneeIds: [], partInstanceIds: [], priority: "medium", status: "not-started",
  workstreamIds: [], subsystemIds: ["controls"], summary: "Task summary.", title: "Task", startDate: "2026-06-01", requiresDocumentation: false,
};
const blocker: Risk = {
  id: "risk", projectId: "robot", title: "Unresolved wiring risk", detail: "The wire gauge is not confirmed.", category: "manufacturing", severity: "high",
  status: "open", blocksWork: true, source: { kind: "task", id: task.id }, relatedTargets: [{ kind: "task", id: task.id }],
  mitigationTaskId: null, ownerGroupId: null, ownerMemberId: null, mitigationDueDate: null, createdAt: "2026-06-01", updatedAt: "2026-06-01", resolvedAt: null,
};
const dependency: Task = { ...task, id: "dependency", title: "Confirm connector", isBlocked: false, status: "in-progress" };
const edge: TaskDependency = { id: "edge", taskId: task.id, kind: "task", refId: dependency.id, requiredState: "complete", dependencyType: "hard", createdAt: "2026-06-01" };

function renderCard({ risks = [], taskDependencies = [] }: { risks?: Risk[]; taskDependencies?: TaskDependency[] } = {}) {
  const openEditTaskEditor = jest.fn();
  const setActiveTab = jest.fn();
  const claimTask = jest.fn(async () => undefined);
  const view = render(createElement(TaskQueueCard, {
    task,
    actions: { onOpenHelpRequest: jest.fn(), onOpenQaReview: jest.fn(), onOpenReassign: jest.fn() },
    context: {
      appResponsiveStyles: {}, canReassignTasks: false, canSubmitQa: false, claimTask, workTypesById: {}, editTagStyle: {}, eventsById: {},
      workstreamsById: {}, isLandscapeCardLayout: false, mechanismsById: {}, membersById: {}, openCreateQaReportEditor: jest.fn(),
      openCreateWorkLogEditor: jest.fn(), openEditTaskEditor, partInstancesById: {}, partDefinitionsById: {}, qaRequests: [], qaReports: [],
      releaseTask: jest.fn(), requestTaskQa: jest.fn(), signedInMember: { id: "member", role: "student" } as never, startTask: jest.fn(),
      subsystemsById: {}, taskById: { [dependency.id]: dependency }, taskDependencies, taskLoggedHoursById: {}, themeColors: {} as never,
      risks, setActiveTab,
    } as never,
  }));
  return { ...view, openEditTaskEditor, setActiveTab, claimTask };
}

test("risk-only blocked task opens the risk register with blocker context shown", () => {
  const { getByText, setActiveTab, openEditTaskEditor } = renderCard({ risks: [blocker] });
  expect(getByText("Unresolved wiring risk")).toBeTruthy();
  expect(getByText("The wire gauge is not confirmed.")).toBeTruthy();
  fireEvent.press(getByText("View blocking risk"));
  expect(setActiveTab).toHaveBeenCalledWith("work-risks");
  expect(openEditTaskEditor).not.toHaveBeenCalled();
});

test("hard dependency action still opens the blocking task", () => {
  const { getByText, openEditTaskEditor, setActiveTab } = renderCard({ taskDependencies: [edge] });
  fireEvent.press(getByText("Open blocking task"));
  expect(openEditTaskEditor).toHaveBeenCalledWith(dependency);
  expect(setActiveTab).not.toHaveBeenCalled();
});

test("mixed blockers show risk context and preserve dependency navigation", () => {
  const { getByText, openEditTaskEditor } = renderCard({ risks: [blocker], taskDependencies: [edge] });
  expect(getByText("Unresolved wiring risk")).toBeTruthy();
  fireEvent.press(getByText("Open blocking task"));
  expect(openEditTaskEditor).toHaveBeenCalledWith(dependency);
});

test("blocked task without linked blocker details has no misleading blocker action", () => {
  const { queryByText, getByText, setActiveTab, openEditTaskEditor } = renderCard();
  expect(getByText("No linked blocker details are available.")).toBeTruthy();
  expect(queryByText("View dependencies")).toBeNull();
  expect(queryByText("View blocking risk")).toBeNull();
  expect(setActiveTab).not.toHaveBeenCalled();
  expect(openEditTaskEditor).not.toHaveBeenCalled();
});

test("resolved, non-blocking, and unrelated risks do not appear as blockers", () => {
  const { queryByText, getByText, setActiveTab } = renderCard({ risks: [
    { ...blocker, id: "resolved", status: "resolved" },
    { ...blocker, id: "non-blocking", blocksWork: false },
    { ...blocker, id: "unrelated", source: { kind: "task", id: "another-task" }, relatedTargets: [] },
  ] });
  expect(getByText("No linked blocker details are available.")).toBeTruthy();
  expect(queryByText("View blocking risk")).toBeNull();
  expect(setActiveTab).not.toHaveBeenCalled();
});

test("claim action does not open the task editor", () => {
  const { getByText, claimTask, openEditTaskEditor } = renderCard({ risks: [blocker] });
  fireEvent.press(getByText("Claim only"));
  expect(claimTask).toHaveBeenCalledWith(task);
  expect(openEditTaskEditor).not.toHaveBeenCalled();
});
