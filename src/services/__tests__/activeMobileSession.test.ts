import { ActiveMobileSessionCoordinator } from "../activeMobileSession";
import type { PersistedAuthSession } from "../authSessionStorage";

const session = {
  accessTokenExpiresAt: "2026-08-10T14:00:00.000Z",
  deviceNumber: "123456789012345",
  refreshToken: "refresh-two",
  session: {
    createdAt: "2026-08-10T12:00:00.000Z",
    id: "session-one",
    lastUsedAt: "2026-08-10T12:00:00.000Z",
  },
  sessionExpiresAt: "2026-11-08T12:00:00.000Z",
  token: "access-two",
  user: {
    accountId: "member-one",
    authProvider: "email" as const,
    email: "member@mecorobotics.org",
    hostedDomain: "mecorobotics.org",
    name: "Member One",
    picture: null,
  },
} satisfies PersistedAuthSession;

describe("ActiveMobileSessionCoordinator", () => {
  it("does not publish memory state when persistence fails", async () => {
    const persistenceError = new Error("SecureStore unavailable");
    const publish = jest.fn();

    const coordinator = new ActiveMobileSessionCoordinator({
      clear: jest.fn(),
      persist: jest.fn(async () => {
        throw persistenceError;
      }),
    });

    await expect(
      coordinator.commit({
        expectedVersion: 0,
        getVersion: () => 0,
        publish,
        session,
      }),
    ).rejects.toBe(persistenceError);
    expect(publish).not.toHaveBeenCalled();
  });

  it("clears a persisted rotation and does not publish after logout", async () => {
    let version = 0;
    const clear = jest.fn(async () => undefined);
    const publish = jest.fn();
    const persist = jest.fn(async () => {
      version += 1;
    });

    const coordinator = new ActiveMobileSessionCoordinator({ clear, persist });

    await expect(
      coordinator.commit({
        expectedVersion: 0,
        getVersion: () => version,
        publish,
        session,
      }),
    ).resolves.toBe(false);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it("finishes stale cleanup before persisting a newer sign-in", async () => {
    let version = 0;
    let persistedToken: string | null = null;
    let releaseStalePersist: (() => void) | undefined;
    const stalePersistStarted = new Promise<void>((resolve) => {
      releaseStalePersist = resolve;
    });
    let persistCount = 0;
    const coordinator = new ActiveMobileSessionCoordinator({
      clear: async () => {
        persistedToken = null;
      },
      persist: async (nextSession) => {
        persistCount += 1;
        persistedToken = nextSession.token;
        if (persistCount === 1) {
          await stalePersistStarted;
        }
      },
    });
    const stalePublish = jest.fn();
    const nextPublish = jest.fn();

    const staleCommit = coordinator.commit({
      expectedVersion: 0,
      getVersion: () => version,
      publish: stalePublish,
      session,
    });
    version = 1;
    const nextSession = {
      ...session,
      refreshToken: "refresh-three",
      token: "access-three",
    };
    const nextCommit = coordinator.commit({
      expectedVersion: 1,
      getVersion: () => version,
      publish: nextPublish,
      session: nextSession,
    });
    releaseStalePersist?.();

    await expect(staleCommit).resolves.toBe(false);
    await expect(nextCommit).resolves.toBe(true);
    expect(stalePublish).not.toHaveBeenCalled();
    expect(nextPublish).toHaveBeenCalledWith(nextSession);
    expect(persistedToken).toBe("access-three");
  });
});
