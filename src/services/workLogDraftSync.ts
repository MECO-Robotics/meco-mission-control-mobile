import AsyncStorage from "@react-native-async-storage/async-storage";

import type { WorkLog } from "../types/domain";

export type WorkLogDraftSyncStatus = "pending" | "syncing" | "failed";

export type WorkLogDraftPayload = Pick<
  WorkLog,
  "taskId" | "date" | "hours" | "participantIds" | "notes"
>;

export type PendingWorkLogDraft = {
  attemptCount: number;
  createdAt: string;
  error?: string;
  fingerprint: string;
  id: string;
  ownerKey?: string;
  payload: WorkLogDraftPayload;
  status: WorkLogDraftSyncStatus;
  updatedAt: string;
};

const WORK_LOG_DRAFT_STORAGE_KEY = "meco-mobile-work-log-drafts:v1";

type EnqueuePendingWorkLogDraftOptions = {
  attemptCount?: number;
  error?: string;
  ownerKey?: string | null;
  status?: WorkLogDraftSyncStatus;
};

function normalizeNotes(notes: string) {
  return notes.trim().replace(/\s+/g, " ");
}

function normalizeParticipantIds(participantIds: string[]) {
  return Array.from(
    new Set(
      participantIds
        .map((participantId) => participantId.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function normalizeWorkLogDraftPayload(
  payload: WorkLogDraftPayload,
): WorkLogDraftPayload {
  return {
    taskId: payload.taskId.trim(),
    date: payload.date.trim(),
    hours: Number(payload.hours),
    participantIds: normalizeParticipantIds(payload.participantIds),
    notes: normalizeNotes(payload.notes),
  };
}

export function buildWorkLogDraftFingerprint(payload: WorkLogDraftPayload) {
  const normalized = normalizeWorkLogDraftPayload(payload);

  return [
    normalized.taskId,
    normalized.date,
    String(normalized.hours),
    normalized.participantIds.join(","),
    normalized.notes,
  ].join("|");
}

function isStatus(value: unknown): value is WorkLogDraftSyncStatus {
  return value === "pending" || value === "syncing" || value === "failed";
}

function isPendingWorkLogDraft(value: unknown): value is PendingWorkLogDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const payload = candidate.payload as Record<string, unknown> | undefined;

  if (!payload) {
    return false;
  }

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.fingerprint === "string" &&
    candidate.fingerprint.length > 0 &&
    isStatus(candidate.status) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.attemptCount === "number" &&
    typeof payload.taskId === "string" &&
    typeof payload.date === "string" &&
    typeof payload.hours === "number" &&
    Array.isArray(payload.participantIds) &&
    payload.participantIds.every((participantId) => typeof participantId === "string") &&
    (candidate.ownerKey === undefined || typeof candidate.ownerKey === "string") &&
    typeof payload.notes === "string" &&
    (candidate.error === undefined || typeof candidate.error === "string")
  );
}

function parsePendingWorkLogDrafts(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    return [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPendingWorkLogDraft).map((draft) => ({
    ...draft,
    fingerprint: buildWorkLogDraftFingerprint(draft.payload),
    payload: normalizeWorkLogDraftPayload(draft.payload),
    status: draft.status === "syncing" ? "pending" : draft.status,
  }));
}

export async function loadPendingWorkLogDrafts() {
  const rawValue = await AsyncStorage.getItem(WORK_LOG_DRAFT_STORAGE_KEY);
  const drafts = parsePendingWorkLogDrafts(rawValue);

  if (rawValue !== null && drafts.length === 0) {
    await AsyncStorage.removeItem(WORK_LOG_DRAFT_STORAGE_KEY);
  }

  return drafts;
}

export async function savePendingWorkLogDrafts(drafts: PendingWorkLogDraft[]) {
  if (drafts.length === 0) {
    await AsyncStorage.removeItem(WORK_LOG_DRAFT_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(WORK_LOG_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export function enqueuePendingWorkLogDraft(
  drafts: PendingWorkLogDraft[],
  payload: WorkLogDraftPayload,
  now = new Date(),
  options: EnqueuePendingWorkLogDraftOptions = {},
) {
  const normalizedPayload = normalizeWorkLogDraftPayload(payload);
  const fingerprint = buildWorkLogDraftFingerprint(normalizedPayload);
  const ownerKey = options.ownerKey ?? null;
  const existingDraft = drafts.find(
    (draft) =>
      draft.fingerprint === fingerprint &&
      (draft.ownerKey ?? null) === ownerKey,
  );

  if (existingDraft) {
    return {
      didCreate: false,
      draft: existingDraft,
      drafts,
    };
  }

  const timestamp = now.toISOString();
  const draft: PendingWorkLogDraft = {
    attemptCount: options.attemptCount ?? 0,
    createdAt: timestamp,
    error: options.error,
    fingerprint,
    id: `work-log-draft-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerKey: ownerKey ?? undefined,
    payload: normalizedPayload,
    status: options.status ?? "pending",
    updatedAt: timestamp,
  };

  return {
    didCreate: true,
    draft,
    drafts: [draft, ...drafts],
  };
}

export function markPendingWorkLogDraftSyncing(
  drafts: PendingWorkLogDraft[],
  draftId: string,
  now = new Date(),
) {
  const timestamp = now.toISOString();

  return drafts.map((draft) =>
    draft.id === draftId
      ? {
          ...draft,
          attemptCount: draft.attemptCount + 1,
          error: undefined,
          status: "syncing" as const,
          updatedAt: timestamp,
        }
      : draft,
  );
}

export function markPendingWorkLogDraftFailed(
  drafts: PendingWorkLogDraft[],
  draftId: string,
  error: string,
  now = new Date(),
) {
  const timestamp = now.toISOString();

  return drafts.map((draft) =>
    draft.id === draftId
      ? {
          ...draft,
          error,
          status: "failed" as const,
          updatedAt: timestamp,
        }
      : draft,
  );
}

export function removePendingWorkLogDraft(
  drafts: PendingWorkLogDraft[],
  draftId: string,
) {
  return drafts.filter((draft) => draft.id !== draftId);
}

export function reconcilePendingWorkLogDrafts(
  drafts: PendingWorkLogDraft[],
  serverWorkLogs: WorkLog[],
  ownerKey: string | null = null,
) {
  const serverFingerprints = new Set(
    serverWorkLogs.map((workLog) => buildWorkLogDraftFingerprint(workLog)),
  );

  return drafts.filter((draft) => {
    if ((draft.ownerKey ?? null) !== ownerKey) {
      return true;
    }

    return !serverFingerprints.has(draft.fingerprint);
  });
}
