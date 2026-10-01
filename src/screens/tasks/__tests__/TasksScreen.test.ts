import { createElement } from "react";
import { render } from "@testing-library/react-native";

import { TasksScreen } from "../TasksScreen";
import type { TaskScreenProps } from "../taskScreenTypes";
import { TaskQueueScreen } from "../TaskQueueScreen";
import { TaskTimelineScreen } from "../TaskTimelineScreen";
import { ScheduleAgendaScreen } from "../ScheduleAgendaScreen";
import { LandscapeSubsystemTimeline } from "../../../ui/landscapeTimeline/LandscapeSubsystemTimeline";
import { DropdownField } from "../../../ui/ui";
import { ScheduleCalendarScreen } from "../ScheduleCalendarScreen";

jest.mock("../TaskQueueScreen", () => ({ TaskQueueScreen: jest.fn(() => null) }));
jest.mock("../TaskTimelineScreen", () => ({ TaskTimelineScreen: jest.fn(() => null) }));
jest.mock("../ScheduleAgendaScreen", () => ({ ScheduleAgendaScreen: jest.fn(() => null) }));
jest.mock("../ScheduleCalendarScreen", () => ({ ScheduleCalendarScreen: jest.fn(() => null) }));
jest.mock("../../../ui/landscapeTimeline/LandscapeSubsystemTimeline", () => ({
  LandscapeSubsystemTimeline: jest.fn(() => null),
}));
jest.mock("../../../ui/ui", () => ({ DropdownField: jest.fn(() => null) }));

// Child screens are mocked: this fixture intentionally supplies only the router's inputs.
function routerProps(workspaceView: TaskScreenProps["workspaceView"], landscape = false) {
  return {
    workspaceView,
    isLandscapeTimelineLayout: landscape,
    activeResponsibleGroupId: "programming",
    responsibleGroups: [{ id: "programming", seasonId: "season", name: "Programming", projectIds: [], memberIds: [], isArchived: false }],
    events: [],
    subsystems: [],
    timelineTasks: [],
    tasks: [],
    openCreateDeadlineEditor: jest.fn(),
    openCreateTaskEditor: jest.fn(),
    openEditTaskEditor: jest.fn(),
    setActiveResponsibleGroupId: jest.fn(),
    themeColors: {},
  } as unknown as TaskScreenProps;
}

beforeEach(() => jest.clearAllMocks());

test.each([
  [{ domain: "kanban", view: "queue" }, TaskQueueScreen, false],
  [{ domain: "schedule", presentation: "timeline" }, TaskTimelineScreen, true],
  [{ domain: "schedule", presentation: "agenda" }, ScheduleAgendaScreen, false],
  [{ domain: "schedule", presentation: "calendar" }, ScheduleCalendarScreen, false],
] as const)("routes %s and shows responsible group as a filter", (view, child, tabsVisible) => {
  render(createElement(TasksScreen, routerProps(view)));
  expect(child).toHaveBeenCalledTimes(1);
  expect(DropdownField).toHaveBeenCalledTimes(tabsVisible ? 1 : 0);
  expect(LandscapeSubsystemTimeline).not.toHaveBeenCalled();
  for (const other of [TaskQueueScreen, TaskTimelineScreen, ScheduleAgendaScreen, ScheduleCalendarScreen]) {
    if (other !== child) expect(other).not.toHaveBeenCalled();
  }
});

test("landscape routes to planner with the original task and deadline commands", () => {
  const props = routerProps({ domain: "schedule", presentation: "timeline" }, true);
  render(createElement(TasksScreen, props));
  expect(LandscapeSubsystemTimeline).toHaveBeenCalledWith(expect.objectContaining({
    tasks: props.timelineTasks,
    onAddDeadline: props.openCreateDeadlineEditor,
    onAddTask: props.openCreateTaskEditor,
    onTaskPress: props.openEditTaskEditor,
  }), undefined);
  expect(TaskQueueScreen).not.toHaveBeenCalled();
  expect(DropdownField).not.toHaveBeenCalled();
});

test("rotating the task queue keeps execution actions on the queue", () => {
  render(createElement(TasksScreen, routerProps({ domain: "kanban", view: "queue" }, true)));
  expect(TaskQueueScreen).toHaveBeenCalledTimes(1);
  expect(LandscapeSubsystemTimeline).not.toHaveBeenCalled();
});

test("rotating the agenda does not replace events with the task timeline", () => {
  render(createElement(TasksScreen, routerProps({ domain: "schedule", presentation: "agenda" }, true)));
  expect(ScheduleAgendaScreen).toHaveBeenCalledTimes(1);
  expect(LandscapeSubsystemTimeline).not.toHaveBeenCalled();
});
