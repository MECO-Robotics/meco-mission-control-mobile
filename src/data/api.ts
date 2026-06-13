import { Platform } from "react-native";

export const DEFAULT_API_BASE_URL = "http://localhost:8080";

function resolveConfiguredApiBaseUrl() {
  const platformConfigured =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_IOS_API_BASE_URL?.trim()
      : Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL?.trim()
        : undefined;

  return platformConfigured || process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
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
    "Start the platform server on that host/port, or set EXPO_PUBLIC_API_BASE_URL to the backend URL your device can reach.",
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

export function resolveApiBaseUrl() {
  const configured = resolveConfiguredApiBaseUrl();
  const base = configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, "");
}

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers ?? undefined);
  headers.set("Accept", "application/json");

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    throw new ApiNetworkError(error);
  }

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
}
