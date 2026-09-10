import type { Member, QaReview } from "../../types/domain";
import { EditorModal } from "../../ui/ui";
import { QaDetailFields, type QaDetailRow } from "./QaDetailFields";

type Props = { review: QaReview | null; membersById: Record<string, Member>; onClose: () => void };
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
    <QaDetailFields rows={rows} />
  </EditorModal>;
}
