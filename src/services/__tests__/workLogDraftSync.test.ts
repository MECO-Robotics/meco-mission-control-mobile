import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  buildWorkLogDraftFingerprint,
  enqueuePendingWorkLogDraft,
  markPendingWorkLogDraftFailed,
  markPendingWorkLogDraftSyncing,
  reconcilePendingWorkLogDrafts,
  removePendingWorkLogDraft,
} from "../workLogDraftSync";
import {
  loadPendingWorkLogDrafts,
  savePendingWorkLogDrafts,
} from "../workLogDraftStorage";
import type { WorkLog } from "../../types/domain";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();

  return {
    __store: store,
    getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((key) => [key, store.get(key) ?? null])),
    ),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((key) => store.delete(key));
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
});

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn((_: string, value: string) =>
    Promise.resolve([...value].map((character) => character.charCodeAt(0).toString(16)).join("")),
  ),
  getRandomBytesAsync: jest.fn((length: number) =>
    Promise.resolve(Uint8Array.from({ length }, (_, index) => (index + 1) % 256)),
  ),
}));

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
});

const payload = {
  taskId: "swerve-sensor-bundle",
  date: "2026-04-23",
  hours: 1.5,
  participantIds: ["lucas", "priya"],
  notes: "Route test work log",
};

const storage = AsyncStorage as typeof AsyncStorage & {
  __store: Map<string, string>;
};
const secureStorage = SecureStore as typeof SecureStore & {
  __store: Map<string, string>;
};
const ownerKey = "alex@mecorobotics.org";

