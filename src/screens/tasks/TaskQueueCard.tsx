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
import type { DomainReference, ReadinessStatus, RiskSource, Task } from "../../types/domain";
import type { TaskScreenProps } from "./taskScreenTypes";

type TaskQueueCardContext = Pick<TaskScreenProps,
  | "appResponsiveStyles" | "canReassignTasks" | "canSubmitQa"
  | "claimTask" | "workTypesById" | "editTagStyle" | "eventsById" | "workstreamsById"
  | "isLandscapeCardLayout" | "mechanismsById" | "milestonesById" | "membersById"
  | "openCreateQaReportEditor" | "openCreateWorkLogEditor" | "openEditTaskEditor"
  | "partInstancesById" | "partDefinitionsById" | "qaRequests" | "qaReports" | "releaseTask"
  | "requestTaskQa" | "signedInMember" | "startTask" | "subsystemsById"
  | "taskById" | "taskDependencies" | "taskLoggedHoursById" | "themeColors"
  | "risks" | "setActiveTab"
>;

type TaskQueueCardActions = {
  onOpenHelpRequest: (task: Task) => void;
  onOpenQaReview: (task: Task) => void;
  onOpenReassign: (task: Task) => void;
};

const READINESS_ORDER: Record<ReadinessStatus, number> = {
  "not-ready": 0,
  blocked: 1,
  qa: 2,
  ready: 3,
};

