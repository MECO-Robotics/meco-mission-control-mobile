import { View } from "react-native";
import { LandscapeSubsystemTimeline } from "../../ui/landscapeTimeline/LandscapeSubsystemTimeline";
import { DropdownField } from "../../ui/ui";

import type { TaskScreenProps } from "./taskScreenTypes";
import { ScheduleAgendaScreen } from "./ScheduleAgendaScreen";
import { ScheduleCalendarScreen } from "./ScheduleCalendarScreen";
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
    workspaceView,
    themeColors,
    timelineTasks,
  } = props;

  if (workspaceView.domain === "schedule" && workspaceView.presentation === "calendar") {
    return <ScheduleCalendarScreen
      appResponsiveStyles={props.appResponsiveStyles}
      events={props.events}
      tasks={props.tasks}
      membersById={props.membersById}
      projects={props.projects}
      openCreateMilestoneEditor={props.openCreateMilestoneEditor}
      openEditMilestoneEditor={props.openEditMilestoneEditor}
    />;
  }

  if (workspaceView.domain === "schedule" && workspaceView.presentation === "timeline" && isLandscapeTimelineLayout) {
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
      {workspaceView.domain === "schedule" && workspaceView.presentation === "timeline" ? <View style={{ paddingHorizontal: 20 }}>
        <DropdownField label="Responsible group" value={activeResponsibleGroupId}
          onChange={(value) => setActiveResponsibleGroupId(value as typeof activeResponsibleGroupId)}
          options={[{ id: "all", name: "All groups" }, ...responsibleGroups.filter((group) => !group.isArchived).map((group) => ({ id: group.id, name: group.name }))]} />
      </View> : null}
      {workspaceView.domain === "schedule" && workspaceView.presentation === "timeline"
        ? <TaskTimelineScreen {...props} />
        : workspaceView.domain === "kanban"
          ? <TaskQueueScreen {...props} />
          : <ScheduleAgendaScreen {...props} />}
    </>
  );
}
