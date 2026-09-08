import { createWorkLogQueue } from "../workLogQueue";
import { enqueuePendingWorkLogDraft, removePendingWorkLogDraft, type PendingWorkLogDraft } from "../workLogDraftSync";

jest.mock("../workLogDraftStorage", () => ({ loadPendingWorkLogDrafts: jest.fn(), savePendingWorkLogDrafts: jest.fn() }));
const owner = "member@example.test";
const payload = { taskId: "task", date: "2026-09-08", hours: 1, notes: "Original", participantIds: ["member"] };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  let persisted: PendingWorkLogDraft[] = enqueuePendingWorkLogDraft([], payload, new Date(), { ownerKey: owner }).drafts;
  const storage = { load: jest.fn(async () => structuredClone(persisted)), save: jest.fn(async (_owner: string, drafts: PendingWorkLogDraft[]) => { persisted = structuredClone(drafts); }) };
  return { storage, queue: createWorkLogQueue(owner, storage), persisted: () => persisted };
}

test.each(["edit", "delete", "enqueue"])("upload completion preserves concurrent %s after reload", async (operation) => {
  const { queue, storage } = setup();
  await queue.ready();
  const original = queue.getSnapshot()[0];
  const uploaded = deferred();
  const started = deferred();
  const onUploaded = jest.fn(async () => undefined);
  const syncing = queue.sync([], async () => { started.resolve(); await uploaded.promise; }, onUploaded, () => false, String);
  await started.promise;
  await queue.update((current) => {
    if (operation === "delete") return removePendingWorkLogDraft(current, original.id);
    return enqueuePendingWorkLogDraft(operation === "edit" ? removePendingWorkLogDraft(current, original.id) : current,
      { ...payload, notes: "New content" }, new Date(), { ownerKey: owner }).drafts;
  });
  uploaded.resolve();
  await syncing;
  const restored = createWorkLogQueue(owner, storage);
  await restored.ready();
  expect(restored.getSnapshot().map((draft) => draft.payload.notes)).toEqual(operation === "delete" ? [] : ["New content"]);
  expect(onUploaded).toHaveBeenCalledTimes(1);
});

test("failed durable save reports failure and subsequent updates start from committed state", async () => {
  const { queue, storage } = setup();
  await queue.ready();
  storage.save.mockRejectedValueOnce(new Error("disk full"));
  await expect(queue.update(() => [])).rejects.toThrow("disk full");
  expect(queue.getSnapshot()).toHaveLength(1);
  await queue.update(() => []);
  expect(queue.getSnapshot()).toEqual([]);
});

test("serializes writes and makes a new same-owner session load after an old pending write", async () => {
  const { queue, storage } = setup();
  await queue.ready();
  const started = deferred(); const released = deferred();
  const save = storage.save.getMockImplementation()!;
  storage.save.mockImplementationOnce(async (ownerKey, drafts) => { started.resolve(); await released.promise; await save(ownerKey, drafts); });
  const removing = queue.update(() => []);
  await started.promise;
  queue.dispose();
  const restored = createWorkLogQueue(owner, storage);
  released.resolve(); await removing; await restored.ready();
  expect(restored.getSnapshot()).toEqual([]);
});

test("an old session upload cannot run task callbacks or upload subsequent drafts", async () => {
  const { queue } = setup(); await queue.ready();
  await queue.update((current) => enqueuePendingWorkLogDraft(current, { ...payload, notes: "Second" }, new Date(), { ownerKey: owner }).drafts);
  const started = deferred(); const released = deferred();
  const upload = jest.fn(async () => { started.resolve(); await released.promise; });
  const onUploaded = jest.fn(async () => undefined);
  const syncing = queue.sync([], upload, onUploaded, () => false, String);
  await started.promise; queue.dispose(); released.resolve(); await syncing;
  expect(upload).toHaveBeenCalledTimes(1);
  expect(onUploaded).not.toHaveBeenCalled();
});
