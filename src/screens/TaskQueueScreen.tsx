import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import {
  STATUS_LABELS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../ui/constants";
import {
  formatDate,
  localTodayDate,
} from "../ui/helpers";
import { getDefaultHelpMentorId } from "../data/helpRequests";
import { styles } from "../ui/styles";
import {
  EditorModal,
  InteractionNote,
  ModalField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";
import type { Task } from "../types/domain";

import type { AppScreenProps } from "./types";
import { NeedHelpModal } from "./help/NeedHelpModal";
import { TaskQueueFilterSheet } from "./TaskQueueFilterSheet";

export function TaskQueueScreen(props: AppScreenProps) {
  const {
    activeTaskSubteam,
    activeTaskSubteamLabel,
    appResponsiveStyles,
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
    openCreateQaReportEditor,
    openCreateTaskEditor,
    openCreateWorkLogEditor,
    openDuplicateTaskEditor,
    openEditTaskEditor,
    partInstancesById,
    requestHelp,
    requestTaskQa,
    rosterMentors,
    setActiveTaskSubteam,
    setTaskArchiveFilter,
    setTaskBlockerFilter,
    setTaskOwnerFilter,
    setTaskPriorityFilter,
    setTaskSearch,
    setTaskStatusFilter,
    setTaskSubsystemFilter,
    shiftTaskDueDates,
    startTask,
    subsystems,
    subsystemsById,
    taskArchiveFilter,
    taskBlockerFilter,
    taskById,
    taskOwnerFilter,
    taskPriorityFilter,
    taskSearch,
    taskStatusFilter,
    taskSubsystemFilter,
    taskLoggedHoursById,
    taskSummary,
    themeColors,
  } = props;
  const [blockerResolutionTask, setBlockerResolutionTask] = useState<Task | null>(null);
  const [blockerResolutionNote, setBlockerResolutionNote] = useState("");
  const [blockerResolutionError, setBlockerResolutionError] = useState<string | null>(null);
  const [helpRequestTask, setHelpRequestTask] = useState<Task | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isShiftDueDatesOpen, setIsShiftDueDatesOpen] = useState(false);
  const [shiftDayDelta, setShiftDayDelta] = useState("7");
  const [shiftDueDateError, setShiftDueDateError] = useState<string | null>(null);
  const mentorOptions = rosterMentors.map((mentor) => ({ id: mentor.id, name: mentor.name }));
  const defaultHelpMentorId = getDefaultHelpMentorId(helpRequestTask, rosterMentors);
  const shiftableTasks = filteredTaskQueue.filter((task) => task.status !== "complete");

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

  const closeShiftDueDates = () => {
    setIsShiftDueDatesOpen(false);
    setShiftDueDateError(null);
  };

  const saveShiftDueDates = async () => {
    const dayDelta = Number(shiftDayDelta);

    if (!Number.isInteger(dayDelta) || dayDelta === 0) {
      setShiftDueDateError("Enter a whole number of days, like 7 or -3.");
      return;
    }

    if (shiftableTasks.length === 0) {
      setShiftDueDateError("No visible open tasks can be shifted.");
      return;
    }

    await shiftTaskDueDates(shiftableTasks, dayDelta);
    closeShiftDueDates();
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
          <Pressable
            onPress={() => setIsShiftDueDatesOpen(true)}
            style={[styles.primaryAction, appResponsiveStyles.primaryAction]}
          >
            <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>
              Shift due dates
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

      {filteredTaskQueue.map((task) => {
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
        const canStartTask =
          task.status === "not-started" &&
          task.blockers.length === 0 &&
          openDependencies.length === 0 &&
          Boolean(task.ownerId);
        const canRequestQa =
          task.status === "in-progress" &&
          task.blockers.length === 0 &&
          openDependencies.length === 0;
        const canRequestHelp = task.status === "in-progress";
        const checklistItems = task.checklistItems ?? [];

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
                  {task.linkedManufacturingIds.length > 0 ? (
                    <StatusPill label="Needs fabrication" value="waiting" />
                  ) : null}
                  {task.linkedPurchaseIds.length > 0 ? (
                    <StatusPill label="Needs purchase" value="requested" />
                  ) : null}
                  {!task.ownerId ? <StatusPill label="Unassigned" value="warning" /> : null}
                  {openDependencies.length > 0 ? (
                    <StatusPill
                      label={`${openDependencies.length} dependency${openDependencies.length === 1 ? "" : "ies"} open`}
                      value="waiting"
                    />
                  ) : null}
                  {isOverEstimate ? (
                    <StatusPill label="Over estimate" value="critical" />
                  ) : null}
                  {isOverdue ? <StatusPill label="Overdue" value="critical" /> : null}
                  {isDueSoon ? <StatusPill label="Due soon" value="waiting" /> : null}
                </View>
              </View>

              <View style={isLandscapeCardLayout && styles.taskCardLandscapeAside}>
                <View style={styles.compactMetaGrid}>
                  <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>Owner {ownerName}</Text>
                  </View>
                  <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>Due {formatDate(task.dueDate)}</Text>
                  </View>
                  <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>Milestone {targetEvent}</Text>
                  </View>
                  <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>Mechanism {mechanismName}</Text>
                  </View>
                  <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>Part {linkedPart}</Text>
                  </View>
                  <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>
                      Logged {loggedHours.toFixed(1)}h / Est {task.estimatedHours.toFixed(1)}h
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {task.blockers.length > 0 ? (
              <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
                <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>Blockers</Text>
                <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>{task.blockers.join(" | ")}</Text>
                <View style={styles.quickActionRow}>
                  <Pressable
                    onPress={() => openBlockerResolution(task)}
                    style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                  >
                    <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                      Resolve blockers
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
              {canStartTask ? (
                <Pressable
                  onPress={() => {
                    void startTask(task);
                  }}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Start task
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => openCreateWorkLogEditor(task.id)}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
              >
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  Log work
                </Text>
              </Pressable>
              <Pressable
                onPress={() => openDuplicateTaskEditor(task)}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
              >
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  Copy task
                </Text>
              </Pressable>
              {canRequestQa ? (
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
              <Pressable
                onPress={() => openCreateQaReportEditor(task.id)}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
              >
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  QA report
                </Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}

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
      <EditorModal
        onCancel={closeShiftDueDates}
        onSave={saveShiftDueDates}
        saveLabel="Shift due dates"
        title="Shift visible due dates"
        visible={isShiftDueDatesOpen}
      >
        {shiftDueDateError ? (
          <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
            <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
              Check shift amount
            </Text>
            <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
              {shiftDueDateError}
            </Text>
          </View>
        ) : null}
        <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
          <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
            Visible open tasks
          </Text>
          <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
            {shiftableTasks.length} task{shiftableTasks.length === 1 ? "" : "s"} will move by this many days.
          </Text>
        </View>
        <ModalField
          label="Days to shift"
          keyboardType="numeric"
          onChangeText={(value) => {
            setShiftDueDateError(null);
            setShiftDayDelta(value);
          }}
          placeholder="7"
          value={shiftDayDelta}
        />
      </EditorModal>
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
