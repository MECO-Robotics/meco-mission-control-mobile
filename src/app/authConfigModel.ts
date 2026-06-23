import type { PublicAuthConfig } from "../types/domain";
import type { AppThemeName } from "../theme";

export const DEVICE_SESSION_RESTORED_NOTICE = "Signed in on this device.";
export const GOOGLE_CLIENT_ID_PLACEHOLDER = "missing-google-client-id";

export type EmailCodeStartResponse = {
  sentTo?: string;
  expiresInMinutes?: number;
};

export type ThemePreferenceResponse = {
  themeMode: AppThemeName | null;
};

export type GoogleClientIds = {
  googleClientId: string;
  googleIosClientId: string;
  googleAndroidClientId: string;
  googleWebClientId: string;
};

type GoogleClientEnv = {
  EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
};

export function resolveGoogleClientIds(
  authConfig: PublicAuthConfig | null,
  env?: GoogleClientEnv,
): GoogleClientIds {
  const sourceEnv = env ?? (process.env as GoogleClientEnv);
  const envGoogleClientId = sourceEnv.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleClientId = authConfig?.googleClientId?.trim() || envGoogleClientId;

  return {
    googleClientId,
    googleIosClientId:
      sourceEnv.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || googleClientId,
    googleAndroidClientId:
      sourceEnv.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || googleClientId,
    googleWebClientId:
      sourceEnv.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || googleClientId,
  };
}

export function getActiveGoogleClientId(
  googleClientIds: GoogleClientIds,
  platformOS: string,
) {
  if (platformOS === "ios") {
    return googleClientIds.googleIosClientId;
  }

  if (platformOS === "android") {
    return googleClientIds.googleAndroidClientId;
  }

  return googleClientIds.googleWebClientId;
}

export function normalizeThemeModeFromResponse(
  value: string | null | undefined,
): AppThemeName | null {
  if (value === "dark" || value === "light") {
    return value;
  }

  return null;
}
