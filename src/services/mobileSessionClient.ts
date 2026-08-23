import { ApiRequestError, requestJson } from "../data/api";
import type { MobileSessionResponse } from "../types/domain";
import type { PersistedAuthSession } from "./authSessionStorage";

const REFRESH_EARLY_MS = 5 * 60 * 1000;

type SessionReader = () => PersistedAuthSession | null;
type SessionVersionReader = () => number;
type SessionWriter = (
  session: PersistedAuthSession,
  expectedVersion: number,
) => Promise<boolean>;

class SessionChangedError extends Error {
  constructor() {
    super("The active session changed while credentials were refreshing.");
    this.name = "SessionChangedError";
  }
}

type MobileSessionClientOptions = {
  baseUrl: string;
  getSession: SessionReader;
  getSessionVersion: SessionVersionReader;
  onSessionExpired: () => Promise<void> | void;
  saveSession: SessionWriter;
};

export class MobileSessionClient {
  private refreshPromise: Promise<PersistedAuthSession> | null = null;

  constructor(private readonly options: MobileSessionClientOptions) {}

  getAccessToken() {
    return this.options.getSession()?.token ?? null;
  }

  async refresh() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const session = this.requireSession();
    const sessionVersion = this.options.getSessionVersion();
    this.refreshPromise = this.rotate(session, sessionVersion).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async request<T>(path: string, init: RequestInit = {}, timeoutMs?: number) {
    let session = this.requireSession();
    if (Date.parse(session.accessTokenExpiresAt) - Date.now() <= REFRESH_EARLY_MS) {
      session = await this.refresh();
    }

    try {
      return await requestJson<T>(
        this.options.baseUrl,
        path,
        init,
        session.token,
        timeoutMs,
      );
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 401) {
        throw error;
      }

      const currentSession = this.requireSession();
      const refreshedSession =
        currentSession.token === session.token
          ? await this.refresh()
          : currentSession;
      return requestJson<T>(
        this.options.baseUrl,
        path,
        init,
        refreshedSession.token,
        timeoutMs,
      );
    }
  }

  private requireSession() {
    const session = this.options.getSession();
    if (!session) {
      throw new ApiRequestError("Sign in is required.", 401, null);
    }
    return session;
  }

  private async rotate(session: PersistedAuthSession, expectedVersion: number) {
    try {
      const response = await requestJson<MobileSessionResponse>(
        this.options.baseUrl,
        "/api/auth/mobile/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        },
      );
      const rotated = { ...response, deviceNumber: session.deviceNumber };
      const saved = await this.options.saveSession(rotated, expectedVersion);
      if (!saved) {
        throw new SessionChangedError();
      }
      return rotated;
    } catch (error) {
      // A refresh response may be lost after the one-time token was consumed.
      // Only definitive authentication rejection invalidates local credentials;
      // ambiguous transport/server failures retain the session so the user can
      // retry or sign out explicitly.
      if (
        error instanceof ApiRequestError &&
        (error.status === 401 || error.status === 403) &&
        this.options.getSessionVersion() === expectedVersion
      ) {
        await this.options.onSessionExpired();
      }
      throw error;
    }
  }
}

export { REFRESH_EARLY_MS };
