import AsyncStorage from "@react-native-async-storage/async-storage";

import {
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

const storage = AsyncStorage as typeof AsyncStorage & {
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
  });

  it("upgrades a legacy saved session to the current device number", async () => {
    const deviceNumber = await getOrCreateAuthDeviceNumber();

    storage.__store.set(
      "meco-mobile-auth-session:v1",
      JSON.stringify({
        token: "legacy-session-token",
        user: sessionUser,
      }),
    );

    await expect(loadPersistedAuthSession(deviceNumber)).resolves.toEqual({
      deviceNumber,
      token: "legacy-session-token",
      user: sessionUser,
    });
    await expect(loadPersistedAuthSession("999999999999")).resolves.toBeNull();
  });
});
