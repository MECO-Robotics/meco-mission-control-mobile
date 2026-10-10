import { ActionButton } from "../../ui/ActionButton";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import {
  ARCHIVE_FILTER_OPTIONS,
  STATUS_LABELS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../../ui/constants";
import { formatDate, timelineProgress } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";
import type { ArchiveFilterMode } from "../../ui/types";

import type { TaskScreenProps } from "./taskScreenTypes";

type TaskTimelineScreenProps = Pick<TaskScreenProps,
  | "activeResponsibleGroupLabel" | "appResponsiveStyles" | "eventOptions"
  | "eventsById" | "membersById" | "openCreateTaskEditor"
  | "openEditTaskEditor" | "setTimelineMilestoneFilter"
  | "setTimelineSubsystemFilter" | "subsystems" | "subsystemsById"
  | "queue" | "timelineMilestoneFilter"
  | "timelineSubsystemFilter" | "timelineTasks"
>;

export function TaskTimelineScreen(props: TaskTimelineScreenProps) {
  const {
    activeResponsibleGroupLabel,
    appResponsiveStyles,
    eventOptions,
    eventsById,
    membersById,
    openCreateTaskEditor,
    openEditTaskEditor,
    setTimelineMilestoneFilter,
    setTimelineSubsystemFilter,
    subsystems,
    subsystemsById,
    queue,
    timelineMilestoneFilter,
    timelineSubsystemFilter,
    timelineTasks,
  } = props;

  return (
    <WorkspacePanel
      title={`${activeResponsibleGroupLabel} timeline`}
      subtitle="Schedule-ordered milestones and ownership cues for the selected responsible group."
      actions={
        <ActionButton
          onPress={openCreateTaskEditor}
          variant="primary"
          responsiveStyles={appResponsiveStyles}
        >
          Add task
        </ActionButton>
      }
    >
      <FilterToolbar>
        <OptionChipRow
          allLabel="All subsystems"
          onChange={setTimelineSubsystemFilter}
          options={subsystems.map((subsystem) => ({
            id: subsystem.id,
            name: subsystem.name,
          }))}
          value={timelineSubsystemFilter}
        />
        <OptionChipRow
          allLabel="All milestones"
          onChange={setTimelineMilestoneFilter}
          options={eventOptions}
          value={timelineMilestoneFilter}
        />
        <OptionChipRow
          allLabel="Any archive"
          onChange={(value) => queue.setFilter("taskArchiveFilter", value as ArchiveFilterMode)}
          options={ARCHIVE_FILTER_OPTIONS}
          value={queue.filters.taskArchiveFilter}
        />
      </FilterToolbar>
      <SummaryRow chips={queue.taskSummary} />

      {timelineTasks.map((task) => {
        const progress = timelineProgress(task.status);
        const subsystemName = subsystemsById[(task.subsystemIds[0] ?? "")]?.name ?? "Unknown";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";
        const targetEvent = task.scheduleRefs[0] ? eventsById[`${task.scheduleRefs[0].kind}:${task.scheduleRefs[0].id}`]?.title : null;

        return (
          <Pressable
            key={task.id}
            onPress={() => openEditTaskEditor(task)}
            style={[styles.timelineRow, appResponsiveStyles.rowCard]}
          >
            <View style={styles.timelineRowHeader}>
              <View style={styles.timelineRowText}>
                <Text style={[styles.timelineTitle, appResponsiveStyles.rowTitle]}>{task.title}</Text>
                <Text style={[styles.timelineMeta, appResponsiveStyles.metaLine]}>
                  {subsystemName} - {ownerName} - due {formatDate(task.dueDate)}
                  {targetEvent ? ` - ${targetEvent}` : ""}
                </Text>
              </View>
              <StatusPill label={STATUS_LABELS[task.status]} value={task.status} />
            </View>

            <View style={styles.timelineTrack}>
              <View style={[styles.timelineFill, { width: `${Math.max(8, progress * 100)}%` }]} />
            </View>
          </Pressable>
        );
      })}

      {timelineTasks.length === 0 ? <EmptyState text="No timeline tasks match the current filters." /> : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.timeline} />
    </WorkspacePanel>
  );
}
