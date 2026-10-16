import { createElement, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { makeTask } from "../../../data/__tests__/fixtures/factories";
import { mecoSnapshot } from "../../../data/__tests__/fixtures/mockData";
import type { QaReport } from "../../../types/domain";
import { TaskQueueScreen } from "../TaskQueueScreen";

jest.mock("../../../i18n", () => ({ Text: jest.requireActual("react-native").Text }));
jest.mock("../../../ui/ui", () => {
  const ReactModule = jest.requireActual<typeof import("react")>("react");
  const { Text, View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    EditorModal: ({ title, visible, children }: { title: string; visible: boolean; children: ReactNode }) =>
      visible ? ReactModule.createElement(View, null, ReactModule.createElement(Text, null, title), children) : null,
    InteractionNote: () => null,
    StatusPill: ({ label }: { label: string }) => ReactModule.createElement(Text, null, label),
    SummaryRow: () => null,
    WorkspacePanel: ({ children }: { children: ReactNode }) => ReactModule.createElement(View, null, children),
  };
});
jest.mock("../../../ui/Callout", () => ({ Callout: () => null }));
jest.mock("../TaskQueueCard", () => {
  const ReactModule = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    TaskQueueCard: ({ task, actions }: { task: { id: string }; actions: { onOpenQaReview: (task: { id: string }) => void } }) =>
      ReactModule.createElement(Pressable, { onPress: () => actions.onOpenQaReview(task) },
        ReactModule.createElement(Text, null, "Open QA report")),
  };
});
jest.mock("../../help/NeedHelpModal", () => ({ NeedHelpModal: () => null }));
jest.mock("../../taskQueue/TaskQueueFilterSheet", () => ({ TaskQueueFilterSheet: () => null }));
jest.mock("../../taskQueue/TaskReassignModal", () => ({ TaskReassignModal: () => null }));

function renderTaskQueueDetail(currentRevision: string, qaReports?: QaReport[]) {
  const task = makeTask({ id: "task-qa", title: "Inspect gearbox", status: "in-progress" });
  const review: QaReport = {
    id: "qa-task-review", projectId: task.projectId, targetRefs: [{ kind: "task", id: task.id }],
    createdByMemberId: "student", participantIds: ["student"], mentorId: "mentor", requestedById: "student",
    summary: "Gearbox inspection", notes: "Recorded inspection notes.", createdAt: "2026-10-10", status: "reviewed",
    reportType: "qa", result: "pass", reviewedById: "reviewer", reviewedAt: "2026-10-11",
    targetRevisions: { "part-1": "revision-1" },
  };
  const partDefinition = { ...mecoSnapshot.partDefinitions[0], id: "part-1", revision: currentRevision };
  const view = render(createElement(TaskQueueScreen, {
    queue: {
      filteredTaskQueue: [task], taskQueueSections: [{ id: "tasks", title: "Tasks", totalTasks: 1, tasks: [task] }],
      taskSummary: [], filters: {}, resetFilters: jest.fn(),
    },
    activeResponsibleGroupId: "robot-build", activeResponsibleGroupLabel: "Robot Build", responsibleGroups: [],
    appResponsiveStyles: {}, canReassignTasks: false, canSubmitQa: false, claimTask: jest.fn(),
    workTypesById: {}, workstreamsById: {}, editTagStyle: {}, eventsById: {}, isCompactLayout: true, isLandscapeCardLayout: false,
    mechanismsById: {}, milestonesById: {}, members: [], membersById: {
      reviewer: { id: "reviewer", name: "QA reviewer" },
      "older-reviewer": { id: "older-reviewer", name: "Earlier QA reviewer" },
      "newest-reviewer": { id: "newest-reviewer", name: "Latest QA reviewer" },
    },
    openCreateTaskEditor: jest.fn(), openCreateWorkLogEditor: jest.fn(), openEditTaskEditor: jest.fn(),
    partInstancesById: {}, partDefinitionsById: { "part-1": partDefinition }, requestHelp: jest.fn(async () => false),
    requestTaskQa: jest.fn(), reassignTask: jest.fn(), releaseTask: jest.fn(), rosterMentors: [], rosterStudents: [],
    setActiveResponsibleGroupId: jest.fn(), qaRequests: [], openCreateQaReportEditor: jest.fn(), signedInMember: null,
    startTask: jest.fn(), subsystems: [], subsystemsById: {}, taskById: { [task.id]: task }, taskDependencies: [],
    taskLoggedHoursById: {}, risks: [], setActiveTab: jest.fn(), themeColors: {}, qaReports: qaReports ?? [review],
  } as never));
  fireEvent.press(view.getByText("Open QA report"));
  return view;
}

test.each([
  ["revision-1", "Current for the recorded part definitions."],
  ["revision-2", "Stale: one or more part definitions have changed since this review."],
])("task queue QA detail compares recorded evidence with current revision %s", (currentRevision, expectedFreshness) => {
  const view = renderTaskQueueDetail(currentRevision);
  expect(view.getByText("QA reviewer")).toBeTruthy();
  expect(view.getByText(expectedFreshness)).toBeTruthy();
});

test("task queue opens the newest task QA report regardless of bootstrap array order", () => {
  const report = (overrides: Partial<QaReport>): QaReport => ({
    id: "qa-report", projectId: "robot", targetRefs: [{ kind: "task", id: "task-qa" }],
    createdByMemberId: "student", participantIds: ["student"], mentorId: "mentor", requestedById: "student",
    summary: "QA cycle", notes: "Review notes", evidenceNotes: "Cycle evidence", createdAt: "2026-10-10",
    status: "reviewed", reportType: "qa", result: "pass", reviewedById: "reviewer", reviewedAt: "2026-10-11",
    targetRevisions: { "part-1": "revision-1" }, ...overrides,
  });
  const olderReport = report({
    id: "older-report", summary: "Earlier cycle", notes: "Earlier review notes", evidenceNotes: "Earlier evidence",
    reviewedById: "older-reviewer", reviewOrder: 1, targetRevisions: { "part-1": "revision-1" },
  });
  const newestReport = report({
    id: "newest-report", summary: "Latest cycle", notes: "Latest review notes", evidenceNotes: "Latest evidence",
    reviewedById: "newest-reviewer", reviewOrder: 2, targetRevisions: { "part-1": "revision-2" },
  });
  const view = renderTaskQueueDetail("revision-2", [olderReport, newestReport]);

  expect(view.getAllByText("Latest cycle")).toHaveLength(2);
  expect(view.getByText("Latest QA reviewer")).toBeTruthy();
  expect(view.getByText("Latest review notes")).toBeTruthy();
  expect(view.getByText("Latest evidence")).toBeTruthy();
  expect(view.getByText("Current for the recorded part definitions.")).toBeTruthy();
  expect(view.queryByText("Earlier cycle")).toBeNull();
});
