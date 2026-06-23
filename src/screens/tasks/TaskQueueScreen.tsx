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
import type { Task } from "../../types/domain";

import type { AppScreenProps } from "../types";
import { NeedHelpModal } from "../help/NeedHelpModal";
import { TaskQueueFilterSheet } from "../taskQueue/TaskQueueFilterSheet";
import { TaskReassignModal } from "../taskQueue/TaskReassignModal";
import { useTaskReassignModal } from "../taskQueue/useTaskReassignModal";

export function TaskQueueScreen(props: AppScreenProps) {
  const {
    activeTaskSubteam,
    activeTaskSubteamLabel,
    appResponsiveStyles,
    canReassignTasks,
    claimTask,
    clearTaskBlockers,
    disciplinesById,
    editTagStyle,
    eventsById,
    filteredTaskQueue,
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
    setTaskArchiveFilter,
    setTaskBlockerFilter,
    setTaskOwnerFilter,
    setTaskPriorityFilter,
    setTaskSearch,
    setTaskStatusFilter,
    setTaskSubsystemFilter,
    setActiveTab,
    signedInMember,
    startTask,
    subsystems,
    subsystemsById,
    taskArchiveFilter,
    taskBlockerFilter,
    taskById,
    taskOwnerFilter,
    taskPriorityFilter,
    taskQueueSections,
    taskSearch,
    taskStatusFilter,
    taskSubsystemFilter,
    taskLoggedHoursById,
    taskSummary,
    themeColors,
    qaReviews,
  } = props;
  const [blockerResolutionTask, setBlockerResolutionTask] = useState<Task | null>(null);
  const [blockerResolutionNote, setBlockerResolutionNote] = useState("");
  const [blockerResolutionError, setBlockerResolutionError] = useState<string | null>(null);
  const [helpRequestTask, setHelpRequestTask] = useState<Task | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
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

    await clearTaskBlockers(blockerResolutionTask, blockerResolutionNote);
    closeBlockerResolution();
  };

  const resetTaskQueueFilters = () => {
    setTaskSearch("");
    setTaskSubsystemFilter("all");
    setTaskOwnerFilter("all");
    setTaskStatusFilter("all");
    setTaskPriorityFilter("all");
    setTaskBlockerFilter("all");
    setTaskArchiveFilter("active");
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
          <Pressable onPress={openCreateTaskEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
            <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add</Text>
          </Pressable>
        </View>
      }
    >
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

      {taskQueueSections.map((section) => (
        <View key={section.id}>
          {section.tasks.length > 0 ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                {section.title}
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {section.tasks.length} task{section.tasks.length === 1 ? "" : "s"}
              </Text>
            </View>
          ) : section.emptyTitle ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                {section.emptyTitle}
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {section.emptyBody}
              </Text>
            </View>
          ) : null}

          {section.tasks.map((task) => {
        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "Unknown";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";
        const disciplineName = disciplinesById[task.disciplineId]?.name ?? "Unknown discipline";
        const mechanismName = task.mechanismId
          ? (mechanismsById[task.mechanismId]?.name ?? "Unknown mechanism")
          : "No mechanism";
        const linkedPart = task.partInstanceId
          ? (partInstancesById[task.partInstanceId]?.name ?? "Unknown part")
          : "No part";
        const targetEvent = task.targetEventId
          ? (eventsById[task.targetEventId]?.title ?? "Event")
          : "No event";
        const openDependencies = task.dependencyIds
          .map((dependencyId) => taskById[dependencyId])
          .filter((dependency): dependency is Task => Boolean(dependency))
          .filter((dependency) => dependency.status !== "complete");
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
          hasOpenDependencies: openDependencies.length > 0,
          membersById,
          signedInMember,
          task,
        });
        const canStartTask = assignmentState.canStartWork;
        const canRequestQa =
          task.status === "in-progress" &&
          task.blockers.length === 0 &&
          openDependencies.length === 0;
        const canRequestHelp = task.status === "in-progress";
        const checklistItems = task.checklistItems ?? [];
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
          task.blockers.length > 0 ? <StatusPill key="blocked" label="Blocked" value="critical" /> : null,
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
                  <Pressable
                    onPress={() => {
                      const blockingTask = openDependencies[0];
                      if (blockingTask) {
                        openEditTaskEditor(blockingTask);
                        return;
                      }

                      openBlockerResolution(task);
                    }}
                    style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                  >
                    <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                      {openDependencies.length > 0 ? "Open blocking task" : "Resolve blockers"}
                    </Text>
                  </Pressable>
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
                        subsystemsById[dependency.subsystemId]?.name ?? "Unknown subsystem";

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
                <Pressable
                  onPress={() => {
                    void claimTask(task);
                  }}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Claim only
                  </Text>
                </Pressable>
              ) : null}
              {canStartTask ? (
                <Pressable
                  onPress={() => {
                    void startTask(task);
                  }}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    {getTaskStartActionLabel(task)}
                  </Text>
                </Pressable>
              ) : null}
              {assignmentState.canRelease ? (
                <Pressable
                  onPress={() => {
                    void releaseTask(task);
                  }}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Release
                  </Text>
                </Pressable>
              ) : null}
              {assignmentState.canReassign ? (
                <Pressable
                  onPress={() => taskReassignModal.open(task)}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Reassign
                  </Text>
                </Pressable>
              ) : null}
              {!hasQaReport ? (
                <Pressable
                  onPress={() => openCreateWorkLogEditor(task.id)}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Log work
                  </Text>
                </Pressable>
              ) : null}
              {canRequestQa && !hasQaReport ? (
                <Pressable
                  onPress={() => {
                    void requestTaskQa(task);
                  }}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Request QA
                  </Text>
                </Pressable>
              ) : null}
              {canRequestHelp ? (
                <Pressable
                  onPress={() => setHelpRequestTask(task)}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Need help
                  </Text>
                </Pressable>
              ) : null}
              {hasQaReport ? (
                <Pressable
                  onPress={() => setActiveTab("reports")}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    QA report
                  </Text>
                </Pressable>
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
            <Pressable
              onPress={resetTaskQueueFilters}
              style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
            >
              <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                Reset filters
              </Text>
            </Pressable>
            <Pressable
              onPress={openCreateTaskEditor}
              style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
            >
              <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                Add task
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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
        activeTaskSubteam={activeTaskSubteam}
        appResponsiveStyles={appResponsiveStyles}
        members={members}
        onClose={() => setIsFiltersOpen(false)}
        onReset={resetTaskQueueFilters}
        setActiveTaskSubteam={setActiveTaskSubteam}
        setTaskArchiveFilter={setTaskArchiveFilter}
        setTaskBlockerFilter={setTaskBlockerFilter}
        setTaskOwnerFilter={setTaskOwnerFilter}
        setTaskPriorityFilter={setTaskPriorityFilter}
        setTaskSearch={setTaskSearch}
        setTaskStatusFilter={setTaskStatusFilter}
        setTaskSubsystemFilter={setTaskSubsystemFilter}
        subsystems={subsystems}
        taskArchiveFilter={taskArchiveFilter}
        taskBlockerFilter={taskBlockerFilter}
        taskOwnerFilter={taskOwnerFilter}
        taskPriorityFilter={taskPriorityFilter}
        taskSearch={taskSearch}
        taskStatusFilter={taskStatusFilter}
        taskSubsystemFilter={taskSubsystemFilter}
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
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Current blockers
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {blockerResolutionTask.blockers.join(" | ")}
              </Text>
            </View>
            {blockerResolutionError ? (
              <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
                <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                  Resolution note required
                </Text>
                <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                  {blockerResolutionError}
                </Text>
              </View>
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
