import { Pressable, View } from "react-native";

import { ActionButton } from "../../ui/ActionButton";
import { isTaskBlocked } from "../../data/taskReadiness";
import { Text } from "../../i18n";
import { STATUS_LABELS } from "../../ui/constants";
import { formatDate, localTodayDate, shiftDateByDays } from "../../ui/helpers";
import {
  getTaskAssignmentState,
  getTaskStartActionLabel,
} from "../../data/taskAssignment";
import { styles } from "../../ui/styles";
import { getQaReviewTaskId } from "../../app/appModel";
import { StatusPill } from "../../ui/ui";
import type { Task, TaskDependency } from "../../types/domain";
import type { TaskScreenProps } from "./taskScreenTypes";

type TaskQueueCardContext = Pick<TaskScreenProps,
  | "appResponsiveStyles" | "canReassignTasks" | "canSubmitQa"
  | "claimTask" | "workTypesById" | "editTagStyle" | "eventsById"
  | "isLandscapeCardLayout" | "mechanismsById" | "membersById"
  | "openCreateQaReportEditor" | "openCreateWorkLogEditor" | "openEditTaskEditor"
  | "partInstancesById" | "partDefinitionsById" | "qaRequests" | "qaReports" | "releaseTask"
  | "requestTaskQa" | "signedInMember" | "startTask" | "subsystemsById"
  | "taskById" | "taskDependencies" | "taskLoggedHoursById" | "themeColors"
>;

type TaskQueueCardActions = {
  onOpenHelpRequest: (task: Task) => void;
  onOpenQaReview: (task: Task) => void;
  onOpenReassign: (task: Task) => void;
};

