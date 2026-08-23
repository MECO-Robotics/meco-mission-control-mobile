import { MobileSessionClient } from "../mobileSessionClient";
import type { PersistedAuthSession } from "../authSessionStorage";

const fetchMock = jest.fn();
global.fetch = fetchMock;

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

function buildSession(overrides: Partial<PersistedAuthSession> = {}) {
  return {
    accessTokenExpiresAt: "2026-08-10T14:00:00.000Z",
    deviceNumber: "123456789012345",
    refreshToken: "refresh-one",
    session: {
      createdAt: "2026-08-10T12:00:00.000Z",
      id: "session-one",
      lastUsedAt: "2026-08-10T12:00:00.000Z",
    },
    sessionExpiresAt: "2026-11-08T12:00:00.000Z",
    token: "access-one",
    user: {
      accountId: "member-one",
      authProvider: "email" as const,
      email: "member@mecorobotics.org",
      hostedDomain: "mecorobotics.org",
      name: "Member One",
      picture: null,
    },
    ...overrides,
  };
}

describe("MobileSessionClient", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    fetchMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("coalesces proactive refreshes and persists the rotated token", async () => {
    let session: PersistedAuthSession | null = buildSession({
      accessTokenExpiresAt: "2026-08-10T12:04:00.000Z",
    });
    const rotated = buildSession({ token: "access-two", refreshToken: "refresh-two" });
    const saveSession = jest.fn(async (next: PersistedAuthSession | null) => {
      session = next;
      return true;
    });
    fetchMock.mockReturnValueOnce(jsonResponse(rotated));
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => 0,
      onSessionExpired: jest.fn(),
      saveSession,
    });

    await Promise.all([client.refresh(), client.refresh()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenCalledWith(
      { ...rotated, deviceNumber: session?.deviceNumber },
      0,
    );
  });

  it("refreshes once and retries an authenticated request once after 401", async () => {
    let session: PersistedAuthSession | null = buildSession();
    const rotated = buildSession({ token: "access-two", refreshToken: "refresh-two" });
    fetchMock
      .mockReturnValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockReturnValueOnce(jsonResponse(rotated))
      .mockReturnValueOnce(jsonResponse({ ok: true }));
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => 0,
      onSessionExpired: jest.fn(),
      saveSession: async (next) => {
        session = next;
        return true;
      },
    });

    await expect(client.request("/api/bootstrap")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[2][1].headers as Headers).get("Authorization")).toBe(
      "Bearer access-two",
    );
  });

  it("does not replay a refresh token after rotation failure", async () => {
    let session: PersistedAuthSession | null = buildSession();
    const onSessionExpired = jest.fn(async () => {
      session = null;
    });
    fetchMock.mockReturnValueOnce(jsonResponse({ message: "invalid" }, 401));
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => 0,
      onSessionExpired,
      saveSession: jest.fn(async () => true),
    });

    await expect(client.refresh()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("retains the session when refresh fails before the server responds", async () => {
    const session = buildSession();
    const onSessionExpired = jest.fn();
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => 0,
      onSessionExpired,
      saveSession: jest.fn(async () => true),
    });

    await expect(client.refresh()).rejects.toMatchObject({
      name: "ApiNetworkError",
    });
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe("access-one");
  });

  it("retains the session when refresh receives a retryable server error", async () => {
    const session = buildSession();
    const onSessionExpired = jest.fn();
    fetchMock.mockReturnValueOnce(jsonResponse({ message: "Unavailable" }, 503));
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => 0,
      onSessionExpired,
      saveSession: jest.fn(async () => true),
    });

    await expect(client.refresh()).rejects.toMatchObject({ status: 503 });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("does not publish a refresh completed after the session version changes", async () => {
    let session: PersistedAuthSession | null = buildSession();
    let sessionVersion = 0;
    const rotated = buildSession({ token: "access-two", refreshToken: "refresh-two" });
    let resolveRefresh: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const saveSession = jest.fn(async () => false);
    const onSessionExpired = jest.fn();
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => sessionVersion,
      onSessionExpired,
      saveSession,
    });

    const refresh = client.refresh();
    session = null;
    sessionVersion += 1;
    resolveRefresh?.(await jsonResponse(rotated));

    await expect(refresh).rejects.toMatchObject({ name: "SessionChangedError" });
    expect(saveSession).toHaveBeenCalledWith(
      { ...rotated, deviceNumber: "123456789012345" },
      0,
    );
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBeNull();
  });

  it("does not expire the session when rotated credential persistence fails", async () => {
    const session = buildSession();
    const rotated = buildSession({ token: "access-two", refreshToken: "refresh-two" });
    fetchMock.mockReturnValueOnce(jsonResponse(rotated));
    const persistenceError = new Error("SecureStore unavailable");
    const onSessionExpired = jest.fn();
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => 0,
      onSessionExpired,
      saveSession: jest.fn(async () => {
        throw persistenceError;
      }),
    });

    await expect(client.refresh()).rejects.toBe(persistenceError);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe("access-one");
  });

  it("does not expire a newer session after an old refresh is rejected", async () => {
    let session: PersistedAuthSession | null = buildSession();
    let sessionVersion = 0;
    let resolveRefresh: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const onSessionExpired = jest.fn();
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      getSessionVersion: () => sessionVersion,
      onSessionExpired,
      saveSession: jest.fn(async () => true),
    });

    const refresh = client.refresh();
    session = buildSession({ token: "new-access", refreshToken: "new-refresh" });
    sessionVersion += 1;
    resolveRefresh?.(await jsonResponse({ message: "invalid" }, 401));

    await expect(refresh).rejects.toMatchObject({ status: 401 });
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe("new-access");
  });
});
