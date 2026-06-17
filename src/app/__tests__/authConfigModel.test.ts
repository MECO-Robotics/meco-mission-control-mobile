import {
  getActiveGoogleClientId,
  normalizeThemeModeFromResponse,
  resolveGoogleClientIds,
} from "../authConfigModel";

describe("auth config model", () => {
  it("uses backend Google config with platform-specific env overrides", () => {
    const ids = resolveGoogleClientIds(
      {
        enabled: true,
        googleClientId: "backend-client",
        hostedDomain: "mecorobotics.org",
        emailEnabled: true,
      },
      {
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "ios-client",
        EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: "android-client",
      },
    );

    expect(ids).toEqual({
      googleClientId: "backend-client",
      googleIosClientId: "ios-client",
      googleAndroidClientId: "android-client",
      googleWebClientId: "backend-client",
    });
  });

  it("falls back to shared env Google config when backend config is missing", () => {
    expect(
      resolveGoogleClientIds(null, {
        EXPO_PUBLIC_GOOGLE_CLIENT_ID: "shared-client",
      }),
    ).toEqual({
      googleClientId: "shared-client",
      googleIosClientId: "shared-client",
      googleAndroidClientId: "shared-client",
      googleWebClientId: "shared-client",
    });
  });

  it("selects the active Google client id by platform", () => {
    const ids = {
      googleClientId: "shared-client",
      googleIosClientId: "ios-client",
      googleAndroidClientId: "android-client",
      googleWebClientId: "web-client",
    };

    expect(getActiveGoogleClientId(ids, "ios")).toBe("ios-client");
    expect(getActiveGoogleClientId(ids, "android")).toBe("android-client");
    expect(getActiveGoogleClientId(ids, "web")).toBe("web-client");
  });

  it("normalizes only supported persisted theme modes", () => {
    expect(normalizeThemeModeFromResponse("dark")).toBe("dark");
    expect(normalizeThemeModeFromResponse("light")).toBe("light");
    expect(normalizeThemeModeFromResponse("system")).toBeNull();
    expect(normalizeThemeModeFromResponse(null)).toBeNull();
  });
});
