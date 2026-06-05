import { TASK_SUBTEAM_OPTIONS } from "../ui/constants";
import { LandscapeSubsystemTimeline } from "../ui/landscapeTimeline/LandscapeSubsystemTimeline";
import { SectionTabs } from "../ui/ui";

import type { AppScreenProps } from "./types";
import { TaskMilestonesScreen } from "./TaskMilestonesScreen";
import { TaskQueueScreen } from "./TaskQueueScreen";
import { TaskTimelineScreen } from "./TaskTimelineScreen";

export function TasksScreen(props: AppScreenProps) {
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

  if (isLandscapeTimelineLayout) {
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
      {taskView === "queue" ? null : (
        <SectionTabs
          activeValue={activeTaskSubteam}
          onChange={setActiveTaskSubteam}
          options={TASK_SUBTEAM_OPTIONS}
        />
      )}
      {taskView === "timeline"
        ? <TaskTimelineScreen {...props} />
        : taskView === "queue"
          ? <TaskQueueScreen {...props} />
          : <TaskMilestonesScreen {...props} />}
    </>
  );
}