describe("offline work log draft sync queue", () => {
  beforeEach(() => {
    storage.__store.clear();
    secureStorage.__store.clear();
    jest.clearAllMocks();
    jest.spyOn(Math, "random").mockReturnValue(0.123456);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a pending draft for an offline work log submission", () => {
    const result = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
    );

    expect(result.didCreate).toBe(true);
    expect(result.draft).toMatchObject({
      attemptCount: 0,
      createdAt: "2026-04-23T18:00:00.000Z",
      fingerprint: buildWorkLogDraftFingerprint(payload),
      id: "work-log-draft-1776967200000-4fzyo8",
      payload,
      status: "pending",
      updatedAt: "2026-04-23T18:00:00.000Z",
    });
  });

  it("creates an attempted failed draft for an uncertain server submission", () => {
    const result = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
      {
        attemptCount: 1,
        error: "Network unavailable.",
        status: "failed",
      },
    );

    expect(result.didCreate).toBe(true);
    expect(result.draft).toMatchObject({
      attemptCount: 1,
      error: "Network unavailable.",
      status: "failed",
    });
  });

  it("persists and reloads pending drafts from storage", async () => {
    const { drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
      { ownerKey },
    );

    await savePendingWorkLogDrafts(ownerKey, drafts);

    await expect(loadPendingWorkLogDrafts(ownerKey)).resolves.toEqual(drafts);
    const persisted = [...storage.__store.values()].join(" ");
    expect(persisted).not.toContain(payload.notes);
    expect(persisted).not.toContain(payload.participantIds[0]);
  });

  it("isolates drafts by owner and expires them after seven days", async () => {
    const { drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
      { ownerKey },
    );
    await savePendingWorkLogDrafts(
      ownerKey,
      drafts,
      new Date("2026-04-23T18:00:00.000Z"),
    );

    await expect(loadPendingWorkLogDrafts("sam@mecorobotics.org")).resolves.toEqual([]);
    await expect(
      loadPendingWorkLogDrafts(ownerKey, new Date("2026-04-30T18:00:00.001Z")),
    ).resolves.toEqual([]);
  });

  it("purges an encrypted envelope when its SecureStore key is missing", async () => {
    const { drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
      { ownerKey },
    );
    await savePendingWorkLogDrafts(ownerKey, drafts);
    secureStorage.__store.clear();

    await expect(loadPendingWorkLogDrafts(ownerKey)).resolves.toEqual([]);
    expect([...storage.__store.keys()].some((key) => key.includes(":v2:"))).toBe(false);
  });

  it("marks draft sync attempts and failures visibly", () => {
    const { draft, drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
    );

    const syncingDrafts = markPendingWorkLogDraftSyncing(
      drafts,
      draft.id,
      new Date("2026-04-23T18:05:00.000Z"),
    );
    expect(syncingDrafts[0]).toMatchObject({
      attemptCount: 1,
      status: "syncing",
      updatedAt: "2026-04-23T18:05:00.000Z",
    });

    const failedDrafts = markPendingWorkLogDraftFailed(
      syncingDrafts,
      draft.id,
      "Network unavailable.",
      new Date("2026-04-23T18:06:00.000Z"),
    );
    expect(failedDrafts[0]).toMatchObject({
      error: "Network unavailable.",
      status: "failed",
      updatedAt: "2026-04-23T18:06:00.000Z",
    });
  });

  it("removes a draft after successful sync", () => {
    const { draft, drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
    );

    expect(removePendingWorkLogDraft(drafts, draft.id)).toEqual([]);
  });

  it("prevents duplicate pending drafts for the same work log payload", () => {
    const first = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
    );
    const second = enqueuePendingWorkLogDraft(
      first.drafts,
      {
        ...payload,
        participantIds: ["priya", "lucas"],
        notes: "  Route   test work log  ",
      },
      new Date("2026-04-23T18:01:00.000Z"),
    );

    expect(second.didCreate).toBe(false);
    expect(second.draft.id).toBe(first.draft.id);
    expect(second.drafts).toHaveLength(1);
  });

  it("allows the same work log payload to be queued for separate owners", () => {
    const first = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
      { ownerKey: "alex@mecorobotics.org" },
    );
    const second = enqueuePendingWorkLogDraft(
      first.drafts,
      payload,
      new Date("2026-04-23T18:01:00.000Z"),
      { ownerKey: "sam@mecorobotics.org" },
    );

    expect(second.didCreate).toBe(true);
    expect(second.drafts).toHaveLength(2);
  });

  it("drops matching local drafts when the server already has the work log", () => {
    const { drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
    );
    const serverWorkLog: WorkLog = {
      id: "log-server-1",
      ...payload,
    };

    expect(reconcilePendingWorkLogDrafts(drafts, [serverWorkLog])).toEqual([]);
  });

  it("keeps attempted matching drafts from another owner", () => {
    const { draft, drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
      { ownerKey: "alex@mecorobotics.org" },
    );
    const attemptedDrafts = markPendingWorkLogDraftFailed(
      markPendingWorkLogDraftSyncing(
        drafts,
        draft.id,
        new Date("2026-04-23T18:01:00.000Z"),
      ),
      draft.id,
      "Network unavailable.",
      new Date("2026-04-23T18:02:00.000Z"),
    );
    const serverWorkLog: WorkLog = {
      id: "log-server-1",
      ...payload,
    };

    expect(
      reconcilePendingWorkLogDrafts(
        attemptedDrafts,
        [serverWorkLog],
        "sam@mecorobotics.org",
      ),
    ).toEqual(attemptedDrafts);
  });

  it("drops matching drafts that already attempted server sync", () => {
    const { draft, drafts } = enqueuePendingWorkLogDraft(
      [],
      payload,
      new Date("2026-04-23T18:00:00.000Z"),
    );
    const attemptedDrafts = markPendingWorkLogDraftFailed(
      markPendingWorkLogDraftSyncing(
        drafts,
        draft.id,
        new Date("2026-04-23T18:01:00.000Z"),
      ),
      draft.id,
      "Network unavailable.",
      new Date("2026-04-23T18:02:00.000Z"),
    );
    const serverWorkLog: WorkLog = {
      id: "log-server-1",
      ...payload,
    };

    expect(reconcilePendingWorkLogDrafts(attemptedDrafts, [serverWorkLog])).toEqual([]);
  });
});