function isBelowRequiredReadiness(current: ReadinessStatus | undefined, required: ReadinessStatus) {
  return current === undefined || READINESS_ORDER[current] < READINESS_ORDER[required];
}

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
    workstreamsById,
    editTagStyle,
    eventsById,
    isLandscapeCardLayout,
    mechanismsById,
    milestonesById,
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
    risks,
    setActiveTab,
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
  const openDependencies = taskDependencies.filter((edge) => {
    if (edge.taskId !== task.id || edge.dependencyType !== "hard") return false;
    if (edge.kind === "task") return taskById[edge.refId]?.status !== edge.requiredState;
    if (edge.kind === "milestone") return isBelowRequiredReadiness(milestonesById[edge.refId]?.readinessStatus, edge.requiredState);
    const partInstance = partInstancesById[edge.refId];
    return edge.requiredCondition.kind === "physical-location"
      ? partInstance?.location.kind !== edge.requiredCondition.value
      : isBelowRequiredReadiness(partInstance?.readinessStatus, edge.requiredCondition.value);
  });
  const actionableDependency = openDependencies.find((edge) => edge.kind === "task"
    ? Boolean(taskById[edge.refId])
    : edge.kind === "part-instance" ? Boolean(partInstancesById[edge.refId]) : Boolean(milestonesById[edge.refId]));
  const taskDependencyIds = new Set(taskDependencies.filter((edge) => edge.taskId === task.id).map((edge) => edge.id));
  const matchesTaskOrDependency = (reference: RiskSource | DomainReference) => {
    if (reference.kind === "task") return reference.id === task.id;
    return reference.kind === "task-dependency" && taskDependencyIds.has(reference.id);
  };
  const blockingRisks = risks.filter((risk) => risk.status !== "resolved" && risk.blocksWork && (
    matchesTaskOrDependency(risk.source) || risk.relatedTargets.some(matchesTaskOrDependency)
  ));
  const loggedHours = taskLoggedHoursById[task.id] ?? task.actualHours;
  const isOverEstimate = task.estimatedHours > 0 && loggedHours > task.estimatedHours;
  const todayDate = localTodayDate();
  const soonDate = shiftDateByDays(todayDate, 7);
  const isOverdue = task.status !== "complete" && task.dueDate < todayDate;
  const isDueSoon = task.status !== "complete" && task.dueDate >= todayDate && task.dueDate <= soonDate;
  const assignmentState = getTaskAssignmentState({ canReassignTasks, membersById, signedInMember, task });
  const hasPendingQaRequest = qaRequests.some((request) =>
    request.status !== "complete" && request.status !== "cancelled" &&
    request.targetRefs.some((target) => target.kind === "task" && target.id === task.id));
  const canLogWork = task.status !== "complete";
  const canRequestQa = task.status === "in-progress" && !isTaskBlocked(task) && !hasPendingQaRequest;
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
            {task.workstreamIds.length ? renderMetaItem("Workstreams", task.workstreamIds.map((id) => workstreamsById[id]?.name ?? "Unknown workstream").join(", ")) : null}
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
          {openDependencies.length > 0 ? (
            <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>Review the unresolved hard dependency.</Text>
          ) : null}
          {blockingRisks.length > 0 ? blockingRisks.map((risk) => (
            <View key={risk.id}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>{risk.title}</Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>{risk.detail}</Text>
            </View>
          )) : openDependencies.length === 0 ? (
            <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>No linked blocker details are available.</Text>
          ) : null}
          {actionableDependency || blockingRisks.length > 0 ? <View style={styles.quickActionRow}>
            <ActionButton onPress={() => {
              const dependency = actionableDependency;
              if (!dependency) setActiveTab("work-risks");
              else if (dependency.kind === "task") {
                const blockingTask = taskById[dependency.refId];
                if (blockingTask) openEditTaskEditor(blockingTask);
              } else if (dependency.kind === "part-instance") {
                if (partInstancesById[dependency.refId]) setActiveTab("resources-parts");
              } else if (milestonesById[dependency.refId]) setActiveTab("work-schedule");
            }} variant="quick" responsiveStyles={appResponsiveStyles}>
              {actionableDependency?.kind === "task" ? "Open blocking task"
                : actionableDependency?.kind === "part-instance" ? "View part inventory"
                  : actionableDependency?.kind === "milestone" ? "View schedule" : "View blocking risk"}
            </ActionButton>
          </View> : null}
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
              if (dependency.kind === "task") {
                const blockingTask = taskById[dependency.refId];
                const dependencyOwner = blockingTask?.ownerId ? (membersById[blockingTask.ownerId]?.name ?? "Unassigned") : "Unassigned";
                const dependencySubsystem = blockingTask ? subsystemsById[(blockingTask.subsystemIds[0] ?? "")]?.name ?? "Unknown subsystem" : "Unavailable";
                return (
                  <Pressable key={dependency.id} onPress={() => { if (blockingTask) openEditTaskEditor(blockingTask); }}
                    style={[styles.quickActionButton, appResponsiveStyles.quickActionButton, { alignItems: "flex-start", gap: 2, maxWidth: "100%" }]}>
                    <Text numberOfLines={2} style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>{blockingTask?.title ?? `Blocking task unavailable (${dependency.refId})`}</Text>
                    <Text numberOfLines={2} style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                      {blockingTask ? `${STATUS_LABELS[blockingTask.status]} · required ${dependency.requiredState} · due ${formatDate(blockingTask.dueDate)} · ${dependencySubsystem} · ${dependencyOwner}` : `Required status: ${dependency.requiredState} · Current status: unavailable`}
                    </Text>
                  </Pressable>
                );
              }
              if (dependency.kind === "milestone") {
                const milestone = milestonesById[dependency.refId];
                return (
                  <Pressable key={dependency.id} onPress={() => { if (milestone) setActiveTab("work-schedule"); }}
                    style={[styles.quickActionButton, appResponsiveStyles.quickActionButton, { alignItems: "flex-start", gap: 2, maxWidth: "100%" }]}>
                    <Text numberOfLines={2} style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>{milestone?.title ?? `Milestone unavailable (${dependency.refId})`}</Text>
                    <Text numberOfLines={2} style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                      {`Required readiness: ${dependency.requiredState} · Current readiness: ${milestone?.readinessStatus ?? "unavailable"}${milestone ? ` · Milestone status: ${milestone.status}` : ""}`}
                    </Text>
                  </Pressable>
                );
              }
              const partInstance = partInstancesById[dependency.refId];
              const partDefinition = partInstance ? context.partDefinitionsById[partInstance.partDefinitionId] : undefined;
              const required = dependency.requiredCondition;
              const current = required.kind === "physical-location"
                ? partInstance
                  ? partInstance.location.kind === "stock" || partInstance.location.kind === "repair"
                    ? `${partInstance.location.kind} · ${partInstance.location.location}`
                    : partInstance.location.kind === "installed"
                      ? `installed · ${subsystemsById[partInstance.location.subsystemId]?.name ?? partInstance.location.subsystemId}${partInstance.location.mechanismId ? ` / ${mechanismsById[partInstance.location.mechanismId]?.name ?? partInstance.location.mechanismId}` : ""}`
                      : partInstance.location.kind
                  : "unavailable"
                : partInstance?.readinessStatus ?? "unavailable";
              const label = partInstance
                ? `${partDefinition?.name ?? `Part definition unavailable (${partInstance.partDefinitionId})`} · instance ${partInstance.id}`
                : `Part instance unavailable (${dependency.refId})`;
              return (
                <Pressable key={dependency.id} onPress={() => { if (partInstance) setActiveTab("resources-parts"); }}
                  style={[styles.quickActionButton, appResponsiveStyles.quickActionButton, { alignItems: "flex-start", gap: 2, maxWidth: "100%" }]}>
                  <Text numberOfLines={2} style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>{label}</Text>
                  <Text numberOfLines={2} style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                    {`Required ${required.kind === "physical-location" ? "physical location" : "derived readiness"}: ${required.value} · Current ${required.kind === "physical-location" ? "physical location" : "derived readiness"}: ${current}`}
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
        {canLogWork ? <ActionButton onPress={() => openCreateWorkLogEditor(task.id)} variant="quick" responsiveStyles={appResponsiveStyles}>Log work</ActionButton> : null}
        {canRequestQa ? <ActionButton onPress={() => { void requestTaskQa(task); }} variant="quick" responsiveStyles={appResponsiveStyles}>Request QA</ActionButton> : null}
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
