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
      token: "session-token",
      user: sessionUser,
    });

    await expect(loadPersistedAuthSession(deviceNumber)).resolves.toEqual({
      deviceNumber,
      token: "session-token",
      user: sessionUser,
    });
    expect(storage.__store.get("meco-mobile-auth-session:v1")).toBeUndefined();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v2")).toContain(
      "session-token",
    );
  });

  it("clears and rejects a saved session when the device number changes", async () => {
    const deviceNumber = await getOrCreateAuthDeviceNumber();

    await savePersistedAuthSession({
      deviceNumber,
      token: "session-token",
      user: sessionUser,
    });

    await expect(loadPersistedAuthSession("999999999999")).resolves.toBeNull();
    await expect(loadPersistedAuthSession(deviceNumber)).resolves.toBeNull();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v2")).toBeUndefined();
  });

  it("migrates a legacy saved session to secure storage", async () => {
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

    await expect(loadPersistedAuthSession(deviceNumber)).resolves.toEqual({
      deviceNumber,
      token: "legacy-session-token",
      user: sessionUser,
    });
    await expect(loadPersistedAuthSession("999999999999")).resolves.toBeNull();
    expect(storage.__store.get("meco-mobile-auth-session:v1")).toBeUndefined();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v2")).toBeUndefined();
  });

  it("clears both current secure and legacy plaintext sessions", async () => {
    storage.__store.set("meco-mobile-auth-session:v1", "legacy-session-token");
    secureStorage.__store.set("meco-mobile-auth-session:v2", "session-token");

    await clearPersistedAuthSession();

    expect(storage.__store.get("meco-mobile-auth-session:v1")).toBeUndefined();
    expect(secureStorage.__store.get("meco-mobile-auth-session:v2")).toBeUndefined();
  });
});
