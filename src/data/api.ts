import { Platform } from "react-native";

export const DEFAULT_API_BASE_URL = "http://localhost:8080";

type ApiBaseUrlEnv = {
  EXPO_PUBLIC_ALLOW_INSECURE_PRIVATE_LAN?: string;
  EXPO_PUBLIC_API_BASE_URL?: string;
  EXPO_PUBLIC_ANDROID_API_BASE_URL?: string;
  EXPO_PUBLIC_IOS_API_BASE_URL?: string;
};

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigurationError";
  }
}

function resolveConfiguredApiBaseUrl(platformOS: string, env: ApiBaseUrlEnv) {
  // Device-specific overrides let simulators and physical devices point at
  // different reachable hosts without changing application code.
  const platformConfigured =
    platformOS === "ios"
      ? env.EXPO_PUBLIC_IOS_API_BASE_URL?.trim()
      : platformOS === "android"
        ? env.EXPO_PUBLIC_ANDROID_API_BASE_URL?.trim()
        : undefined;

  return platformConfigured || env.EXPO_PUBLIC_API_BASE_URL?.trim();
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

export class ApiNetworkError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super("Network unavailable. Check your connection and try again.");
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

export type MobileAuthErrorState =
  | "expired-session"
  | "network-unavailable"
  | "auth-config-unavailable"
  | "unknown";

export function isAuthStatus(status: number) {
  return status === 401;
}

function hasAuthExpiryPayload(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const candidate = body as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  return (
    code.includes("expired") ||
    code === "invalid_token" ||
    message.includes("session expired") ||
    message.includes("token expired")
  );
}

export function classifyMobileAuthError(
  error: unknown,
  context: "auth-config" | "authenticated" | "general" = "general",
): MobileAuthErrorState {
  if (context === "auth-config") {
    // Auth config failures are surfaced separately because users may not have a
    // session yet, so generic expired-session handling would be misleading.
    return "auth-config-unavailable";
  }

  if (
    context === "authenticated" &&
    error instanceof ApiRequestError &&
    (isAuthStatus(error.status) ||
      (error.status === 403 && hasAuthExpiryPayload(error.body)))
  ) {
    return "expired-session";
  }

  if (error instanceof ApiNetworkError) {
    return "network-unavailable";
  }

  return "unknown";
}

export function getMobileAuthErrorMessage(state: MobileAuthErrorState) {
  switch (state) {
    case "expired-session":
      return "Your session expired. Sign in again.";
    case "network-unavailable":
      return "Network unavailable. Check your connection and try again.";
    case "auth-config-unavailable":
      return "Authentication service is unavailable. Check the backend auth configuration and try again.";
    case "unknown":
      return "Request failed unexpectedly.";
  }
}

export function getBackendConnectionErrorMessage(apiBaseUrl: string) {
  return [
    `Backend API is not reachable at ${apiBaseUrl}.`,
    "Start the platform server on that host/port, or set EXPO_PUBLIC_API_BASE_URL or the platform-specific API override to the backend URL your device can reach.",
  ].join(" ");
}

function parseErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const message = (payload as { message?: unknown }).message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return null;
  }

  return message;
}

export function resolveApiBaseUrl(
  platformOS = Platform.OS,
  env: ApiBaseUrlEnv = process.env as ApiBaseUrlEnv,
  isDevelopment = typeof __DEV__ === "boolean" && __DEV__,
) {
  const configured = resolveConfiguredApiBaseUrl(platformOS, env);
  const base = configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
  const normalized = base.replace(/\/+$/, "");

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new ApiConfigurationError("The configured API URL is invalid.");
  }

  if (url.protocol === "https:") {
    return normalized;
  }

  if (url.protocol !== "http:") {
    throw new ApiConfigurationError("The API URL must use HTTPS.");
  }

  if (!isDevelopment) {
    throw new ApiConfigurationError("Production mobile builds require an HTTPS API URL.");
  }

  const host = url.hostname.toLowerCase();
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "10.0.2.2";
  if (isLocalHost) {
    return normalized;
  }

  const privateLanAllowed =
    env.EXPO_PUBLIC_ALLOW_INSECURE_PRIVATE_LAN?.trim().toLowerCase() === "true";
  const isPrivateLan =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (privateLanAllowed && isPrivateLan) {
    return normalized;
  }

  throw new ApiConfigurationError(
    "Development HTTP is limited to loopback/emulators unless the private-LAN override is enabled.",
  );
}

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  token?: string | null,
  timeoutMs?: number,
): Promise<T> {
  const headers = new Headers(init.headers ?? undefined);
  headers.set("Accept", "application/json");

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const abortController =
    typeof timeoutMs === "number" && timeoutMs > 0 ? new AbortController() : null;
  const abortFromCaller = () => abortController?.abort(init.signal?.reason);
  if (abortController && init.signal) {
    if (init.signal.aborted) {
      abortFromCaller();
    } else {
      init.signal.addEventListener("abort", abortFromCaller, { once: true });
    }
  }
  const timeoutHandle =
    abortController !== null
      ? setTimeout(() => abortController.abort(), timeoutMs)
      : null;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      signal: abortController?.signal ?? init.signal,
    });
    const rawBody = await response.text();
    let parsedBody: unknown = null;
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody) as unknown;
      } catch {
        parsedBody = rawBody;
      }
    }

    if (!response.ok) {
      throw new ApiRequestError(
        parseErrorMessage(parsedBody) ??
          `Request failed with status ${response.status}.`,
        response.status,
        parsedBody,
      );
    }

    return parsedBody as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiNetworkError(error);
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
    if (abortController && init.signal) {
      init.signal.removeEventListener("abort", abortFromCaller);
    }
  }
}
