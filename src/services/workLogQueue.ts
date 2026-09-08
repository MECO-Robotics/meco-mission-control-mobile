import type { WorkLog } from "../types/domain";
import { loadPendingWorkLogDrafts, savePendingWorkLogDrafts } from "./workLogDraftStorage";
import {
  markPendingWorkLogDraftFailed, markPendingWorkLogDraftSyncing,
  reconcilePendingWorkLogDrafts, removePendingWorkLogDraft, type PendingWorkLogDraft,
} from "./workLogDraftSync";

type Storage = {
  load: (owner: string) => Promise<PendingWorkLogDraft[]>;
  save: (owner: string, drafts: PendingWorkLogDraft[]) => Promise<void>;
};

// Serialize installation-key creation and cross-session loads/writes as well.
let storageTail: Promise<unknown> = Promise.resolve();
function accessStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageTail.then(operation);
  storageTail = result.catch(() => undefined);
  return result;
}

// The collection is committed only after its serialized durable write succeeds.
// Network requests never hold the write queue, so edits remain responsive.
export function createWorkLogQueue(owner: string | null, storage: Storage = {
  load: loadPendingWorkLogDrafts, save: savePendingWorkLogDrafts,
}, isSessionCurrent: () => boolean = () => true) {
  let drafts: PendingWorkLogDraft[] = [];
  let active = true;
  let generation = 0;
  const isActive = () => active && isSessionCurrent();
  let syncing = false;
  let loadError: unknown;
  const listeners = new Set<() => void>();
  const publish = (next: PendingWorkLogDraft[]) => {
    drafts = next;
    listeners.forEach((listener) => listener());
  };
  const loaded = owner ? accessStorage(() => storage.load(owner)).then((next) => {
    drafts = next;
    if (isActive()) publish(next);
  }).catch((error: unknown) => { loadError = error; }) : Promise.resolve();
  let writes: Promise<unknown> = loaded;
  const update = (transform: (current: PendingWorkLogDraft[]) => PendingWorkLogDraft[]) => {
    const operation = writes.then(async () => {
      if (loadError) throw loadError;
      if (!isActive() || !owner) throw new Error("The work-log queue session changed. Retry after signing in.");
      const next = transform(drafts);
      if (next === drafts) return;
      await accessStorage(() => storage.save(owner, next));
      if (isActive()) publish(next);
    });
    // A failed write is reported to its caller, but cannot poison later retries.
    writes = operation.catch(() => undefined);
    return operation;
  };
  return {
    getSnapshot: () => drafts,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    ready: async () => { await loaded; if (loadError) throw loadError; },
    isActive,
    activate: () => { active = true; },
    dispose: () => { active = false; generation += 1; listeners.clear(); },
    update,
    async sync(serverLogs: WorkLog[], upload: (draft: PendingWorkLogDraft) => Promise<void>,
      onUploaded: (draft: PendingWorkLogDraft) => Promise<void>,
      isSessionError: (error: unknown) => boolean,
      message: (error: unknown) => string) {
      if (syncing || !isActive() || !owner) return null;
      syncing = true;
      const currentGeneration = generation;
      const canContinue = () => isActive() && generation === currentGeneration;
      let errorMessage: string | null = null;
      try {
        await update((current) => reconcilePendingWorkLogDrafts(current, serverLogs, owner));
        const ids = drafts.map((draft) => draft.id);
        for (const id of ids) {
          if (!canContinue()) break;
          await update((current) => markPendingWorkLogDraftSyncing(current, id));
          const draft = drafts.find((candidate) => candidate.id === id);
          if (!draft || !canContinue()) continue;
          try {
            await upload(draft);
          } catch (error) {
            if (!canContinue()) break;
            if (isSessionError(error)) throw error;
            const failure = message(error);
            await update((current) => markPendingWorkLogDraftFailed(current, id, failure));
            errorMessage ??= failure;
            continue;
          }
          if (!canContinue()) break;
          await update((current) => removePendingWorkLogDraft(current, id));
          if (canContinue()) await onUploaded(draft);
        }
        return { error: errorMessage };
      } finally {
        syncing = false;
      }
    },
  };
}
