import { Modal, Pressable, View } from "react-native";
import { useState } from "react";

import { Text } from "../i18n";
import { getDefaultHelpMentorId } from "../data/helpRequests";
import {
  SUBVIEW_INTERACTION_GUIDANCE,
  WORKLOG_SORT_OPTIONS,
} from "../ui/constants";
import { formatDate } from "../ui/helpers";
import { styles } from "../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";
import type { WorkLogSortMode } from "../ui/types";
import type { Task, WorkLog } from "../types/domain";

import type { AppScreenProps, WorkLogListItem } from "./types";
import { NeedHelpModal } from "./help/NeedHelpModal";

type WorkLogHelpContext = {
  contextTitle: string;
  task: Task | null;
  taskId: string | null;
  workLogId: string | null;
};

export function WorkLogsScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    editTagStyle,
    filteredWorkLogs,
    membersById,
    openCreateWorkLogEditor,
    openWorkLogFromTimer,
    openEditWorkLogEditor,
    pauseWorkLogTimer,
    requestHelp,
    rosterMentors,
    setWorkLogSearch,
    setWorkLogSortMode,
    setWorkLogSubsystemFilter,
    startWorkLogTimer,
    subsystems,
    subsystemsById,
    taskById,
    workLogSearch,
    workLogSortMode,
    workLogSubsystemFilter,
    workLogSummary,
    workTimerElapsedLabel,
    workTimerIsActive,
    workTimerIsPaused,
  } = props;
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);
  const [helpContext, setHelpContext] = useState<WorkLogHelpContext | null>(null);
  const mentorOptions = rosterMentors.map((mentor) => ({ id: mentor.id, name: mentor.name }));
  const defaultHelpMentorId = getDefaultHelpMentorId(helpContext?.task, rosterMentors);

  const openAddWorkLog = () => {
    setIsAddMenuVisible(false);
    openCreateWorkLogEditor();
  };

  const startTimer = () => {
    setIsAddMenuVisible(false);
    startWorkLogTimer();
  };

  const openTimerHelpRequest = () => {
    setHelpContext({
      contextTitle: "Active work timer",
      task: null,
      taskId: null,
      workLogId: null,
    });
  };

  const openWorkLogHelpRequest = (workLog: WorkLog) => {
    const task = taskById[workLog.taskId] ?? null;

    setHelpContext({
      contextTitle: task ? `Work log for ${task.title}` : "Work log help request",
      task,
      taskId: workLog.taskId,
      workLogId: workLog.id,
    });
  };

  const closeHelpRequest = () => {
    setHelpContext(null);
  };

  const submitWorkLogHelpRequest = ({
    mentorId,
    reason,
  }: {
    mentorId: string;
    reason: string;
  }) => {
    if (!helpContext) {
      return false;
    }

    const didRequestHelp = requestHelp({
      taskId: helpContext.taskId,
      workLogId: helpContext.workLogId,
      reason,
      mentorId,
      requestedById: null,
    });

    if (didRequestHelp) {
      closeHelpRequest();
    }

    return didRequestHelp;
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
        <Pressable onPress={() => setIsAddMenuVisible(true)} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add</Text>
        </Pressable>
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
            <Pressable
              onPress={openTimerHelpRequest}
              style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
            >
              <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                Need help
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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
      <SummaryRow chips={workLogSummary} />

      {filteredWorkLogs.map((workLog) => {
        const task = taskById[workLog.taskId];
        const subsystemName = task ? (subsystemsById[task.subsystemId]?.name ?? "Unknown") : "Unknown";
        const isLocalDraft = Boolean(workLog.syncStatus);
        const canEditWorkLog = !isLocalDraft || workLog.syncStatus !== "syncing";
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
              <Text style={editTagStyle}>{getWorkLogSyncLabel(workLog)}</Text>
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
            {!isLocalDraft ? <View style={styles.quickActionRow}>
              <Pressable
                onPress={() => openWorkLogHelpRequest(workLog)}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
              >
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  Need help
                </Text>
              </Pressable>
            </View> : null}
          </Pressable>
        );
      })}

      {filteredWorkLogs.length === 0 ? <EmptyState text="No work logs match the current filters." /> : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.worklogs} />

      <NeedHelpModal
        appResponsiveStyles={appResponsiveStyles}
        contextTitle={helpContext?.contextTitle ?? "Work help request"}
        defaultMentorId={defaultHelpMentorId}
        mentorOptions={mentorOptions}
        onCancel={closeHelpRequest}
        onSubmit={submitWorkLogHelpRequest}
        visible={Boolean(helpContext)}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setIsAddMenuVisible(false)}
        transparent
        visible={isAddMenuVisible}
      >
        <Pressable style={styles.modalScrim} onPress={() => setIsAddMenuVisible(false)}>
          <Pressable style={styles.workLogAddMenu}>
            <Text style={styles.modalTitle}>Start work log</Text>
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
