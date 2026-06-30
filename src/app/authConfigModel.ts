import type { PublicAuthConfig } from "../types/domain";
import type { AppThemeName } from "../theme";

export const DEVICE_SESSION_RESTORED_NOTICE = "Signed in on this device.";

export type EmailCodeStartResponse = {
  sentTo?: string;
  expiresInMinutes?: number;
};

export type ThemePreferenceResponse = {
  themeMode: AppThemeName | null;
};

export type EmailSignInOperation =
  | "auth-unavailable"
  | "email-disabled"
  | "request-code"
  | "verify-code";

export function resolveEmailSignInOperation(
  authConfig: PublicAuthConfig | null,
  hasRequestedEmailCode: boolean,
): EmailSignInOperation {
  if (authConfig?.emailEnabled === false) {
    return "email-disabled";
  }

  if (hasRequestedEmailCode) {
    return "verify-code";
  }

  if (authConfig?.enabled === false) {
    return "auth-unavailable";
  }

  return "request-code";
}

export function normalizeThemeModeFromResponse(
  value: string | null | undefined,
): AppThemeName | null {
  if (value === "dark" || value === "light") {
    return value;
  }

  return null;
}
