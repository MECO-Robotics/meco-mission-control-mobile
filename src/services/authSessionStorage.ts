import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import type { MobileSessionResponse, SessionUser } from "../types/domain";

type PersistedAuthSession = MobileSessionResponse & {
  deviceNumber: string | null;
};

const DEVICE_NUMBER_STORAGE_KEY = "meco-mobile-device-number:v1";
const LEGACY_SESSION_STORAGE_KEY = "meco-mobile-auth-session:v1";
const LEGACY_SECURE_STORAGE_KEY = "meco-mobile-auth-session:v2";
const SESSION_SECURE_STORAGE_KEY = "meco-mobile-auth-session:v3";

function isDeviceNumber(value: unknown): value is string {
  return typeof value === "string" && /^\d{12,15}$/.test(value);
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.accountId === "string" &&
    candidate.accountId.length > 0 &&
    (candidate.authProvider === "google" || candidate.authProvider === "email") &&
    typeof candidate.email === "string" &&
    candidate.email.length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    (candidate.picture === null || typeof candidate.picture === "string") &&
    typeof candidate.hostedDomain === "string" &&
    candidate.hostedDomain.length > 0
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function generateDeviceNumber() {
  // A stable local device number lets us bind restored sessions to this install
  // without storing platform-specific device identifiers.
  const uuidHex = Crypto.randomUUID().replace(/-/g, "");
  const numericValue = parseInt(uuidHex.slice(0, 12), 16);
  return String(numericValue).padStart(15, "0");
}

export async function getOrCreateAuthDeviceNumber() {
  const storedDeviceNumber = await AsyncStorage.getItem(DEVICE_NUMBER_STORAGE_KEY);
  if (isDeviceNumber(storedDeviceNumber)) {
    return storedDeviceNumber;
  }

  const nextDeviceNumber = generateDeviceNumber();
  await AsyncStorage.setItem(DEVICE_NUMBER_STORAGE_KEY, nextDeviceNumber);
  return nextDeviceNumber;
}

function parsePersistedSession(rawValue: string | null): PersistedAuthSession | null {
  if (!rawValue) {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const deviceNumber =
    candidate.deviceNumber === undefined ? null : candidate.deviceNumber;
  if (deviceNumber !== null && !isDeviceNumber(deviceNumber)) {
    return null;
  }

  if (typeof candidate.token !== "string" || candidate.token.length === 0) {
    return null;
  }

  if (
    typeof candidate.refreshToken !== "string" ||
    candidate.refreshToken.length === 0 ||
    !isIsoDate(candidate.accessTokenExpiresAt) ||
    !isIsoDate(candidate.sessionExpiresAt)
  ) {
    return null;
  }

  const session = candidate.session as Record<string, unknown> | undefined;
  if (
    !session ||
    typeof session.id !== "string" ||
    session.id.length === 0 ||
    !isIsoDate(session.createdAt) ||
    !isIsoDate(session.lastUsedAt)
  ) {
    return null;
  }

  if (!isSessionUser(candidate.user)) {
    return null;
  }

  return {
    deviceNumber,
    token: candidate.token,
    refreshToken: candidate.refreshToken,
    accessTokenExpiresAt: candidate.accessTokenExpiresAt,
    sessionExpiresAt: candidate.sessionExpiresAt,
    session: {
      id: session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
    },
    user: candidate.user,
  };
}

async function readStoredSessionRaw() {
  try {
    const secureValue = await SecureStore.getItemAsync(SESSION_SECURE_STORAGE_KEY);
    return secureValue;
  } catch {
    return null;
  }
}

async function writeStoredSessionRaw(rawValue: string | null) {
  await Promise.allSettled([
    AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY),
    SecureStore.deleteItemAsync(LEGACY_SECURE_STORAGE_KEY),
  ]);

  if (rawValue === null) {
    await SecureStore.deleteItemAsync(SESSION_SECURE_STORAGE_KEY);
    return;
  }

  await SecureStore.setItemAsync(SESSION_SECURE_STORAGE_KEY, rawValue, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadPersistedAuthSession(deviceNumber: string) {
  // v1/v2 credentials were long-lived bearer sessions. Delete them instead of
  // silently upgrading so every install starts with independently rotatable v3 tokens.
  await Promise.allSettled([
    AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY),
    SecureStore.deleteItemAsync(LEGACY_SECURE_STORAGE_KEY),
  ]);

  const rawValue = await readStoredSessionRaw();
  const parsed = parsePersistedSession(rawValue);

  if (!parsed && rawValue !== null) {
    await writeStoredSessionRaw(null);
    return null;
  }

  if (!parsed) {
    return null;
  }

  if (parsed.deviceNumber === null || parsed.deviceNumber !== deviceNumber) {
    // Avoid restoring a copied AsyncStorage session on a different install.
    await writeStoredSessionRaw(null);
    return null;
  }

  return parsed;
}

export async function savePersistedAuthSession(session: PersistedAuthSession) {
  await writeStoredSessionRaw(JSON.stringify(session));
}

export async function clearPersistedAuthSession() {
  await writeStoredSessionRaw(null);
}

export type { PersistedAuthSession };
