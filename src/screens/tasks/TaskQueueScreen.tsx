import { Callout } from "../../ui/Callout";
import { ActionButton } from "../../ui/ActionButton";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { SUBVIEW_INTERACTION_GUIDANCE } from "../../ui/constants";
import { getDefaultHelpMentorId } from "../../data/helpRequests";
import { styles } from "../../ui/styles";
import {
  InteractionNote,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";
import { QaReviewDetail } from "../reports/QaReviewDetail";
import { getQaReviewTaskId } from "../../app/appModel";
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
  | "queue" | "activeResponsibleGroupId" | "activeResponsibleGroupLabel" | "appResponsiveStyles"
  | "canReassignTasks" | "claimTask"
  | "workTypesById" | "editTagStyle" | "eventsById" | "workstreamsById"
  | "isCompactLayout" | "isLandscapeCardLayout"
  | "mechanismsById" | "members" | "membersById"
  | "openCreateTaskEditor" | "openCreateWorkLogEditor" | "openEditTaskEditor"
  | "partInstancesById" | "partDefinitionsById" | "requestHelp" | "requestTaskQa"
  | "reassignTask" | "releaseTask" | "rosterMentors"
  | "rosterStudents" | "setActiveResponsibleGroupId"
  | "canSubmitQa" | "qaRequests" | "openCreateQaReportEditor" | "signedInMember" | "startTask"
  | "subsystems" | "subsystemsById" | "responsibleGroups"
  | "taskById" | "taskDependencies"
  | "taskLoggedHoursById"
  | "themeColors" | "qaReports"
>;

export function TaskQueueScreen(props: TaskQueueScreenProps) {
  const {
    queue,
    activeResponsibleGroupId,
    responsibleGroups,
    activeResponsibleGroupLabel,
    appResponsiveStyles,
    canReassignTasks,
    claimTask,
    workTypesById,
    workstreamsById,
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
    partDefinitionsById,
    requestHelp,
    requestTaskQa,
    reassignTask,
    releaseTask,
    rosterMentors,
    rosterStudents,
    setActiveResponsibleGroupId,
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
    qaReports,
  } = props;
  const [selectedQaTaskId, setSelectedQaTaskId] = useState<string | null>(null);
  const [helpRequestTask, setHelpRequestTask] = useState<Task | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { filteredTaskQueue, taskQueueSections, taskSummary, resetFilters } = queue;
  const filterKey = JSON.stringify([activeResponsibleGroupId, queue.filters]);
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

  const taskCardContext = {
    appResponsiveStyles,
    canReassignTasks,
    canSubmitQa,
    claimTask,
    workTypesById,
    workstreamsById,
    editTagStyle,
    eventsById,
    isLandscapeCardLayout,
    mechanismsById,
    membersById,
    openCreateQaReportEditor,
    openCreateWorkLogEditor,
    openEditTaskEditor,
    partInstancesById,
    partDefinitionsById,
    qaRequests,
    qaReports,
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
    onOpenHelpRequest: setHelpRequestTask,
    onOpenQaReview: (task: Task) => setSelectedQaTaskId(task.id),
    onOpenReassign: taskReassignModal.open,
  };

const renderScreen = () => {
  return (
    <WorkspacePanel
      compactActionsInline
      title={`${activeResponsibleGroupLabel} Kanban`}
      subtitle="Search and filter executable work for the selected responsible group."
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
      <QaReviewDetail review={selectedQaTaskId ? qaReports.find((review) => getQaReviewTaskId(review) === selectedQaTaskId) ?? null : null}
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
        activeResponsibleGroupId={activeResponsibleGroupId}
        appResponsiveStyles={appResponsiveStyles}
        members={members}
        onClose={() => setIsFiltersOpen(false)}
        setActiveResponsibleGroupId={setActiveResponsibleGroupId}
        responsibleGroups={responsibleGroups}
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
    </WorkspacePanel>
  );
};

  return renderScreen();
}
