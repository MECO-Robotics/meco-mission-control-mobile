import { View } from "react-native";
import { TASK_SUBTEAM_OPTIONS } from "../../ui/constants";
import { LandscapeSubsystemTimeline } from "../../ui/landscapeTimeline/LandscapeSubsystemTimeline";
import { DropdownField } from "../../ui/ui";

import type { TaskScreenProps } from "./taskScreenTypes";
import { TaskMilestonesScreen } from "./TaskMilestonesScreen";
import { TaskQueueScreen } from "./TaskQueueScreen";
import { TaskTimelineScreen } from "./TaskTimelineScreen";

export function TasksScreen(props: TaskScreenProps) {
  const {
    activeTaskSubteam,
    events,
    isLandscapeTimelineLayout,
    openCreateDeadlineEditor,
    openCreateTaskEditor,
    openEditTaskEditor,
    setActiveTaskSubteam,
    subsystems,
    taskView,
    themeColors,
    timelineTasks,
  } = props;

  if (isLandscapeTimelineLayout && taskView === "timeline") {
    return (
      <LandscapeSubsystemTimeline
        colors={themeColors}
        events={events}
        onAddDeadline={openCreateDeadlineEditor}
        onAddTask={openCreateTaskEditor}
        onTaskPress={openEditTaskEditor}
        subsystems={subsystems}
        tasks={timelineTasks}
      />
    );
  }

  return (
    <>
      {taskView !== "milestones" ? <View style={{ paddingHorizontal: 20 }}>
        <DropdownField label="Discipline" value={activeTaskSubteam}
          onChange={(value) => setActiveTaskSubteam(value as typeof activeTaskSubteam)}
          options={TASK_SUBTEAM_OPTIONS.map(({ value, label }) => ({ id: value, name: label }))} />
      </View> : null}
      {taskView === "timeline"
        ? <TaskTimelineScreen {...props} />
        : taskView === "queue"
          ? <TaskQueueScreen {...props} />
          : <TaskMilestonesScreen {...props} />}
    </>
  );
}