export function TaskQueueCard({
  task,
  context,
  actions,
}: {
  task: Task;
  context: TaskQueueCardContext;
  actions: TaskQueueCardActions;
}) {
  const {
    appResponsiveStyles,
    canReassignTasks,
    canSubmitQa,
    claimTask,
    workTypesById,
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
  } = context;
  const { onOpenHelpRequest, onOpenQaReview, onOpenReassign } = actions;
  const subsystemName = subsystemsById[(task.subsystemIds[0] ?? "")]?.name ?? "Unknown";
  const ownerName = task.ownerId ? (membersById[task.ownerId]?.name ?? "Unassigned") : "Unassigned";
  const workTypeName = workTypesById[task.workTypeId]?.name ?? "Unknown work type";
  const mechanismName = task.mechanismIds[0]
    ? (mechanismsById[task.mechanismIds[0]]?.name ?? "Unknown mechanism")
    : "No mechanism";
  const linkedPart = task.partInstanceIds[0]
    ? (context.partDefinitionsById[partInstancesById[task.partInstanceIds[0]]?.partDefinitionId ?? ""]?.name ?? "Unknown part")
    : "No part";
  const targetEvent = task.scheduleRefs[0] ? (eventsById[`${task.scheduleRefs[0].kind}:${task.scheduleRefs[0].id}`]?.title ?? "Schedule item") : "No schedule item";
  const openDependencies = taskDependencies
    .filter((edge): edge is Extract<TaskDependency, { kind: "task" }> => edge.taskId === task.id && edge.kind === "task" && edge.dependencyType === "hard")
    .filter((edge) => taskById[edge.refId]?.status !== edge.requiredState)
    .map((edge) => taskById[edge.refId])
    .filter((dependency): dependency is Task => Boolean(dependency));
  const loggedHours = taskLoggedHoursById[task.id] ?? task.actualHours;
  const isOverEstimate = task.estimatedHours > 0 && loggedHours > task.estimatedHours;
  const todayDate = localTodayDate();
  const soonDate = shiftDateByDays(todayDate, 7);
  const isOverdue = task.status !== "complete" && task.dueDate < todayDate;
  const isDueSoon = task.status !== "complete" && task.dueDate >= todayDate && task.dueDate <= soonDate;
  const assignmentState = getTaskAssignmentState({ canReassignTasks, membersById, signedInMember, task });
  const canRequestQa = task.status === "in-progress" && !isTaskBlocked(task);
  const checklistItems = task.checklistItems ?? [];
  const hasQaReport = qaReports.some((review) => getQaReviewTaskId(review) === task.id);
  const exceptionPills = [
    openDependencies.length > 0 ? (
      <StatusPill key="dependencies" label={`${openDependencies.length} dependenc${openDependencies.length === 1 ? "y" : "ies"}`} value="waiting" />
    ) : null,
    isTaskBlocked(task) ? <StatusPill key="blocked" label="Blocked" value="critical" /> : null,
    isOverdue ? <StatusPill key="overdue" label="Overdue" value="critical" /> : null,
    isDueSoon ? <StatusPill key="due-soon" label="Due soon" value="waiting" /> : null,
    isOverEstimate ? <StatusPill key="over-estimate" label="Over estimate" value="critical" /> : null,
    !task.ownerId ? <StatusPill key="unassigned" label="Unassigned" value="warning" /> : null,
    task.manufacturingDetails ? <StatusPill key="fabrication" label="Manufacturing" value="waiting" /> : null,
    assignmentState.isClaimedByCurrentMember ? <StatusPill key="claimed-you" label="Yours" value="in-progress" /> : null,
    assignmentState.isClaimedByOtherMember ? (
      <StatusPill key="claimed-other" label={`Claimed by ${assignmentState.ownerName}`} value="waiting" />
    ) : null,
  ].filter(Boolean);
  const renderMetaItem = (label: string, value: string) => (
    <View style={[styles.compactMetaItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      <Text style={[styles.compactMetaText, { color: themeColors.subtleText }]}>{label} {value}</Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => openEditTaskEditor(task)}
      style={[styles.queueRowCard, appResponsiveStyles.rowCard, isLandscapeCardLayout && styles.queueRowCardLandscape]}
    >
      <View style={isLandscapeCardLayout && styles.taskCardLandscapeContent}>
        <View style={isLandscapeCardLayout && styles.taskCardLandscapeMain}>
          <View style={styles.queueRowHeader}>
            <View style={styles.queueRowPrimaryText}>
              <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{task.title}</Text>
              <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>{subsystemName} - {workTypeName}</Text>
            </View>
            <Text style={editTagStyle}>EDIT</Text>
          </View>
          <Text numberOfLines={isLandscapeCardLayout ? 3 : 2} style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>{task.summary}</Text>
          <View style={styles.queuePillRow}>
            <StatusPill label={STATUS_LABELS[task.status]} value={task.status} />
            <StatusPill label={`${task.priority} priority`} value={task.priority} />
          </View>
          {exceptionPills.length > 0 ? <View style={styles.queuePillRow}>{exceptionPills}</View> : null}
          <View style={styles.compactMetaGrid}>
            {renderMetaItem("Owner", ownerName)}
            {renderMetaItem("Due", formatDate(task.dueDate))}
            {renderMetaItem("Logged", `${loggedHours.toFixed(1)}h / Est ${task.estimatedHours.toFixed(1)}h`)}
          </View>
        </View>
        {isLandscapeCardLayout ? (
          <View style={styles.taskCardLandscapeAside}>
            <View style={styles.compactMetaGrid}>
              {renderMetaItem("Milestone", targetEvent)}
              {renderMetaItem("Mechanism", mechanismName)}
              {renderMetaItem("Part", linkedPart)}
            </View>
          </View>
        ) : null}
      </View>

      {isTaskBlocked(task) ? (
        <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
          <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>Blocked by unresolved work</Text>
          <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>Review linked dependencies and risks in their owning domains.</Text>
          <View style={styles.quickActionRow}>
            <ActionButton onPress={() => {
              const blockingTask = openDependencies[0];
              if (blockingTask) openEditTaskEditor(blockingTask);
            }} variant="quick" responsiveStyles={appResponsiveStyles}>
              {openDependencies.length > 0 ? "Open blocking task" : "View dependencies"}
            </ActionButton>
          </View>
        </View>
      ) : null}

      {checklistItems.length > 0 ? (
        <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
          <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>Checklist</Text>
          {checklistItems.map((item) => <Text key={item} style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>- {item}</Text>)}
        </View>
      ) : null}

      {openDependencies.length > 0 ? (
        <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
          <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>Waiting on dependencies</Text>
          <View style={styles.quickActionRow}>
            {openDependencies.map((dependency) => {
              const dependencyOwner = dependency.ownerId ? (membersById[dependency.ownerId]?.name ?? "Unassigned") : "Unassigned";
              const dependencySubsystem = subsystemsById[(dependency.subsystemIds[0] ?? "")]?.name ?? "Unknown subsystem";
              return (
                <Pressable key={dependency.id} onPress={() => openEditTaskEditor(dependency)}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton,
                    { alignItems: "flex-start", gap: 2, maxWidth: "100%" }]}>
                  <Text numberOfLines={2} style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>{dependency.title}</Text>
                  <Text numberOfLines={2} style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                    {`${STATUS_LABELS[dependency.status]} - due ${formatDate(dependency.dueDate)} - ${dependencySubsystem} - ${dependencyOwner}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.quickActionRow}>
        {assignmentState.canClaim ? <ActionButton onPress={() => { void claimTask(task); }} variant="quick" responsiveStyles={appResponsiveStyles}>Claim only</ActionButton> : null}
        {assignmentState.canStartWork ? <ActionButton onPress={() => { void startTask(task); }} variant="quick" responsiveStyles={appResponsiveStyles}>{getTaskStartActionLabel(task)}</ActionButton> : null}
        {assignmentState.canRelease ? <ActionButton onPress={() => { void releaseTask(task); }} variant="quick" responsiveStyles={appResponsiveStyles}>Release</ActionButton> : null}
        {assignmentState.canReassign ? <ActionButton onPress={() => onOpenReassign(task)} variant="quick" responsiveStyles={appResponsiveStyles}>Reassign</ActionButton> : null}
        {!hasQaReport ? <ActionButton onPress={() => openCreateWorkLogEditor(task.id)} variant="quick" responsiveStyles={appResponsiveStyles}>Log work</ActionButton> : null}
        {canRequestQa && !hasQaReport ? <ActionButton onPress={() => { void requestTaskQa(task); }} variant="quick" responsiveStyles={appResponsiveStyles}>Request QA</ActionButton> : null}
        {canSubmitQa && task.status === "waiting-for-qa" ? (
          <ActionButton accessibilityRole="button"
            onPress={() => openCreateQaReportEditor(task.id, qaRequests.find((request) => request.targetRefs.some((target) => target.kind === "task" && target.id === task.id))?.id)}
            variant="quick" responsiveStyles={appResponsiveStyles}>Write QA report</ActionButton>
        ) : null}
        {task.status === "in-progress" ? <ActionButton onPress={() => onOpenHelpRequest(task)} variant="quick" responsiveStyles={appResponsiveStyles}>Need help</ActionButton> : null}
        {hasQaReport ? <ActionButton onPress={() => onOpenQaReview(task)} variant="quick" responsiveStyles={appResponsiveStyles}>QA report</ActionButton> : null}
      </View>
    </Pressable>
  );
}
