import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import { buildHelpRequestDisplayRows } from "../data/helpRequests";
import { SUBVIEW_INTERACTION_GUIDANCE } from "../ui/constants";
import { formatDateTime } from "../ui/helpers";
import { styles } from "../ui/styles";
import {
  DropdownField,
  EmptyState,
  EditorModal,
  InteractionNote,
  ModalField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";

import type { AppScreenProps } from "./types";
import { QaDetailFields, type QaDetailRow } from "./reports/QaDetailFields";

const QA_FIX_SIZE_RANK: Record<string, number> = {
  "iteration-worthy": 0,
  "minor-fix": 1,
  pass: 2,
};

const formatQaStatus = (value: string) =>
  value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export function ReportsScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    createQaRequest,
    helpRequests,
    membersById,
    openCreateQaReportEditor,
    qaRequests,
    qaReviews,
    reportSummary,
    rosterMentors,
    taskById,
    tasks,
    workLogs,
  } = props;
  const [isQaRequestOpen, setIsQaRequestOpen] = useState(false);
  const [qaRequestDraft, setQaRequestDraft] = useState({
    taskId: "",
    subject: "",
    mentorId: rosterMentors[0]?.id ?? "",
  });
  const [selectedQaReviewId, setSelectedQaReviewId] = useState<string | null>(null);
  const mentorOptions = rosterMentors.map((mentor) => ({ id: mentor.id, name: mentor.name }));
  const taskOptions = tasks.map((task) => ({ id: task.id, name: task.title }));
  const workLogsById = Object.fromEntries(
    workLogs.map((workLog) => [workLog.id, workLog]),
  );
  const helpRequestRows = buildHelpRequestDisplayRows({
    helpRequests,
    membersById,
    taskById,
    workLogsById,
  });
  const canSubmitQaRequest = Boolean(
    (qaRequestDraft.subject.trim() || qaRequestDraft.taskId) && qaRequestDraft.mentorId,
  );
  const selectedQaReview = qaReviews.find((review) => review.id === selectedQaReviewId);
  const sortedQaReviews = useMemo(
    () =>
      [...qaReviews].sort((left, right) => {
        const createdDelta =
          ((right as typeof right & { createdAt?: string }).createdAt ?? right.id)
            .localeCompare((left as typeof left & { createdAt?: string }).createdAt ?? left.id);
        if (createdDelta !== 0) {
          return createdDelta;
        }

        const leftTask = left.taskId ? taskById[left.taskId] : null;
        const rightTask = right.taskId ? taskById[right.taskId] : null;
        const dependencyDelta =
          (rightTask?.dependencyIds.length ?? 0) - (leftTask?.dependencyIds.length ?? 0);
        if (dependencyDelta !== 0) {
          return dependencyDelta;
        }

        const fixSizeDelta = QA_FIX_SIZE_RANK[left.result] - QA_FIX_SIZE_RANK[right.result];
        if (fixSizeDelta !== 0) {
          return fixSizeDelta;
        }

        return left.subjectTitle.localeCompare(right.subjectTitle);
      }),
    [qaReviews, taskById],
  );
  const selectedQaReviewPeople = selectedQaReview
    ? selectedQaReview.participantIds
        .map((participantId) => membersById[participantId]?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ")
    : "";
  const selectedQaReviewRequester =
    selectedQaReview?.requestedById && membersById[selectedQaReview.requestedById]
      ? membersById[selectedQaReview.requestedById].name
      : selectedQaReviewPeople || "No participants";
  const selectedQaReviewMentor =
    selectedQaReview?.mentorId && membersById[selectedQaReview.mentorId]
      ? membersById[selectedQaReview.mentorId].name
      : selectedQaReview?.mentorApproved
        ? "Approved mentor"
        : "Pending mentor";
  const selectedQaReviewRows: QaDetailRow[] = selectedQaReview
    ? [
        { label: "QA item", value: selectedQaReview.subjectTitle },
        {
          label: "Student requested",
          value: selectedQaReviewRequester,
        },
        {
          label: "Mentor assigned",
          value: selectedQaReviewMentor,
        },
        { label: "QA status", value: formatQaStatus(selectedQaReview.result) },
        { label: "Notes", value: selectedQaReview.notes, multiline: true },
        selectedQaReview.evidenceNotes
          ? { label: "Evidence", value: selectedQaReview.evidenceNotes, multiline: true }
          : null,
      ].filter((row): row is QaDetailRow => Boolean(row))
    : [];

  const submitQaRequest = () => {
    if (!canSubmitQaRequest) {
      return;
    }

    createQaRequest(qaRequestDraft.subject, qaRequestDraft.mentorId, qaRequestDraft.taskId);
    setQaRequestDraft({ taskId: "", subject: "", mentorId: rosterMentors[0]?.id ?? "" });
    setIsQaRequestOpen(false);
  };

const renderScreen = () => {
  return (
    <WorkspacePanel
      title="QA reports"
      subtitle="Capture task QA outcomes and iteration-worthy follow-up in one place."
      actions={
        <Pressable onPress={() => setIsQaRequestOpen(true)} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Request QA</Text>
        </Pressable>
      }
    >
      <SummaryRow chips={reportSummary} />

      <EditorModal
        onCancel={() => setIsQaRequestOpen(false)}
        onSave={submitQaRequest}
        saveLabel="Submit request"
        title="Request QA"
        visible={isQaRequestOpen}
      >
        <View style={styles.queueRowHeader}>
          <View style={styles.queueRowPrimaryText}>
            <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
              Add the item that needs review and choose the mentor reviewer.
            </Text>
          </View>
          <StatusPill label="Requested" value="requested" />
        </View>
        <DropdownField
          clearLabel="No linked task"
          label="Linked task"
          onChange={(value) => {
            const task = tasks.find((candidate) => candidate.id === value);

            setQaRequestDraft((current) => ({
              ...current,
              taskId: value,
              subject: task ? task.title : current.subject,
            }));
          }}
          options={taskOptions}
          placeholder="Select task"
          value={qaRequestDraft.taskId}
        />
        <ModalField
          label="What needs QA"
          multiline
          onChangeText={(value) =>
            setQaRequestDraft((current) => ({ ...current, subject: value }))
          }
          placeholder="Describe the task, part, code change, or evidence that needs QA"
          value={qaRequestDraft.subject}
        />
        <DropdownField
          clearLabel="No mentor"
          label="Mentor reviewer"
          onChange={(value) =>
            setQaRequestDraft((current) => ({ ...current, mentorId: value }))
          }
          options={mentorOptions}
          placeholder="Select mentor"
          value={qaRequestDraft.mentorId}
        />
      </EditorModal>

      <EditorModal
        onCancel={() => setSelectedQaReviewId(null)}
        onSave={() => setSelectedQaReviewId(null)}
        saveLabel="Done"
        title={selectedQaReview?.subjectTitle ?? "QA report"}
        visible={Boolean(selectedQaReview)}
      >
        {selectedQaReview ? (
          <>
            <QaDetailFields rows={selectedQaReviewRows} />
            {selectedQaReview.result === "iteration-worthy" ? (
              <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
                <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                  Iteration
                </Text>
                <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                  This finding should create or anchor a design iteration.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </EditorModal>

      <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>Help requests</Text>
      <View style={styles.reportGrid}>
        {helpRequestRows.map((request) => (
          <View key={request.id} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                  {request.taskTitle}
                </Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  Mentor assigned: {request.mentorName}
                </Text>
              </View>
              <StatusPill label={formatQaStatus(request.status)} value={request.status} />
            </View>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Student requested: {request.requesterName}
            </Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Work log: {request.workLogLabel}
            </Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Requested {formatDateTime(request.createdAt)}
            </Text>
            <Text style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>
              {request.reason}
            </Text>
          </View>
        ))}
      </View>
      {helpRequestRows.length === 0 ? <EmptyState text="No help requests are waiting yet." /> : null}

      <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>QA requests</Text>
      <View style={styles.reportGrid}>
        {qaRequests.map((request) => {
          const mentor = membersById[request.mentorId]?.name ?? "Unassigned mentor";
          const requester = request.requestedById
            ? membersById[request.requestedById]?.name
            : null;
          const requesterLabel = requester ?? "Unknown student";
          const linkedTask = request.taskId ? taskById[request.taskId] : null;

          return (
            <View key={request.id} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
              <View style={styles.queueRowHeader}>
                <View style={styles.queueRowPrimaryText}>
                  <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{request.subject}</Text>
                  <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                    Mentor assigned: {mentor}
                  </Text>
                </View>
                <StatusPill label={formatQaStatus(request.status)} value={request.status} />
              </View>
              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                Student requested: {requesterLabel}
              </Text>
              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                QA status: {formatQaStatus(request.status)}
              </Text>
              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                Task: {linkedTask?.title ?? "Not linked"}
              </Text>
              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                Requested {formatDateTime(request.createdAt)}
              </Text>
              <View style={styles.quickActionRow}>
                <Pressable
                  disabled={!linkedTask}
                  onPress={() => {
                    if (linkedTask) {
                      openCreateQaReportEditor(linkedTask.id, request.id);
                    }
                  }}
                  style={[
                    styles.quickActionButton,
                    !linkedTask ? { opacity: 0.45 } : null,
                    appResponsiveStyles.quickActionButton,
                  ]}
                >
                  <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                    Write report
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      {qaRequests.length === 0 ? <EmptyState text="No QA requests are waiting yet." /> : null}

      <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>QA reports</Text>
      <View style={styles.reportGrid}>
        {sortedQaReviews.map((review) => {
          const people = review.participantIds
            .map((participantId) => membersById[participantId]?.name)
            .filter((name): name is string => Boolean(name))
            .join(", ");
          const requester =
            review.requestedById && membersById[review.requestedById]
              ? membersById[review.requestedById].name
              : people || "No participants";
          return (
            <Pressable
              key={review.id}
              onPress={() => setSelectedQaReviewId(review.id)}
              style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
            >
              <View style={styles.queueRowHeader}>
                <View style={styles.queueRowPrimaryText}>
                  <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{review.subjectTitle}</Text>
                  <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                    {requester} - mentor {review.mentorApproved ? "approved" : "pending"}
                  </Text>
                </View>
                <StatusPill label={formatQaStatus(review.result)} value={review.result} />
              </View>
              <Text style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>{review.notes}</Text>
              {review.evidenceNotes ? (
                <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                  Evidence: {review.evidenceNotes}
                </Text>
              ) : null}
              {review.result === "iteration-worthy" ? (
                <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
                  <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>Iteration</Text>
                  <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                    This finding should create or anchor a design iteration.
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.reports} />
    </WorkspacePanel>
  );
};

  return renderScreen();
}
