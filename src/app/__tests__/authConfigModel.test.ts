import {
  normalizeThemeModeFromResponse,
  resolveEmailSignInOperation,
} from "../authConfigModel";

describe("auth config model", () => {
  it("keeps email sign-in on the email-code flow when dev bypass is available", () => {
    expect(
      resolveEmailSignInOperation(
        {
          enabled: true,
          googleClientId: null,
          hostedDomain: "mecorobotics.org",
          emailEnabled: true,
          devBypassAvailable: true,
        },
        false,
      ),
    ).toBe("request-code");
  });

  it("resolves email verification after a code has been requested", () => {
    expect(
      resolveEmailSignInOperation(
        {
          enabled: true,
          googleClientId: null,
          hostedDomain: "mecorobotics.org",
          emailEnabled: true,
          devBypassAvailable: true,
        },
        true,
      ),
    ).toBe("verify-code");
  });

  it("respects unavailable and disabled email sign-in states", () => {
    expect(
      resolveEmailSignInOperation(
        {
          enabled: false,
          googleClientId: null,
          hostedDomain: "mecorobotics.org",
          emailEnabled: true,
          devBypassAvailable: true,
        },
        false,
      ),
    ).toBe("auth-unavailable");

    expect(
      resolveEmailSignInOperation(
        {
          enabled: true,
          googleClientId: null,
          hostedDomain: "mecorobotics.org",
          emailEnabled: false,
          devBypassAvailable: true,
        },
        false,
      ),
    ).toBe("email-disabled");
  });

  it("normalizes only supported persisted theme modes", () => {
    expect(normalizeThemeModeFromResponse("dark")).toBe("dark");
    expect(normalizeThemeModeFromResponse("light")).toBe("light");
    expect(normalizeThemeModeFromResponse("system")).toBeNull();
    expect(normalizeThemeModeFromResponse(null)).toBeNull();
  });
});
