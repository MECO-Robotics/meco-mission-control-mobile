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
    });
    fetchMock.mockReturnValueOnce(jsonResponse(rotated));
    const client = new MobileSessionClient({
      baseUrl: "https://api.example.test",
      getSession: () => session,
      onSessionExpired: jest.fn(),
      saveSession,
    });

    await Promise.all([client.refresh(), client.refresh()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenCalledWith({ ...rotated, deviceNumber: session?.deviceNumber });
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
      onSessionExpired: jest.fn(),
      saveSession: async (next) => {
        session = next;
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
      onSessionExpired,
      saveSession: jest.fn(),
    });

    await expect(client.refresh()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
