import AsyncStorage from "@react-native-async-storage/async-storage";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import {
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  utf8ToBytes,
} from "@noble/ciphers/utils.js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import {
  parsePendingWorkLogDrafts,
  type PendingWorkLogDraft,
} from "./workLogDraftSync";

const LEGACY_STORAGE_KEY = "meco-mobile-work-log-drafts:v1";
const STORAGE_PREFIX = "meco-mobile-work-log-drafts:v2:";
const INSTALLATION_KEY = "meco-mobile-work-log-draft-key:v1";
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type EncryptedDraftEnvelope = {
  ciphertext: string;
  expiresAt: string;
  nonce: string;
  ownerHash: string;
  version: 2;
};

async function ownerHash(ownerKey: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    ownerKey.trim().toLowerCase(),
  );
}

function associatedData(ownerKey: string) {
  return utf8ToBytes(`meco-work-log-drafts:v2:${ownerKey.trim().toLowerCase()}`);
}

function parseEnvelope(rawValue: string | null): EncryptedDraftEnvelope | null {
  if (!rawValue) {
    return null;
  }

  try {
    const value = JSON.parse(rawValue) as Partial<EncryptedDraftEnvelope>;
    if (
      value.version !== 2 ||
      typeof value.ciphertext !== "string" ||
      typeof value.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(value.expiresAt)) ||
      typeof value.nonce !== "string" ||
      typeof value.ownerHash !== "string"
    ) {
      return null;
    }
    return value as EncryptedDraftEnvelope;
  } catch {
    return null;
  }
}

async function readInstallationKey(createIfMissing: boolean) {
  const stored = await SecureStore.getItemAsync(INSTALLATION_KEY);
  if (stored) {
    try {
      const key = hexToBytes(stored);
      return key.length === 32 ? key : null;
    } catch {
      return null;
    }
  }

  if (!createIfMissing) {
    return null;
  }

  const key = await Crypto.getRandomBytesAsync(32);
  await SecureStore.setItemAsync(INSTALLATION_KEY, bytesToHex(key), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

async function storageKey(ownerKey: string) {
  return `${STORAGE_PREFIX}${await ownerHash(ownerKey)}`;
}

export async function loadPendingWorkLogDrafts(ownerKey: string, now = new Date()) {
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  const keyName = await storageKey(ownerKey);
  const rawValue = await AsyncStorage.getItem(keyName);
  const envelope = parseEnvelope(rawValue);
  if (!envelope || Date.parse(envelope.expiresAt) <= now.getTime()) {
    if (rawValue !== null) {
      await AsyncStorage.removeItem(keyName);
    }
    return [];
  }

  const key = await readInstallationKey(false);
  if (!key) {
    await AsyncStorage.removeItem(keyName);
    return [];
  }

  try {
    const plaintext = xchacha20poly1305(
      key,
      hexToBytes(envelope.nonce),
      associatedData(ownerKey),
    ).decrypt(hexToBytes(envelope.ciphertext));
    return parsePendingWorkLogDrafts(bytesToUtf8(plaintext)).filter(
      (draft) => draft.ownerKey?.trim().toLowerCase() === ownerKey.trim().toLowerCase(),
    );
  } catch {
    await AsyncStorage.removeItem(keyName);
    return [];
  }
}

export async function savePendingWorkLogDrafts(
  ownerKey: string,
  drafts: PendingWorkLogDraft[],
  now = new Date(),
) {
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  const keyName = await storageKey(ownerKey);
  const ownedDrafts = drafts.filter(
    (draft) => draft.ownerKey?.trim().toLowerCase() === ownerKey.trim().toLowerCase(),
  );
  if (ownedDrafts.length === 0) {
    await AsyncStorage.removeItem(keyName);
    return;
  }

  const key = await readInstallationKey(true);
  if (!key) {
    throw new Error("Secure draft key is unavailable.");
  }
  const nonce = await Crypto.getRandomBytesAsync(24);
  const ciphertext = xchacha20poly1305(
    key,
    nonce,
    associatedData(ownerKey),
  ).encrypt(utf8ToBytes(JSON.stringify(ownedDrafts)));
  const envelope: EncryptedDraftEnvelope = {
    ciphertext: bytesToHex(ciphertext),
    expiresAt: new Date(now.getTime() + RETENTION_MS).toISOString(),
    nonce: bytesToHex(nonce),
    ownerHash: await ownerHash(ownerKey),
    version: 2,
  };
  await AsyncStorage.setItem(keyName, JSON.stringify(envelope));
}

export async function purgeExpiredWorkLogDrafts(now = new Date()) {
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  const keys = await AsyncStorage.getAllKeys();
  const encryptedKeys = keys.filter((key) => key.startsWith(STORAGE_PREFIX));
  const values = await AsyncStorage.multiGet(encryptedKeys);
  const expired = values
    .filter(([, raw]) => {
      const envelope = parseEnvelope(raw);
      return !envelope || Date.parse(envelope.expiresAt) <= now.getTime();
    })
    .map(([key]) => key);
  if (expired.length > 0) {
    await AsyncStorage.multiRemove(expired);
  }
}

export { RETENTION_MS };
