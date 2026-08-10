import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  clearPersistedAuthSession,
  getOrCreateAuthDeviceNumber,
  loadPersistedAuthSession,
  savePersistedAuthSession,
} from "../authSessionStorage";
import type { SessionUser } from "../../types/domain";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();

  return {
    __store: store,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
    getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
});

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "00000000-0000-4000-8000-00000000002a"),
}));

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();

  return {
    __store: store,
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
});

const storage = AsyncStorage as typeof AsyncStorage & {
  __store: Map<string, string>;
};
const secureStorage = SecureStore as typeof SecureStore & {
  __store: Map<string, string>;
};

const sessionUser: SessionUser = {
  accountId: "student-1",
  authProvider: "email",
  email: "student@mecorobotics.org",
  hostedDomain: "mecorobotics.org",
  name: "Student One",
  picture: null,
};

const mobileSession = {
  accessTokenExpiresAt: "2026-08-10T13:00:00.000Z",
  refreshToken: "refresh-token",
  session: {
    createdAt: "2026-08-10T12:00:00.000Z",
    id: "device-session-one",
    lastUsedAt: "2026-08-10T12:00:00.000Z",
  },
  sessionExpiresAt: "2026-11-08T12:00:00.000Z",
  token: "access-token",
  user: sessionUser,
};

describe("auth session storage", () => {
  beforeEach(() => {
    storage.__store.clear();
    secureStorage.__store.clear();
    jest.clearAllMocks();
  });

  it("creates and reuses one numeric device number for the install", async () => {
    const firstDeviceNumber = await getOrCreateAuthDeviceNumber();
    const secondDeviceNumber = await getOrCreateAuthDeviceNumber();

    expect(firstDeviceNumber).toMatch(/^\d{12,15}$/);
    expect(secondDeviceNumber).toBe(firstDeviceNumber);
  });

  it("restores a saved session when the device number has not changed", async () => {
    const deviceNumber = await getOrCreateAuthDeviceNumber();

    await savePersistedAuthSession({
      deviceNumber,
      ...mobileSession,
    });

    await expect(loadPersistedAuthSession(deviceNumber)).resolves.toEqual({
      deviceNumber,
      ...mobileSession,
    });
    expect(storage.__store.get("meco-mobile-auth-session:v1")).toBeUndefined();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v3")).toContain(
      "refresh-token",
    );
  });

  it("clears and rejects a saved session when the device number changes", async () => {
    const deviceNumber = await getOrCreateAuthDeviceNumber();

    await savePersistedAuthSession({
      deviceNumber,
      ...mobileSession,
    });

    await expect(loadPersistedAuthSession("999999999999")).resolves.toBeNull();
    await expect(loadPersistedAuthSession(deviceNumber)).resolves.toBeNull();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v3")).toBeUndefined();
  });

  it("deletes legacy long-lived sessions and requires sign-in", async () => {
    const deviceNumber = await getOrCreateAuthDeviceNumber();

    storage.__store.set(
      "meco-mobile-auth-session:v1",
      JSON.stringify({
        token: "legacy-session-token",
        user: sessionUser,
      }),
    );
    expect(storage.__store.get("meco-mobile-auth-session:v1")).toContain(
      "legacy-session-token",
    );

    secureStorage.__store.set("meco-mobile-auth-session:v2", "legacy-secure-token");

    await expect(loadPersistedAuthSession(deviceNumber)).resolves.toBeNull();
    expect(storage.__store.get("meco-mobile-auth-session:v1")).toBeUndefined();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v2")).toBeUndefined();
  });

  it("clears both current secure and legacy plaintext sessions", async () => {
    storage.__store.set("meco-mobile-auth-session:v1", "legacy-session-token");
    secureStorage.__store.set("meco-mobile-auth-session:v2", "legacy-secure-token");
    secureStorage.__store.set("meco-mobile-auth-session:v3", "session-token");

    await clearPersistedAuthSession();

    expect(storage.__store.get("meco-mobile-auth-session:v1")).toBeUndefined();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v2")).toBeUndefined();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v3")).toBeUndefined();
  });
});
