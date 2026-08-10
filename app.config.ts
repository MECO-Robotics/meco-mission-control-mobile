import type { ConfigContext, ExpoConfig } from "expo/config";

import appJson from "./app.json";

export default function configureApp({ config }: ConfigContext): ExpoConfig {
  const isProductionBuild =
    process.env.EAS_BUILD_PROFILE === "production" ||
    process.env.EXPO_PUBLIC_APP_ENV === "production";
  const base = appJson.expo as ExpoConfig;

  if (isProductionBuild) {
    const sharedUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    const iosUrl = process.env.EXPO_PUBLIC_IOS_API_BASE_URL?.trim() || sharedUrl;
    const androidUrl = process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL?.trim() || sharedUrl;
    for (const [platform, value] of [["iOS", iosUrl], ["Android", androidUrl]]) {
      if (!value || new URL(value).protocol !== "https:") {
        throw new Error(`${platform} production builds require a configured HTTPS API URL.`);
      }
    }
  }

  return {
    ...config,
    ...base,
    plugins: [
      ...(base.plugins ?? []),
      [
        "expo-build-properties",
        { android: { usesCleartextTraffic: !isProductionBuild } },
      ],
    ],
    ios: {
      ...base.ios,
      infoPlist: {
        ...base.ios?.infoPlist,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: !isProductionBuild,
        },
      },
    },
    android: {
      ...base.android,
    },
  };
}
