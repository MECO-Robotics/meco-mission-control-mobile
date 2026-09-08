import { createElement } from "react";
import { render } from "@testing-library/react-native";

import { TasksScreen } from "../TasksScreen";
import type { TaskScreenProps } from "../taskScreenTypes";
import { TaskQueueScreen } from "../TaskQueueScreen";
import { TaskTimelineScreen } from "../TaskTimelineScreen";
import { TaskMilestonesScreen } from "../TaskMilestonesScreen";
import { LandscapeSubsystemTimeline } from "../../../ui/landscapeTimeline/LandscapeSubsystemTimeline";
import { SectionTabs } from "../../../ui/ui";

jest.mock("../TaskQueueScreen", () => ({ TaskQueueScreen: jest.fn(() => null) }));
jest.mock("../TaskTimelineScreen", () => ({ TaskTimelineScreen: jest.fn(() => null) }));
jest.mock("../TaskMilestonesScreen", () => ({ TaskMilestonesScreen: jest.fn(() => null) }));
jest.mock("../../../ui/landscapeTimeline/LandscapeSubsystemTimeline", () => ({
  LandscapeSubsystemTimeline: jest.fn(() => null),
}));
jest.mock("../../../ui/ui", () => ({ SectionTabs: jest.fn(() => null) }));

// Child screens are mocked: this fixture intentionally supplies only the router's inputs.
function routerProps(taskView: TaskScreenProps["taskView"], landscape = false) {
  return {
    taskView,
    isLandscapeTimelineLayout: landscape,
    activeTaskSubteam: "programming",
    events: [],
    subsystems: [],
    timelineTasks: [],
    openCreateDeadlineEditor: jest.fn(),
    openCreateTaskEditor: jest.fn(),
    openEditTaskEditor: jest.fn(),
    setActiveTaskSubteam: jest.fn(),
    themeColors: {},
  } as unknown as TaskScreenProps;
}

beforeEach(() => jest.clearAllMocks());

test.each([
  ["queue", TaskQueueScreen, false],
  ["timeline", TaskTimelineScreen, true],
  ["milestones", TaskMilestonesScreen, true],
] as const)("routes %s and preserves subteam tab visibility", (view, child, tabsVisible) => {
  render(createElement(TasksScreen, routerProps(view)));
  expect(child).toHaveBeenCalledTimes(1);
  expect(SectionTabs).toHaveBeenCalledTimes(tabsVisible ? 1 : 0);
  expect(LandscapeSubsystemTimeline).not.toHaveBeenCalled();
  for (const other of [TaskQueueScreen, TaskTimelineScreen, TaskMilestonesScreen]) {
    if (other !== child) expect(other).not.toHaveBeenCalled();
  }
});

test("landscape routes to planner with the original task and deadline commands", () => {
  const props = routerProps("queue", true);
  render(createElement(TasksScreen, props));
  expect(LandscapeSubsystemTimeline).toHaveBeenCalledWith(expect.objectContaining({
    tasks: props.timelineTasks,
    onAddDeadline: props.openCreateDeadlineEditor,
    onAddTask: props.openCreateTaskEditor,
    onTaskPress: props.openEditTaskEditor,
  }), undefined);
  expect(TaskQueueScreen).not.toHaveBeenCalled();
  expect(SectionTabs).not.toHaveBeenCalled();
});
