import { useState } from "react";
import type { Event, Subsystem } from "../../types/domain";
import { buildDateTime, compareDateTimes, datePortion, localTodayDate, splitList, timePortion } from "../../ui/helpers";
import { isValidDateInput, isValidTimeInput, mapEventTypeToMilestoneType } from "../appModel";

function buildDraft(event?: Event) {
  return {
    title: event?.title ?? "",
    type: event?.type ?? "internal-review",
    isExternal: event?.isExternal ?? false,
    description: event?.description ?? "",
    relatedSubsystemIdsText: event?.relatedSubsystemIds.join(", ") ?? "",
    startDate: event ? datePortion(event.startDateTime) : localTodayDate(),
    startTime: event ? timePortion(event.startDateTime) : "18:00",
    endDate: event?.endDateTime ? datePortion(event.endDateTime) : "",
    endTime: event?.endDateTime ? timePortion(event.endDateTime) : "",
  };
}

export type MilestonePayload = {
  title: string;
  type: ReturnType<typeof mapEventTypeToMilestoneType>;
  startDateTime: string;
  endDateTime: string | null;
  isExternal: boolean;
  description: string;
  relatedSubsystemIds: string[];
  projectIds: string[];
};

type Inputs = {
  subsystemsById: Record<string, Subsystem>;
  persist: (id: string | null, payload: MilestonePayload) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
};

export function useMilestoneEditor({ subsystemsById, persist, remove }: Inputs) {
  const [editor, setEditor] = useState<{
    draft: ReturnType<typeof buildDraft>;
    id: string | null;
    visible: boolean;
    error: string | null;
  }>(() => ({ draft: buildDraft(), id: null, visible: false, error: null }));
  const open = (event?: Event) => {
    setEditor({ draft: buildDraft(event), id: event?.id ?? null, visible: true, error: null });
  };
  const close = () => {
    setEditor((current) => ({ ...current, id: null, visible: false, error: null }));
  };
  const updateDraft = (patch: Partial<typeof editor.draft>) => {
    setEditor((current) => ({ ...current, draft: { ...current.draft, ...patch }, error: null }));
  };
  const closeIfCurrent = () => {
    setEditor((current) => current === editor ? { ...current, id: null, visible: false, error: null } : current);
  };
  const save = async () => {
    const { draft, id } = editor;
    const title = draft.title.trim();
    const startDate = draft.startDate.trim();
    const startTime = draft.startTime.trim() || "12:00";
    const endDate = draft.endDate.trim();
    const endTime = draft.endTime.trim();
    const hasEnd = endDate.length > 0 || endTime.length > 0;
    const resolvedEndDate = endDate || startDate;
    const resolvedEndTime = endTime || startTime;
    const missingFields = [
      !title ? "title" : null,
      !isValidDateInput(startDate) ? "start date" : null,
      !isValidTimeInput(startTime) ? "start time" : null,
      hasEnd && !isValidDateInput(resolvedEndDate) ? "end date" : null,
      hasEnd && !isValidTimeInput(resolvedEndTime) ? "end time" : null,
    ].filter((field): field is string => Boolean(field));
    if (missingFields.length > 0) {
      setEditor((current) => ({ ...current, error: `Add valid ${missingFields.join(", ")} before saving this milestone.` }));
      return;
    }
    const startDateTime = buildDateTime(startDate, startTime);
    const endDateTime = hasEnd ? buildDateTime(resolvedEndDate, resolvedEndTime) : null;
    if (endDateTime && compareDateTimes(endDateTime, startDateTime) < 0) {
      setEditor((current) => ({ ...current, error: "End date/time must be after start date/time." }));
      return;
    }
    const relatedSubsystemIds = splitList(draft.relatedSubsystemIdsText)
      .filter((subsystemId) => subsystemsById[subsystemId]);
    const projectIds = Array.from(new Set(relatedSubsystemIds
      .map((subsystemId) => subsystemsById[subsystemId].projectId)
      .filter((projectId): projectId is string => Boolean(projectId))));
    const ok = await persist(id, {
      title,
      type: mapEventTypeToMilestoneType(draft.type),
      startDateTime,
      endDateTime,
      isExternal: draft.isExternal,
      description: draft.description.trim(),
      relatedSubsystemIds,
      projectIds,
    });
    if (ok) closeIfCurrent();
  };
  const deleteMilestone = async () => {
    if (editor.id && await remove(editor.id)) closeIfCurrent();
  };
  return { ...editor, open, close, updateDraft, save, deleteMilestone };
}
