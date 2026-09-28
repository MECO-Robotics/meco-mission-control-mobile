import type { Member, QaReview } from "../../types/domain";
import { EditorModal } from "../../ui/ui";
import { View } from "react-native";

import { Text } from "../../i18n";
import { styles } from "../../ui/styles";
import { useAppTheme } from "../../ui/themeContext";

type Props = { review: QaReview | null; membersById: Record<string, Member>; onClose: () => void };

type QaDetailRow = {
  label: string;
  value: string;
  multiline?: boolean;
};

export function QaReviewDetail({ review, membersById, onClose }: Props) {
  const rows: QaDetailRow[] = review ? [
    { label: "QA item", value: review.subjectTitle },
    { label: "Requested by", value: review.requestedById ? membersById[review.requestedById]?.name ?? "Unknown person" : review.participantIds.map((id) => membersById[id]?.name ?? id).join(", ") || "Not recorded" },
    { label: "Reviewer", value: review.mentorId ? membersById[review.mentorId]?.name ?? "Unknown reviewer" : "Not recorded" },
    { label: "Result", value: review.result.replaceAll("-", " ") },
    { label: "Mentor approval", value: review.mentorApproved ? "Approved" : "Pending" },
    { label: "Notes", value: review.notes, multiline: true },
    ...(review.evidenceNotes ? [{ label: "Evidence", value: review.evidenceNotes, multiline: true }] : []),
    ...(review.result === "iteration-worthy" ? [{ label: "Follow-up", value: "This finding should create or anchor a design iteration.", multiline: true }] : []),
  ] : [];
  return <EditorModal title={review?.subjectTitle ?? "QA result"} visible={Boolean(review)}
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
