import type { Member, PartDefinition, QaReport } from "../../types/domain";
import { getQaReviewTaskId } from "../../app/appModel";
import { EditorModal } from "../../ui/ui";
import { View } from "react-native";

import { Text } from "../../i18n";
import { styles } from "../../ui/styles";
import { useAppTheme } from "../../ui/themeContext";

type Props = { review: QaReport | null; membersById: Record<string, Member>; partDefinitionsById?: Record<string, PartDefinition>; onClose: () => void };

type QaDetailRow = {
  label: string;
  value: string;
  multiline?: boolean;
};

export function QaReviewDetail({ review, membersById, partDefinitionsById = {}, onClose }: Props) {
  const recordedRevisions = Object.entries(review?.targetRevisions ?? {});
  const hasPartTarget = review?.targetRefs.some((target) => target.kind === "part-definition" || target.kind === "part-instance") ?? false;
  const unavailableRevision = recordedRevisions.some(([id]) => !partDefinitionsById[id]);
  const staleRevision = recordedRevisions.some(([id, revision]) => partDefinitionsById[id]?.revision !== revision);
  const evidenceFreshness = review?.needsReverification
    ? "Needs re-verification: this historical evidence does not verify the target."
    : unavailableRevision
    ? "Unknown: current part definitions are unavailable."
    : staleRevision
      ? "Stale: one or more part definitions have changed since this review."
      : recordedRevisions.length
        ? "Current for the recorded part definitions."
        : "Unknown: this report has no recorded target revisions.";
  const rows: QaDetailRow[] = review ? [
    { label: "QA item", value: review.summary || getQaReviewTaskId(review) || "QA report" },
    { label: "Participants", value: review.participantIds.map((id) => membersById[id]?.name ?? id).join(", ") || "Not recorded" },
    { label: "Reviewer", value: review.status === "reviewed" && review.reviewedById ? membersById[review.reviewedById]?.name ?? "Unknown reviewer" : "Not reviewed" },
    ...(review.mentorId ? [{ label: "Assigned mentor", value: membersById[review.mentorId]?.name ?? "Unknown mentor" }] : []),
    { label: "Result", value: review.result.replaceAll("-", " ") },
    { label: "Review status", value: review.status },
    { label: "Notes", value: review.notes, multiline: true },
    ...(review.evidenceNotes ? [{ label: "Evidence", value: review.evidenceNotes, multiline: true }] : []),
    ...(recordedRevisions.length || hasPartTarget ? [{ label: "Evidence freshness", value: evidenceFreshness, multiline: true }] : []),
    ...(review.result === "iteration-worthy" ? [{ label: "Follow-up", value: "This finding should create or anchor a design iteration.", multiline: true }] : []),
  ] : [];
  return <EditorModal title={review?.summary ?? "QA report"} visible={Boolean(review)}
    onCancel={onClose} onSave={onClose} saveLabel="Done">
    <View style={styles.modalContent}>
      {rows.map((row) => <QaDetailField key={row.label} {...row} />)}
    </View>
  </EditorModal>;
}

function QaDetailField({ label, value, multiline = false }: QaDetailRow) {
  const { colors: themeColors } = useAppTheme();

  return (
    <View style={styles.modalField}>
      <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>{label}</Text>
      <View
        style={[
          styles.modalFieldInput,
          {
            backgroundColor: themeColors.canvas,
            borderColor: themeColors.border,
            minHeight: multiline ? 92 : 52,
            justifyContent: multiline ? "flex-start" : "center",
          },
        ]}
      >
        <Text
          style={{
            color: themeColors.ink,
            fontSize: 16,
            fontWeight: "800",
            lineHeight: 22,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
