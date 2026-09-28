import { Callout } from "../../ui/Callout";
import { ActionButton } from "../../ui/ActionButton";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { SUBVIEW_INTERACTION_GUIDANCE } from "../../ui/constants";
import { getDefaultHelpMentorId } from "../../data/helpRequests";
import { styles } from "../../ui/styles";
import {
  EditorModal,
  InteractionNote,
  ModalField,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";
import { QaReviewDetail } from "../reports/QaReviewDetail";
import type { Task } from "../../types/domain";

import type { TaskScreenProps } from "./taskScreenTypes";
import { TaskQueueCard } from "./TaskQueueCard";
import { NeedHelpModal } from "../help/NeedHelpModal";
import { TaskQueueFilterSheet } from "../taskQueue/TaskQueueFilterSheet";
import { TaskReassignModal } from "../taskQueue/TaskReassignModal";
import { useTaskReassignModal } from "../taskQueue/useTaskReassignModal";
import {
  getVisibleTaskQueueSections,
  TASK_QUEUE_PAGE_SIZE,
} from "./taskQueuePagination";

type TaskQueueScreenProps = Pick<TaskScreenProps,
  | "queue" | "activeTaskSubteam" | "activeTaskSubteamLabel" | "appResponsiveStyles"
  | "canReassignTasks" | "claimTask" | "clearTaskBlockers"
  | "disciplinesById" | "editTagStyle" | "eventsById"
  | "isCompactLayout" | "isLandscapeCardLayout"
  | "mechanismsById" | "members" | "membersById"
  | "openCreateTaskEditor" | "openCreateWorkLogEditor" | "openEditTaskEditor"
  | "partInstancesById" | "requestHelp" | "requestTaskQa"
  | "reassignTask" | "releaseTask" | "rosterMentors"
  | "rosterStudents" | "setActiveTaskSubteam"
  | "canSubmitQa" | "qaRequests" | "openCreateQaReportEditor" | "signedInMember" | "startTask"
  | "subsystems" | "subsystemsById"
  | "taskById" | "taskDependencies"
  | "taskLoggedHoursById"
  | "themeColors" | "qaReviews"
>;

export function TaskQueueScreen(props: TaskQueueScreenProps) {
  const {
    queue,
    activeTaskSubteam,
    activeTaskSubteamLabel,
    appResponsiveStyles,
    canReassignTasks,
    claimTask,
    clearTaskBlockers,
    disciplinesById,
    editTagStyle,
    eventsById,
    isCompactLayout,
    isLandscapeCardLayout,
    mechanismsById,
    members,
    membersById,
    openCreateTaskEditor,
    openCreateWorkLogEditor,
    openEditTaskEditor,
    partInstancesById,
    requestHelp,
    requestTaskQa,
    reassignTask,
    releaseTask,
    rosterMentors,
    rosterStudents,
    setActiveTaskSubteam,
    canSubmitQa,
    qaRequests,
    openCreateQaReportEditor,
    signedInMember,
    startTask,
    subsystems,
    subsystemsById,
    taskById,
    taskDependencies,
    taskLoggedHoursById,
    themeColors,
    qaReviews,
  } = props;
  const [selectedQaTaskId, setSelectedQaTaskId] = useState<string | null>(null);
  const [blockerResolutionTask, setBlockerResolutionTask] = useState<Task | null>(null);
  const [blockerResolutionNote, setBlockerResolutionNote] = useState("");
  const [blockerResolutionError, setBlockerResolutionError] = useState<string | null>(null);
  const [helpRequestTask, setHelpRequestTask] = useState<Task | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { filteredTaskQueue, taskQueueSections, taskSummary, resetFilters } = queue;
  const filterKey = JSON.stringify([activeTaskSubteam, queue.filters]);
  const [pagination, setPagination] = useState({ filterKey, page: 0 });
  const taskCount = taskQueueSections.reduce((count, section) => count + section.tasks.length, 0);
  const pageCount = Math.max(1, Math.ceil(taskCount / TASK_QUEUE_PAGE_SIZE));
  const page = pagination.filterKey === filterKey ? Math.min(pagination.page, pageCount - 1) : 0;
  if (pagination.filterKey !== filterKey || pagination.page !== page) setPagination({ filterKey, page });
  const visibleSections = getVisibleTaskQueueSections(taskQueueSections, page);

  const taskReassignModal = useTaskReassignModal({ reassignTask });
  const mentorOptions = rosterMentors.map((mentor) => ({ id: mentor.id, name: mentor.name }));
  const defaultHelpMentorId = getDefaultHelpMentorId(helpRequestTask, rosterMentors);
  const reassignOwnerOptions = rosterStudents.map((member) => ({
    id: member.id,
    name: member.name,
  }));

  const openBlockerResolution = (task: Task) => {
    setBlockerResolutionTask(task);
    setBlockerResolutionNote("");
    setBlockerResolutionError(null);
  };

  const closeBlockerResolution = () => {
    setBlockerResolutionTask(null);
    setBlockerResolutionNote("");
    setBlockerResolutionError(null);
  };

  const closeHelpRequest = () => {
    setHelpRequestTask(null);
  };

  const submitTaskHelpRequest = ({
    mentorId,
    reason,
  }: {
    mentorId: string;
    reason: string;
  }) => {
    if (!helpRequestTask) {
      return false;
    }

    const didRequestHelp = requestHelp({
      taskId: helpRequestTask.id,
      reason,
      mentorId,
      requestedById: null,
    });

    if (didRequestHelp) {
      closeHelpRequest();
    }

    return didRequestHelp;
  };

  const saveBlockerResolution = async () => {
    if (!blockerResolutionTask) {
      return;
    }

    if (!blockerResolutionNote.trim()) {
      setBlockerResolutionError("Add a short note explaining what changed.");
      return;
    }

    try {
      await clearTaskBlockers(blockerResolutionTask, blockerResolutionNote);
      closeBlockerResolution();
    } catch (error) { setBlockerResolutionError(error instanceof Error ? error.message : String(error)); }
  };

  const taskCardContext = {
    appResponsiveStyles,
    canReassignTasks,
    canSubmitQa,
    claimTask,
    disciplinesById,
    editTagStyle,
    eventsById,
    isLandscapeCardLayout,
    mechanismsById,
    membersById,
    openCreateQaReportEditor,
    openCreateWorkLogEditor,
    openEditTaskEditor,
    partInstancesById,
    qaRequests,
    qaReviews,
    releaseTask,
    requestTaskQa,
    signedInMember,
    startTask,
    subsystemsById,
    taskById,
    taskDependencies,
    taskLoggedHoursById,
    themeColors,
  };
  const taskCardActions = {
    onOpenBlockerResolution: openBlockerResolution,
    onOpenHelpRequest: setHelpRequestTask,
    onOpenQaReview: (task: Task) => setSelectedQaTaskId(task.id),
    onOpenReassign: taskReassignModal.open,
  };

const renderScreen = () => {
  return (
    <WorkspacePanel
      compactActionsInline
      title={`${activeTaskSubteamLabel} task queue`}
      subtitle="Search and filter queue cards for the selected subteam's work."
      actions={
        <View style={styles.taskQueueHeaderActions}>
          <Pressable
            onPress={() => setIsFiltersOpen(true)}
            style={[
              styles.primaryAction,
              appResponsiveStyles.primaryAction,
            ]}
          >
            <Text
              style={[
                styles.primaryActionLabel,
                appResponsiveStyles.primaryActionLabel,
              ]}
            >
              Filters
            </Text>
          </Pressable>
          <ActionButton
            onPress={openCreateTaskEditor}
            variant="primary"
            responsiveStyles={appResponsiveStyles}
          >
            Add
          </ActionButton>
        </View>
      }
    >
      <QaReviewDetail review={selectedQaTaskId ? qaReviews.find((review) => review.taskId === selectedQaTaskId) ?? null : null}
        membersById={membersById} onClose={() => setSelectedQaTaskId(null)} />
      <SummaryRow chips={taskSummary} />

      {!isCompactLayout ? (
        <View style={styles.tableHeaderRow}>
          <Text
            style={[
              styles.tableHeaderText,
              styles.tableHeaderPrimary,
              appResponsiveStyles.tableHeaderText,
            ]}
          >
            Task
          </Text>
          <Text style={[styles.tableHeaderText, appResponsiveStyles.tableHeaderText]}>Owner</Text>
          <Text style={[styles.tableHeaderText, appResponsiveStyles.tableHeaderText]}>Due</Text>
          <Text style={[styles.tableHeaderText, appResponsiveStyles.tableHeaderText]}>Status</Text>
        </View>
      ) : null}

      {visibleSections.map((section) => (
        <View key={section.id}>
          {section.tasks.length > 0 ? (
            <Callout
              responsiveStyles={appResponsiveStyles}
              title={section.title}
              body={[section.totalTasks, " task", section.totalTasks === 1 ? "" : "s"]}
            />
          ) : section.totalTasks === 0 && section.emptyTitle ? (
            <Callout
              responsiveStyles={appResponsiveStyles}
              title={section.emptyTitle}
              body={section.emptyBody}
            />
          ) : null}

          {section.tasks.map((task) => (
            <TaskQueueCard
              key={task.id}
              task={task}
              context={taskCardContext}
              actions={taskCardActions}
            />
          ))}
        </View>
      ))}

      {filteredTaskQueue.length === 0 ? (
        <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
          <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
            No matching tasks
          </Text>
          <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
            Try clearing search, owner, status, priority, flag, subsystem, and archive filters.
          </Text>
          <View style={styles.quickActionRow}>
            <ActionButton
              onPress={resetFilters}
              variant="quick"
              responsiveStyles={appResponsiveStyles}
            >
              Reset filters
            </ActionButton>
            <ActionButton
              onPress={openCreateTaskEditor}
              variant="quick"
              responsiveStyles={appResponsiveStyles}
            >
              Add task
            </ActionButton>
          </View>
        </View>
      ) : null}

      {pageCount > 1 ? <View style={styles.quickActionRow}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: page === 0 }}
          disabled={page === 0} style={[styles.quickActionButton, { minHeight: 48, justifyContent: "center" }]}
          onPress={() => setPagination({ filterKey, page: page - 1 })}>
          <Text>Previous page</Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite">Page {page + 1} of {pageCount} · {taskCount} tasks</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: page === pageCount - 1 }}
          disabled={page === pageCount - 1} style={[styles.quickActionButton, { minHeight: 48, justifyContent: "center" }]}
          onPress={() => setPagination({ filterKey, page: page + 1 })}>
          <Text>Next page</Text>
        </Pressable>
      </View> : null}
      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.queue} />
      <NeedHelpModal
        appResponsiveStyles={appResponsiveStyles}
        contextTitle={helpRequestTask?.title ?? "Task help request"}
        defaultMentorId={defaultHelpMentorId}
        mentorOptions={mentorOptions}
        onCancel={closeHelpRequest}
        onSubmit={submitTaskHelpRequest}
        visible={Boolean(helpRequestTask)}
      />
      <TaskQueueFilterSheet
        queue={queue}
        activeTaskSubteam={activeTaskSubteam}
        appResponsiveStyles={appResponsiveStyles}
        members={members}
        onClose={() => setIsFiltersOpen(false)}
        setActiveTaskSubteam={setActiveTaskSubteam}
        subsystems={subsystems}
        themeColors={themeColors}
        visible={isFiltersOpen}
      />
      <TaskReassignModal
        appResponsiveStyles={appResponsiveStyles}
        membersById={membersById}
        onCancel={taskReassignModal.close}
        onSave={taskReassignModal.save}
        onChangeOwner={taskReassignModal.setOwnerId}
        ownerId={taskReassignModal.ownerId}
        ownerOptions={reassignOwnerOptions}
        task={taskReassignModal.task}
      />
      <EditorModal
        onCancel={closeBlockerResolution}
        onSave={saveBlockerResolution}
        saveLabel="Resolve"
        title="Resolve blockers"
        visible={Boolean(blockerResolutionTask)}
      >
        {blockerResolutionTask ? (
          <>
            <Callout
              responsiveStyles={appResponsiveStyles}
              title="Current blockers"
              body={blockerResolutionTask.blockers.join(" | ")}
            />
            {blockerResolutionError ? (
              <Callout
                responsiveStyles={appResponsiveStyles}
                title="Resolution note required"
                body={blockerResolutionError}
              />
            ) : null}
            <ModalField
              label="Resolution note"
              multiline
              onChangeText={(value) => {
                setBlockerResolutionNote(value);
                setBlockerResolutionError(null);
              }}
              placeholder="What changed so this is no longer blocked?"
              value={blockerResolutionNote}
            />
          </>
        ) : null}
      </EditorModal>
    </WorkspacePanel>
  );
};

  return renderScreen();
}
