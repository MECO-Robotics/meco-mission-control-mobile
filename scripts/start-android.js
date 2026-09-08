const { spawnSync } = require("node:child_process");
const path = require("node:path");

// Expo owns SDK discovery, device selection/boot, and Metro port forwarding.
// This repo only supplies its emulator-to-host API default.
const expoCli = path.join(path.dirname(require.resolve("expo/package.json")), "bin", "cli");
const result = spawnSync(process.execPath, [expoCli, "start", "--android", ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_ANDROID_API_BASE_URL:
      process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      "http://10.0.2.2:8080",
  },
});

if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
