import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import type { SessionUser } from "../types/domain";

type PersistedAuthSession = {
  deviceNumber: string | null;
  token: string;
  user: SessionUser;
};

const DEVICE_NUMBER_STORAGE_KEY = "meco-mobile-device-number:v1";
const LEGACY_SESSION_STORAGE_KEY = "meco-mobile-auth-session:v1";
const SESSION_SECURE_STORAGE_KEY = "meco-mobile-auth-session:v2";

type StoredSessionSource = "secure" | "legacy";

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

  if (!isSessionUser(candidate.user)) {
    return null;
  }

  return {
    deviceNumber,
    token: candidate.token,
    user: candidate.user,
  };
}

async function readStoredSessionRaw(): Promise<{
  rawValue: string | null;
  source: StoredSessionSource | null;
}> {
  try {
    const secureValue = await SecureStore.getItemAsync(SESSION_SECURE_STORAGE_KEY);
    if (secureValue !== null) {
      return { rawValue: secureValue, source: "secure" };
    }
  } catch {
    await AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    return { rawValue: null, source: null };
  }

  const legacyValue = await AsyncStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
  return {
    rawValue: legacyValue,
    source: legacyValue === null ? null : "legacy",
  };
}

async function writeStoredSessionRaw(rawValue: string | null) {
  await AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);

  if (rawValue === null) {
    await SecureStore.deleteItemAsync(SESSION_SECURE_STORAGE_KEY);
    return;
  }

  await SecureStore.setItemAsync(SESSION_SECURE_STORAGE_KEY, rawValue);
}

export async function loadPersistedAuthSession(deviceNumber: string) {
  const { rawValue, source } = await readStoredSessionRaw();
  const parsed = parsePersistedSession(rawValue);

  if (!parsed && rawValue !== null) {
    await writeStoredSessionRaw(null);
    return null;
  }

  if (!parsed) {
    return null;
  }

  if (parsed.deviceNumber === null) {
    // Upgrade sessions written before device binding was added.
    const upgradedSession = { ...parsed, deviceNumber };
    await savePersistedAuthSession(upgradedSession);
    return upgradedSession;
  }

  if (parsed.deviceNumber !== deviceNumber) {
    // Avoid restoring a copied AsyncStorage session on a different install.
    await writeStoredSessionRaw(null);
    return null;
  }

  if (source === "legacy") {
    await savePersistedAuthSession(parsed);
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
