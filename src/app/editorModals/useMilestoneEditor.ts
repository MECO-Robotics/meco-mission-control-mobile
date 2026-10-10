import { useEditorDraft } from "./useEditorDraft";
import type { Milestone } from "../../types/domain";
import { buildDateTime, compareDateTimes, datePortion, localTodayDate, timePortion } from "../../ui/helpers";
import { isValidDateInput, isValidTimeInput } from "../appModel";

function buildDraft(milestone?: Milestone) {
  return {
    title: milestone?.title ?? "",
    type: milestone?.type ?? "internal-review",
    projectIdsText: milestone?.projectIds.join(", ") ?? "",
    description: milestone?.description ?? "",
    startDate: milestone ? datePortion(milestone.startAt) : localTodayDate(),
    startTime: milestone ? timePortion(milestone.startAt) : "18:00",
    endDate: milestone?.endAt ? datePortion(milestone.endAt) : "",
    endTime: milestone?.endAt ? timePortion(milestone.endAt) : "",
  };
}

export type MilestonePayload = Pick<Milestone, "title" | "type" | "startAt" | "endAt" | "description" | "projectIds">;
type Inputs = { persist: (id: string | null, payload: MilestonePayload) => Promise<boolean>; remove: (id: string) => Promise<boolean> };

export function useMilestoneEditor({ persist, remove }: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildDraft);
  const open = (milestone?: Milestone) => openDraft(buildDraft(milestone), milestone?.id ?? null);
  const save = async () => {
    const { draft, id } = editor;
    const startDate = draft.startDate.trim();
    const startTime = draft.startTime.trim() || "12:00";
    const endDate = draft.endDate.trim();
    const endTime = draft.endTime.trim();
    const hasEnd = endDate.length > 0 || endTime.length > 0;
    const missing = [!draft.title.trim() ? "title" : null, !isValidDateInput(startDate) ? "start date" : null, !isValidTimeInput(startTime) ? "start time" : null]
      .filter((value): value is string => Boolean(value));
    if (missing.length) { setError(`Add valid ${missing.join(", ")} before saving this milestone.`); return; }
    const startAt = buildDateTime(startDate, startTime);
    const endAt = hasEnd ? buildDateTime(endDate || startDate, endTime || startTime) : null;
    if (endAt && (!isValidDateInput(endDate || startDate) || !isValidTimeInput(endTime || startTime) || compareDateTimes(endAt, startAt) < 0)) {
      setError("End date/time must be valid and after the start date/time."); return;
    }
    const type = draft.type as Milestone["type"];
    if (!["practice", "competition", "deadline", "internal-review", "demo"].includes(type)) { setError("Choose a milestone type."); return; }
    const ok = await persist(id, { title: draft.title.trim(), type, startAt, endAt, description: draft.description.trim(), projectIds: draft.projectIdsText.split(",").map((v) => v.trim()).filter(Boolean) });
    complete(ok, "Could not confirm the milestone was saved. Your draft is still here.");
  };
  const deleteMilestone = async () => { if (!editor.id) return; const ok = await remove(editor.id); complete(ok, "Could not confirm the milestone was deleted."); };
  return { ...editor, open, save, deleteMilestone };
}
