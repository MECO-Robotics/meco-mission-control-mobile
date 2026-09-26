import { Callout } from "../../ui/Callout";
import { ActionButton } from "../../ui/ActionButton";
import { isTaskBlocked } from "../../data/taskReadiness";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import {
  STATUS_LABELS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../../ui/constants";
import {
  formatDate,
  localTodayDate,
} from "../../ui/helpers";
import { getDefaultHelpMentorId } from "../../data/helpRequests";
import {
  getTaskAssignmentState,
  getTaskStartActionLabel,
} from "../../data/taskAssignment";
import { styles } from "../../ui/styles";
import {
  EditorModal,
  InteractionNote,
  ModalField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";
import { QaReviewDetail } from "../reports/QaReviewDetail";
import type { Task } from "../../types/domain";

import type { TaskScreenProps } from "./taskScreenTypes";
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

  const renderTaskMetaItem = (label: string, value: string) => (
    <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>
        {label} {value}
      </Text>
    </View>
  );

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

          {section.tasks.map((task) => {
        const subsystemName = subsystemsById[(task.subsystemIds[0] ?? "")]?.name ?? "Unknown";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";
        const disciplineName = disciplinesById[task.disciplineId]?.name ?? "Unknown discipline";
        const mechanismName = task.mechanismIds[0]
          ? (mechanismsById[task.mechanismIds[0]]?.name ?? "Unknown mechanism")
          : "No mechanism";
        const linkedPart = task.partInstanceIds[0]
          ? (partInstancesById[task.partInstanceIds[0]]?.name ?? "Unknown part")
          : "No part";
        const targetEvent = task.targetEventId
          ? (eventsById[task.targetEventId]?.title ?? "Event")
          : "No event";
        const openDependencies = taskDependencies.filter((edge) => edge.taskId === task.id && edge.kind === "task" && edge.dependencyType === "hard")
          .filter((edge) => taskById[edge.refId]?.status !== edge.requiredState)
          .map((edge) => taskById[edge.refId])
          .filter((dependency): dependency is Task => Boolean(dependency))
;
        const loggedHours = taskLoggedHoursById[task.id] ?? task.actualHours;
        const isOverEstimate = task.estimatedHours > 0 && loggedHours > task.estimatedHours;
        const today = localTodayDate();
        const soon = new Date(`${today}T00:00:00`);
        soon.setDate(soon.getDate() + 7);
        const soonDate = soon.toISOString().slice(0, 10);
        const isOverdue = task.status !== "complete" && task.dueDate < today;
        const isDueSoon =
          task.status !== "complete" && task.dueDate >= today && task.dueDate <= soonDate;
        const assignmentState = getTaskAssignmentState({
          canReassignTasks,
          membersById,
          signedInMember,
          task,
        });
        const canStartTask = assignmentState.canStartWork;
        const canRequestQa =
          task.status === "in-progress" &&
          !isTaskBlocked(task);
        const checklistItems = task.checklistItems ?? [];
        const canRequestHelp = task.status === "in-progress";
        const hasQaReport = qaReviews.some(
          (review) =>
            review.taskId === task.id ||
            (review.subjectType === "task" && review.subjectId === task.id),
        );
        const exceptionPills = [
          openDependencies.length > 0 ? (
            <StatusPill
              key="dependencies"
              label={`${openDependencies.length} dependenc${openDependencies.length === 1 ? "y" : "ies"}`}
              value="waiting"
            />
          ) : null,
          isTaskBlocked(task) ? <StatusPill key="blocked" label="Blocked" value="critical" /> : null,
          isOverdue ? <StatusPill key="overdue" label="Overdue" value="critical" /> : null,
          isDueSoon ? <StatusPill key="due-soon" label="Due soon" value="waiting" /> : null,
          isOverEstimate ? <StatusPill key="over-estimate" label="Over estimate" value="critical" /> : null,
          !task.ownerId ? <StatusPill key="unassigned" label="Unassigned" value="warning" /> : null,
          task.linkedManufacturingIds.length > 0 ? (
            <StatusPill key="fabrication" label="Fabrication" value="waiting" />
          ) : null,
          task.linkedPurchaseIds.length > 0 ? (
            <StatusPill key="purchase" label="Purchase" value="requested" />
          ) : null,
          assignmentState.isClaimedByCurrentMember ? (
            <StatusPill key="claimed-you" label="Yours" value="in-progress" />
          ) : null,
          assignmentState.isClaimedByOtherMember ? (
            <StatusPill key="claimed-other" label={`Claimed by ${assignmentState.ownerName}`} value="waiting" />
          ) : null,
        ].filter(Boolean);

        return (
          <Pressable
            key={task.id}
            onPress={() => openEditTaskEditor(task)}
            style={[
              styles.queueRowCard,
              appResponsiveStyles.rowCard,
              isLandscapeCardLayout && styles.queueRowCardLandscape,
            ]}
          >
            <View style={isLandscapeCardLayout && styles.taskCardLandscapeContent}>
              <View style={isLandscapeCardLayout && styles.taskCardLandscapeMain}>
                <View style={styles.queueRowHeader}>
                  <View style={styles.queueRowPrimaryText}>
                    <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{task.title}</Text>
                    <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                      {subsystemName} - {disciplineName}
                    </Text>
                  </View>
                  <Text style={editTagStyle}>EDIT</Text>
                </View>

                <Text numberOfLines={isLandscapeCardLayout ? 3 : 2} style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>{task.summary}</Text>

                <View style={styles.queuePillRow}>
                  <StatusPill label={STATUS_LABELS[task.status]} value={task.status} />
                  <StatusPill label={`${task.priority} priority`} value={task.priority} />
                </View>

                {exceptionPills.length > 0 ? (
                  <View style={styles.queuePillRow}>{exceptionPills}</View>
                ) : null}

                <View style={styles.compactMetaGrid}>
                  {renderTaskMetaItem("Owner", ownerName)}
                  {renderTaskMetaItem("Due", formatDate(task.dueDate))}
                  {renderTaskMetaItem("Logged", `${loggedHours.toFixed(1)}h / Est ${task.estimatedHours.toFixed(1)}h`)}
                </View>
              </View>

              {isLandscapeCardLayout ? (
                <View style={styles.taskCardLandscapeAside}>
                  <View style={styles.compactMetaGrid}>
                    {renderTaskMetaItem("Milestone", targetEvent)}
                    {renderTaskMetaItem("Mechanism", mechanismName)}
                    {renderTaskMetaItem("Part", linkedPart)}
                  </View>
                </View>
              ) : null}
            </View>

            {task.blockers.length > 0 ? (
              <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
                <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>Blockers</Text>
                <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>{task.blockers.join(" | ")}</Text>
                <View style={styles.quickActionRow}>
                  <ActionButton
                    onPress={() => {
                      const blockingTask = openDependencies[0];
                      if (blockingTask) {
                        openEditTaskEditor(blockingTask);
                        return;
                      }
                      openBlockerResolution(task);
                    }}
                    variant="quick"
                    responsiveStyles={appResponsiveStyles}
                  >
                    {openDependencies.length > 0 ? "Open blocking task" : "Resolve blockers"}
                  </ActionButton>
                </View>
              </View>
            ) : null}

            {checklistItems.length > 0 ? (
              <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
                <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                  Checklist
                </Text>
                {checklistItems.map((item) => (
                  <Text
                    key={item}
                    style={[styles.calloutBody, appResponsiveStyles.calloutBody]}
                  >
                    - {item}
                  </Text>
                ))}
              </View>
            ) : null}

            {openDependencies.length > 0 ? (
              <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
                <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                  Waiting on dependencies
                </Text>
                <View style={styles.quickActionRow}>
                  {openDependencies.map((dependency) => {
                      const dependencyOwner = dependency.ownerId
                        ? (membersById[dependency.ownerId]?.name ?? "Unassigned")
                        : "Unassigned";
                      const dependencySubsystem =
                        subsystemsById[(dependency.subsystemIds[0] ?? "")]?.name ?? "Unknown subsystem";

                      return (
                        <Pressable
                          key={dependency.id}
                          onPress={() => openEditTaskEditor(dependency)}
                          style={[
                            styles.quickActionButton,
                            appResponsiveStyles.quickActionButton,
                            {
                              alignItems: "flex-start",
                              gap: 2,
                              maxWidth: "100%",
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.quickActionButtonLabel,
                              appResponsiveStyles.quickActionButtonLabel,
                            ]}
                          >
                            {dependency.title}
                          </Text>
                          <Text
                            numberOfLines={2}
                            style={[styles.calloutBody, appResponsiveStyles.calloutBody]}
                          >
                            {`${STATUS_LABELS[dependency.status]} - due ${formatDate(dependency.dueDate)} - ${dependencySubsystem} - ${dependencyOwner}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              </View>
            ) : null}

            <View style={styles.quickActionRow}>
              {assignmentState.canClaim ? (
                <ActionButton
                  onPress={() => {
                    void claimTask(task);
                  }}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Claim only
                </ActionButton>
              ) : null}
              {canStartTask ? (
                <ActionButton
                  onPress={() => {
                    void startTask(task);
                  }}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  {getTaskStartActionLabel(task)}
                </ActionButton>
              ) : null}
              {assignmentState.canRelease ? (
                <ActionButton
                  onPress={() => {
                    void releaseTask(task);
                  }}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Release
                </ActionButton>
              ) : null}
              {assignmentState.canReassign ? (
                <ActionButton
                  onPress={() => taskReassignModal.open(task)}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Reassign
                </ActionButton>
              ) : null}
              {!hasQaReport ? (
                <ActionButton
                  onPress={() => openCreateWorkLogEditor(task.id)}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Log work
                </ActionButton>
              ) : null}
              {canRequestQa && !hasQaReport ? (
                <ActionButton
                  onPress={() => {
                    void requestTaskQa(task);
                  }}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Request QA
                </ActionButton>
              ) : null}
              {canSubmitQa && task.status === "waiting-for-qa" ? (
                <ActionButton
                  accessibilityRole="button"
                  onPress={() => openCreateQaReportEditor(task.id, qaRequests.find((request) => request.taskId === task.id)?.id)}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Write QA report
                </ActionButton>
              ) : null}
              {canRequestHelp ? (
                <ActionButton
                  onPress={() => setHelpRequestTask(task)}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Need help
                </ActionButton>
              ) : null}
              {hasQaReport ? (
                <ActionButton
                  onPress={() => setSelectedQaTaskId(task.id)}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  QA report
                </ActionButton>
              ) : null}
            </View>
          </Pressable>
        );
          })}
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
