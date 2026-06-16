import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import type { SessionUser } from "../types/domain";

type PersistedAuthSession = {
  deviceNumber: string | null;
  token: string;
  user: SessionUser;
};

const DEVICE_NUMBER_STORAGE_KEY = "meco-mobile-device-number:v1";
const SESSION_STORAGE_KEY = "meco-mobile-auth-session:v1";

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

async function readStoredSessionRaw(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_STORAGE_KEY);
}

async function writeStoredSessionRaw(rawValue: string | null) {
  if (rawValue === null) {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(SESSION_STORAGE_KEY, rawValue);
}

export async function loadPersistedAuthSession(deviceNumber: string) {
  const rawValue = await readStoredSessionRaw();
  const parsed = parsePersistedSession(rawValue);

  if (!parsed && rawValue !== null) {
    await writeStoredSessionRaw(null);
    return null;
  }

  if (!parsed) {
    return null;
  }

  if (parsed.deviceNumber === null) {
    const upgradedSession = { ...parsed, deviceNumber };
    await savePersistedAuthSession(upgradedSession);
    return upgradedSession;
  }

  if (parsed.deviceNumber !== deviceNumber) {
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
