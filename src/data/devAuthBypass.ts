import type { SessionUser } from "../types/domain";

const DEV_AUTH_BYPASS_VALUES = new Set(["1", "true", "yes", "on"]);
const DEFAULT_DEV_EMAIL = "dev@mecorobotics.org";
const DEFAULT_DEV_HOSTED_DOMAIN = "mecorobotics.org";
type DevAuthBypassEnv = {
  EXPO_PUBLIC_DEV_AUTH_BYPASS?: string;
  NODE_ENV?: string;
};

function getDefaultDevelopmentMode() {
  if (typeof __DEV__ !== "undefined") {
    return __DEV__;
  }

  return process.env.NODE_ENV !== "production";
}

export function isLocalDevAuthBypassEnabled(
  env: DevAuthBypassEnv = process.env,
  isDevelopment = getDefaultDevelopmentMode(),
) {
  const configuredValue = env.EXPO_PUBLIC_DEV_AUTH_BYPASS?.trim().toLowerCase();
  return isDevelopment && DEV_AUTH_BYPASS_VALUES.has(configuredValue ?? "");
}

export function buildLocalDevSessionUser(
  email = DEFAULT_DEV_EMAIL,
  hostedDomain = DEFAULT_DEV_HOSTED_DOMAIN,
): SessionUser {
  const normalizedEmail = email.trim().toLowerCase() || DEFAULT_DEV_EMAIL;
  const [accountId] = normalizedEmail.split("@");

  return {
    accountId: accountId || "dev",
    authProvider: "email",
    email: normalizedEmail,
    hostedDomain,
    name: "Dev Bypass",
    picture: null,
    role: "admin",
  };
}
