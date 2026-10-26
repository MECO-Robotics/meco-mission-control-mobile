import { fireEvent, render } from "@testing-library/react-native";
import { createElement } from "react";
import { TaskQueueCard } from "../TaskQueueCard";
import type { Milestone, PartDefinition, PartInstance, QaRequest, Risk, Task, TaskDependency } from "../../../types/domain";

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
const partInstance: PartInstance = {
  id: "part-instance", partDefinitionId: "part-definition", intendedSubsystemId: "controls", intendedMechanismId: null,
  location: { kind: "repair", location: "electronics bench" }, readinessStatus: "blocked",
  cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false,
};
const partDefinition: PartDefinition = {
  id: "part-definition", seasonId: "season", activeSeasonIds: ["season"], name: "Encoder bracket", partNumber: "ENC-1", vendorPartNumbers: {},
  revision: "A", iteration: 1, isArchived: false, type: "custom", defaultAcquisitionMethod: "manufacture", materialId: null,
  description: "", cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false,
};
const milestone: Milestone = {
  id: "milestone", seasonId: "season", projectIds: ["robot"], type: "internal-review", title: "Design review",
  startAt: "2026-06-10T12:00:00Z", endAt: null, status: "active", readinessStatus: "blocked", description: "",
};

function renderCard({
  risks = [], taskDependencies = [], taskOverride = {}, qaReports = [], qaRequests = [],
  partInstancesById = {}, milestonesById = {}, canSubmitQa = false,
}: {
  risks?: Risk[];
  taskDependencies?: TaskDependency[];
  taskOverride?: Partial<Task>;
  qaReports?: unknown[];
  qaRequests?: QaRequest[];
  partInstancesById?: Record<string, PartInstance>;
  milestonesById?: Record<string, Milestone>;
  canSubmitQa?: boolean;
} = {}) {
  const openEditTaskEditor = jest.fn();
  const setActiveTab = jest.fn();
  const claimTask = jest.fn(async () => undefined);
  const openCreateWorkLogEditor = jest.fn();
  const requestTaskQa = jest.fn(async () => undefined);
  const openCreateQaReportEditor = jest.fn();
  const view = render(createElement(TaskQueueCard, {
    task: { ...task, ...taskOverride },
    actions: { onOpenHelpRequest: jest.fn(), onOpenQaReview: jest.fn(), onOpenReassign: jest.fn() },
    context: {
      appResponsiveStyles: {}, canReassignTasks: false, canSubmitQa, claimTask, workTypesById: {}, editTagStyle: {}, eventsById: {},
      workstreamsById: {}, isLandscapeCardLayout: false, mechanismsById: {}, milestonesById, membersById: {}, openCreateQaReportEditor,
      openCreateWorkLogEditor, openEditTaskEditor, partInstancesById, partDefinitionsById: { [partDefinition.id]: partDefinition }, qaRequests, qaReports,
      releaseTask: jest.fn(), requestTaskQa, signedInMember: { id: "member", role: "student" } as never, startTask: jest.fn(),
      subsystemsById: {}, taskById: { [dependency.id]: dependency }, taskDependencies, taskLoggedHoursById: {}, themeColors: {} as never,
      risks, setActiveTab,
    } as never,
  }));
  return { ...view, openEditTaskEditor, openCreateQaReportEditor, openCreateWorkLogEditor, requestTaskQa, setActiveTab, claimTask };
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

test("dependency-sourced risk resolves to its task and preserves blocking-task navigation", () => {
  const dependencyRisk: Risk = {
    ...blocker, id: "dependency-risk", title: "Connector dependency risk",
    source: { kind: "task-dependency", id: edge.id }, relatedTargets: [],
  };
  const { getByText, openEditTaskEditor } = renderCard({ risks: [dependencyRisk], taskDependencies: [edge] });
  expect(getByText("Connector dependency risk")).toBeTruthy();
  expect(getByText("The wire gauge is not confirmed.")).toBeTruthy();
  fireEvent.press(getByText("Open blocking task"));
  expect(openEditTaskEditor).toHaveBeenCalledWith(dependency);
});

test("risk related to a task dependency resolves to the owning task", () => {
  const dependencyRisk: Risk = {
    ...blocker, id: "related-dependency-risk", title: "Related dependency risk",
    source: { kind: "manual" }, relatedTargets: [{ kind: "task-dependency", id: edge.id }],
  };
  const { getByText } = renderCard({ risks: [dependencyRisk], taskDependencies: [edge] });
  expect(getByText("Related dependency risk")).toBeTruthy();
});

test("unrelated and resolved dependency-sourced risks are omitted", () => {
  const { queryByText } = renderCard({ risks: [
    { ...blocker, id: "unrelated-edge-risk", title: "Unrelated edge risk", source: { kind: "task-dependency", id: "other-edge" }, relatedTargets: [] },
    { ...blocker, id: "resolved-edge-risk", title: "Resolved edge risk", source: { kind: "task-dependency", id: edge.id }, relatedTargets: [], status: "resolved" },
  ], taskDependencies: [edge] });
  expect(queryByText("Unrelated edge risk")).toBeNull();
  expect(queryByText("Resolved edge risk")).toBeNull();
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

test.each(["draft", "submitted", "reviewed"] as const)("%s QA history does not control eligible in-progress actions", (status) => {
  const { getByText, openCreateWorkLogEditor, requestTaskQa } = renderCard({
    taskOverride: { status: "in-progress", isBlocked: false, ownerId: "member", assigneeIds: ["member"], mentorId: "mentor" },
    qaReports: [{ id: `qa-${status}`, targetRefs: [{ kind: "task", id: task.id }], status }],
  });
  expect(getByText("Log work")).toBeTruthy();
  expect(getByText("Request QA")).toBeTruthy();
  expect(getByText("QA report")).toBeTruthy();
  fireEvent.press(getByText("Log work"));
  fireEvent.press(getByText("Request QA"));
  expect(openCreateWorkLogEditor).toHaveBeenCalledWith(task.id);
  expect(requestTaskQa).toHaveBeenCalledWith(expect.objectContaining({ id: task.id }));
});

test("pending QA request prevents a duplicate request while current work remains loggable", () => {
  const request: QaRequest = {
    id: "request", projectId: "robot", targetRefs: [{ kind: "task", id: task.id }], subject: "Review work",
    requestedById: "member", mentorId: "mentor", createdAt: "2026-06-01", status: "in-review",
  };
  const { getByText, queryByText, openCreateWorkLogEditor } = renderCard({
    taskOverride: { status: "in-progress", isBlocked: false, ownerId: "member" }, qaRequests: [request],
  });
  expect(getByText("Log work")).toBeTruthy();
  expect(queryByText("Request QA")).toBeNull();
  fireEvent.press(getByText("Log work"));
  expect(openCreateWorkLogEditor).toHaveBeenCalledWith(task.id);
});

test.each(["complete", "cancelled"] as const)("Write QA report uses the active request after a %s history record", (historicalStatus) => {
  const request = (id: string, status: QaRequest["status"]): QaRequest => ({
    id, projectId: "robot", targetRefs: [{ kind: "task", id: task.id }], subject: id,
    requestedById: `${id}-requester`, mentorId: `${id}-mentor`, createdAt: "2026-06-01", status,
  });
  const activeRequest = request("active-request", "in-review");
  const { getByText, openCreateQaReportEditor, queryByText } = renderCard({
    canSubmitQa: true, taskOverride: { status: "waiting-for-qa" },
    qaRequests: [request(`historical-${historicalStatus}`, historicalStatus), activeRequest],
  });
  expect(queryByText("Request QA")).toBeNull();
  fireEvent.press(getByText("Write QA report"));
  expect(openCreateQaReportEditor).toHaveBeenCalledWith(task.id, activeRequest.id);
});

test("Write QA report does not pass a completed historical request when no active request exists", () => {
  const historicalRequest: QaRequest = {
    id: "historical-request", projectId: "robot", targetRefs: [{ kind: "task", id: task.id }], subject: "Previous cycle",
    requestedById: "old-requester", mentorId: "old-mentor", createdAt: "2026-06-01", status: "complete",
  };
  const { getByText, openCreateQaReportEditor } = renderCard({
    canSubmitQa: true, taskOverride: { status: "waiting-for-qa" }, qaRequests: [historicalRequest],
  });
  fireEvent.press(getByText("Write QA report"));
  expect(openCreateQaReportEditor).toHaveBeenCalledWith(task.id, undefined);
});

test("blocked in-progress task keeps work logging and gates QA requests", () => {
  const { getByText, queryByText, openCreateWorkLogEditor } = renderCard({
    taskOverride: { status: "in-progress", isBlocked: true, ownerId: "member" },
    qaReports: [{ id: "draft", targetRefs: [{ kind: "task", id: task.id }], status: "draft" }],
  });
  expect(getByText("Log work")).toBeTruthy();
  expect(queryByText("Request QA")).toBeNull();
  expect(queryByText("QA report")).toBeTruthy();
  fireEvent.press(getByText("Log work"));
  expect(openCreateWorkLogEditor).toHaveBeenCalledWith(task.id);
});

test.each(["not-started", "waiting-for-qa"] as const)("%s task keeps work logging available while QA request stays gated", (status) => {
  const { getByText, queryByText, openCreateWorkLogEditor } = renderCard({ taskOverride: { status, isBlocked: false, isWaitingOnDependency: false } });
  expect(getByText("Log work")).toBeTruthy();
  expect(queryByText("Request QA")).toBeNull();
  fireEvent.press(getByText("Log work"));
  expect(openCreateWorkLogEditor).toHaveBeenCalledWith(task.id);
});

test("completed task keeps the existing read-only work-log policy", () => {
  const { queryByText } = renderCard({ taskOverride: { status: "complete", isBlocked: false, isWaitingOnDependency: false } });
  expect(queryByText("Log work")).toBeNull();
  expect(queryByText("Request QA")).toBeNull();
});

test("hard derived-readiness dependency shows the part instance, condition and inventory destination", () => {
  const partEdge: TaskDependency = {
    id: "part-edge", taskId: task.id, kind: "part-instance", refId: partInstance.id,
    requiredCondition: { kind: "derived-readiness", value: "ready" }, dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { getByText, setActiveTab } = renderCard({
    taskOverride: { isWaitingOnDependency: true }, taskDependencies: [partEdge],
    partInstancesById: { [partInstance.id]: partInstance },
  });
  expect(getByText("Encoder bracket · instance part-instance")).toBeTruthy();
  expect(getByText("Required derived readiness: ready · Current derived readiness: blocked")).toBeTruthy();
  fireEvent.press(getByText("View part inventory"));
  expect(setActiveTab).toHaveBeenCalledWith("resources-parts");
});

test("part readiness above a required QA threshold is satisfied", () => {
  const partEdge: TaskDependency = {
    id: "part-qa-edge", taskId: task.id, kind: "part-instance", refId: partInstance.id,
    requiredCondition: { kind: "derived-readiness", value: "qa" }, dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { queryByText } = renderCard({
    taskOverride: { isBlocked: false, isWaitingOnDependency: false }, taskDependencies: [partEdge],
    partInstancesById: { [partInstance.id]: { ...partInstance, readinessStatus: "ready" } },
  });
  expect(queryByText("Waiting on dependencies")).toBeNull();
});

test("part readiness below a required QA threshold remains unresolved", () => {
  const partEdge: TaskDependency = {
    id: "part-qa-edge", taskId: task.id, kind: "part-instance", refId: partInstance.id,
    requiredCondition: { kind: "derived-readiness", value: "ready" }, dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { getByText } = renderCard({
    taskOverride: { isWaitingOnDependency: true }, taskDependencies: [partEdge],
    partInstancesById: { [partInstance.id]: { ...partInstance, readinessStatus: "qa" } },
  });
  expect(getByText("Required derived readiness: ready · Current derived readiness: qa")).toBeTruthy();
});

test("hard physical-location dependency shows the actual location and required location", () => {
  const partEdge: TaskDependency = {
    id: "part-location-edge", taskId: task.id, kind: "part-instance", refId: partInstance.id,
    requiredCondition: { kind: "physical-location", value: "stock" }, dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { getByText } = renderCard({ taskOverride: { isWaitingOnDependency: true }, taskDependencies: [partEdge], partInstancesById: { [partInstance.id]: partInstance } });
  expect(getByText("Required physical location: stock · Current physical location: repair · electronics bench")).toBeTruthy();
});

test("hard milestone dependency shows readiness context and opens schedule", () => {
  const milestoneEdge: TaskDependency = {
    id: "milestone-edge", taskId: task.id, kind: "milestone", refId: milestone.id,
    requiredState: "ready", dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { getByText, setActiveTab } = renderCard({ taskOverride: { isWaitingOnDependency: true }, taskDependencies: [milestoneEdge], milestonesById: { [milestone.id]: milestone } });
  expect(getByText("Design review")).toBeTruthy();
  expect(getByText("Required readiness: ready · Current readiness: blocked · Milestone status: active")).toBeTruthy();
  fireEvent.press(getByText("View schedule"));
  expect(setActiveTab).toHaveBeenCalledWith("work-schedule");
});

test("milestone readiness above a required QA threshold is satisfied", () => {
  const milestoneEdge: TaskDependency = {
    id: "milestone-qa-edge", taskId: task.id, kind: "milestone", refId: milestone.id,
    requiredState: "qa", dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { queryByText } = renderCard({
    taskOverride: { isBlocked: false, isWaitingOnDependency: false }, taskDependencies: [milestoneEdge],
    milestonesById: { [milestone.id]: { ...milestone, readinessStatus: "ready" } },
  });
  expect(queryByText("Waiting on dependencies")).toBeNull();
});

test("milestone readiness below a required QA threshold remains unresolved", () => {
  const milestoneEdge: TaskDependency = {
    id: "milestone-qa-edge", taskId: task.id, kind: "milestone", refId: milestone.id,
    requiredState: "qa", dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { getByText } = renderCard({
    taskOverride: { isWaitingOnDependency: true }, taskDependencies: [milestoneEdge],
    milestonesById: { [milestone.id]: { ...milestone, readinessStatus: "blocked" } },
  });
  expect(getByText("Required readiness: qa · Current readiness: blocked · Milestone status: active")).toBeTruthy();
});

test("missing part dependency reference is explicit and has no dead destination", () => {
  const partEdge: TaskDependency = {
    id: "missing-part-edge", taskId: task.id, kind: "part-instance", refId: "missing-part",
    requiredCondition: { kind: "derived-readiness", value: "ready" }, dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { getByText, queryByText, setActiveTab } = renderCard({ taskOverride: { isWaitingOnDependency: true }, taskDependencies: [partEdge] });
  expect(getByText("Part instance unavailable (missing-part)")).toBeTruthy();
  expect(getByText("Required derived readiness: ready · Current derived readiness: unavailable")).toBeTruthy();
  expect(queryByText("View part inventory")).toBeNull();
  expect(setActiveTab).not.toHaveBeenCalled();
});

test("missing milestone dependency reference is explicit and has no dead destination", () => {
  const milestoneEdge: TaskDependency = {
    id: "missing-milestone-edge", taskId: task.id, kind: "milestone", refId: "missing-milestone",
    requiredState: "ready", dependencyType: "hard", createdAt: "2026-06-01",
  };
  const { getByText, queryByText, setActiveTab } = renderCard({ taskOverride: { isWaitingOnDependency: true }, taskDependencies: [milestoneEdge] });
  expect(getByText("Milestone unavailable (missing-milestone)")).toBeTruthy();
  expect(getByText("Required readiness: ready · Current readiness: unavailable")).toBeTruthy();
  expect(queryByText("View schedule")).toBeNull();
  expect(setActiveTab).not.toHaveBeenCalled();
});
