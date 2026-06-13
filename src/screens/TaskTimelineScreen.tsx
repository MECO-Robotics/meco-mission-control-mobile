import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import {
  ARCHIVE_FILTER_OPTIONS,
  STATUS_LABELS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../ui/constants";
import { formatDate, timelineProgress } from "../ui/helpers";
import { styles } from "../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";
import type { ArchiveFilterMode } from "../ui/types";

import type { AppScreenProps } from "./types";

export function TaskTimelineScreen(props: AppScreenProps) {
  const {
    activeTaskSubteamLabel,
    appResponsiveStyles,
    eventOptions,
    eventsById,
    membersById,
    openCreateTaskEditor,
    openEditTaskEditor,
    setTaskArchiveFilter,
    setTimelineMilestoneFilter,
    setTimelineSubsystemFilter,
    subsystems,
    subsystemsById,
    taskArchiveFilter,
    taskSummary,
    timelineMilestoneFilter,
    timelineSubsystemFilter,
    timelineTasks,
  } = props;

  return (
    <WorkspacePanel
      title={`${activeTaskSubteamLabel} timeline`}
      subtitle="Calendar-ordered milestones and ownership cues for the selected subteam."
      actions={
        <Pressable onPress={openCreateTaskEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add task</Text>
        </Pressable>
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
          onChange={(value) => setTaskArchiveFilter(value as ArchiveFilterMode)}
          options={ARCHIVE_FILTER_OPTIONS}
          value={taskArchiveFilter}
        />
      </FilterToolbar>
      <SummaryRow chips={taskSummary} />

      {timelineTasks.map((task) => {
        const progress = timelineProgress(task.status);
        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "Unknown";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";
        const targetEvent = task.targetEventId ? eventsById[task.targetEventId]?.title : null;

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
