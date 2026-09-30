import { View } from "react-native";
import { LandscapeSubsystemTimeline } from "../../ui/landscapeTimeline/LandscapeSubsystemTimeline";
import { DropdownField } from "../../ui/ui";

import type { TaskScreenProps } from "./taskScreenTypes";
import { TaskMilestonesScreen } from "./TaskMilestonesScreen";
import { TaskQueueScreen } from "./TaskQueueScreen";
import { TaskTimelineScreen } from "./TaskTimelineScreen";

export function TasksScreen(props: TaskScreenProps) {
  const {
    activeResponsibleGroupId,
    responsibleGroups,
    events,
    isLandscapeTimelineLayout,
    openCreateDeadlineEditor,
    openCreateTaskEditor,
    openEditTaskEditor,
    setActiveResponsibleGroupId,
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
        <DropdownField label="Responsible group" value={activeResponsibleGroupId}
          onChange={(value) => setActiveResponsibleGroupId(value as typeof activeResponsibleGroupId)}
          options={[{ id: "all", name: "All groups" }, ...responsibleGroups.filter((group) => !group.isArchived).map((group) => ({ id: group.id, name: group.name }))]} />
      </View> : null}
      {taskView === "timeline"
        ? <TaskTimelineScreen {...props} />
        : taskView === "queue"
          ? <TaskQueueScreen {...props} />
          : <TaskMilestonesScreen {...props} />}
    </>
  );
}
