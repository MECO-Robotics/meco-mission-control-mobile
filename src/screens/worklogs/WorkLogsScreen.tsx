import { Modal, Pressable, View } from "react-native";
import { useState } from "react";

import { Text } from "../../i18n";
import {
  SUBVIEW_INTERACTION_GUIDANCE,
  WORKLOG_SORT_OPTIONS,
} from "../../ui/constants";
import { formatDate } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";
import type { WorkLogSortMode } from "../../ui/types";

import type { AppScreenProps, WorkLogListItem } from "../types";

export function WorkLogsScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    canMentorApprove,
    editTagStyle,
    filteredWorkLogs,
    membersById,
    openCreateWorkLogEditor,
    openWorkLogFromTimer,
    openEditWorkLogEditor,
    pauseWorkLogTimer,
    setWorkLogSearch,
    setWorkLogSortMode,
    setWorkLogSubsystemFilter,
    startWorkLogTimer,
    subsystems,
    subsystemsById,
    taskById,
    themeColors,
    workLogSearch,
    workLogSortMode,
    workLogSubsystemFilter,
    workLogSummary,
    workTimerElapsedLabel,
    workTimerIsActive,
    workTimerIsPaused,
  } = props;
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  const openAddWorkLog = () => {
    setIsAddMenuVisible(false);
    openCreateWorkLogEditor();
  };

  const startTimer = () => {
    setIsAddMenuVisible(false);
    startWorkLogTimer();
  };

  const getWorkLogSyncLabel = (workLog: WorkLogListItem) => {
    if (workLog.syncStatus === "failed") {
      return "SYNC FAILED";
    }

    if (workLog.syncStatus === "syncing") {
      return "SYNCING";
    }

    if (workLog.syncStatus === "pending") {
      return "PENDING";
    }

    return "OPEN";
  };

const renderScreen = () => {
  return (
    <WorkspacePanel
      title="Work logs"
      subtitle="Search by task or notes, then verify hours, participants, and linked subsystem impact."
      actions={
        <View style={styles.taskQueueHeaderActions}>
          <Pressable onPress={() => setIsFiltersVisible(true)} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
            <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Filters</Text>
          </Pressable>
          <Pressable onPress={() => setIsAddMenuVisible(true)} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
            <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add</Text>
          </Pressable>
        </View>
      }
    >
      {workTimerIsActive ? (
        <View style={[styles.workTimerCard, appResponsiveStyles.rowCard]}>
          <View style={styles.queueRowHeader}>
            <View style={styles.queueRowPrimaryText}>
              <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>Work timer</Text>
              <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                {workTimerElapsedLabel}
              </Text>
            </View>
            <Text style={editTagStyle}>{workTimerIsPaused ? "PAUSED" : "RUNNING"}</Text>
          </View>
          <View style={styles.quickActionRow}>
            {workTimerIsPaused ? (
              <Pressable
                onPress={openWorkLogFromTimer}
                style={[styles.quickActionButton, styles.quickActionButtonPrimary]}
              >
                <Text style={styles.quickActionButtonPrimaryLabel}>Log Time</Text>
              </Pressable>
            ) : (
              <Pressable onPress={pauseWorkLogTimer} style={styles.quickActionButton}>
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  Pause
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      <SummaryRow chips={workLogSummary} />

      {filteredWorkLogs.map((workLog) => {
        const task = taskById[workLog.taskId];
        const subsystemName = task ? (subsystemsById[task.subsystemId]?.name ?? "Unknown") : "Unknown";
        const isLocalDraft = Boolean(workLog.syncStatus);
        const canEditWorkLog = isLocalDraft
          ? workLog.syncStatus !== "syncing"
          : canMentorApprove;
        const people = workLog.participantIds
          .map((participantId) => membersById[participantId]?.name)
          .filter((name): name is string => Boolean(name));

        return (
          <Pressable
            key={workLog.id}
            onPress={() => {
              if (canEditWorkLog) {
                openEditWorkLogEditor(workLog);
              }
            }}
            style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{formatDate(workLog.date)}</Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>{workLog.hours.toFixed(1)}h logged</Text>
              </View>
              <Text style={editTagStyle}>
                {canEditWorkLog ? getWorkLogSyncLabel(workLog) : "VIEW"}
              </Text>
            </View>

            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>Task: {task?.title ?? "Missing task"}</Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>Subsystem: {subsystemName}</Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>People: {people.join(", ") || "Unassigned"}</Text>
            {workLog.syncStatus === "failed" ? (
              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                Sync issue: {workLog.syncError ?? "Retry from Sync."}
              </Text>
            ) : null}
            <Text style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>{workLog.notes || "No notes recorded."}</Text>
          </Pressable>
        );
      })}

      {filteredWorkLogs.length === 0 ? <EmptyState text="No work logs match the current filters." /> : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.worklogs} />

      <Modal
        animationType="fade"
        onRequestClose={() => setIsFiltersVisible(false)}
        transparent
        visible={isFiltersVisible}
      >
        <Pressable style={styles.modalScrim} onPress={() => setIsFiltersVisible(false)}>
          <Pressable
            style={[
              styles.workLogAddMenu,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.ink }]}>Filters</Text>
            <FilterToolbar>
              <SearchField
                onChangeText={setWorkLogSearch}
                placeholder="Search work logs"
                value={workLogSearch}
              />

              <OptionChipRow
                allLabel="All subsystems"
                onChange={setWorkLogSubsystemFilter}
                options={subsystems.map((subsystem) => ({
                  id: subsystem.id,
                  name: subsystem.name,
                }))}
                value={workLogSubsystemFilter}
              />

              <OptionChipRow
                allLabel="Sort"
                onChange={(value) => setWorkLogSortMode(value as WorkLogSortMode)}
                options={WORKLOG_SORT_OPTIONS.map((option) => ({
                  id: option.id,
                  name: option.name,
                }))}
                value={workLogSortMode}
              />
            </FilterToolbar>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsAddMenuVisible(false)}
        transparent
        visible={isAddMenuVisible}
      >
        <Pressable style={styles.modalScrim} onPress={() => setIsAddMenuVisible(false)}>
          <Pressable
            style={[
              styles.workLogAddMenu,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.ink }]}>Start work log</Text>
            <View style={styles.quickActionRow}>
              <Pressable
                onPress={openAddWorkLog}
                style={[styles.quickActionButton, styles.quickActionButtonPrimary]}
              >
                <Text style={styles.quickActionButtonPrimaryLabel}>Add Work Log</Text>
              </Pressable>
              <Pressable onPress={startTimer} style={styles.quickActionButton}>
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  Start Timer
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </WorkspacePanel>
  );
};

  return renderScreen();
}
