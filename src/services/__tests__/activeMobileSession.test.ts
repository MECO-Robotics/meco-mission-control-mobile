import { commitActiveMobileSession } from "../activeMobileSession";
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

describe("commitActiveMobileSession", () => {
  it("does not publish memory state when persistence fails", async () => {
    const persistenceError = new Error("SecureStore unavailable");
    const publish = jest.fn();

    await expect(
      commitActiveMobileSession({
        clearPersisted: jest.fn(),
        expectedVersion: 0,
        getVersion: () => 0,
        persist: jest.fn(async () => {
          throw persistenceError;
        }),
        publish,
        session,
      }),
    ).rejects.toBe(persistenceError);
    expect(publish).not.toHaveBeenCalled();
  });

  it("clears a persisted rotation and does not publish after logout", async () => {
    let version = 0;
    const clearPersisted = jest.fn(async () => undefined);
    const publish = jest.fn();
    const persist = jest.fn(async () => {
      version += 1;
    });

    await expect(
      commitActiveMobileSession({
        clearPersisted,
        expectedVersion: 0,
        getVersion: () => version,
        persist,
        publish,
        session,
      }),
    ).resolves.toBe(false);
    expect(clearPersisted).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });
});
