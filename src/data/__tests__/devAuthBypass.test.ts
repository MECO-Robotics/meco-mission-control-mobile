import {
  buildLocalDevSessionUser,
  isLocalDevAuthBypassEnabled,
} from "../devAuthBypass";

describe("local dev auth bypass", () => {
  it("enables only for explicit public dev flags in development", () => {
    expect(
      isLocalDevAuthBypassEnabled({ EXPO_PUBLIC_DEV_AUTH_BYPASS: "true" }, true),
    ).toBe(true);
    expect(
      isLocalDevAuthBypassEnabled({ EXPO_PUBLIC_DEV_AUTH_BYPASS: "1" }, true),
    ).toBe(true);
    expect(
      isLocalDevAuthBypassEnabled({ EXPO_PUBLIC_DEV_AUTH_BYPASS: "yes" }, true),
    ).toBe(true);
  });

  it("stays disabled without the flag or outside development", () => {
    expect(isLocalDevAuthBypassEnabled({}, true)).toBe(false);
    expect(
      isLocalDevAuthBypassEnabled({ EXPO_PUBLIC_DEV_AUTH_BYPASS: "true" }, false),
    ).toBe(false);
  });

  it("builds a local admin session user from the requested email", () => {
    expect(buildLocalDevSessionUser("Mentor@MECOrobotics.org", "mecorobotics.org")).toEqual({
      accountId: "mentor",
      authProvider: "email",
      email: "mentor@mecorobotics.org",
      hostedDomain: "mecorobotics.org",
      name: "Dev Bypass",
      picture: null,
      role: "admin",
    });
  });
});
