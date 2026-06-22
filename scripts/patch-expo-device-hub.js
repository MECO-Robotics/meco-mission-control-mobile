const fs = require("fs");
const path = require("path");

const logPrefix = "[patch-expo-device-hub]";

if (process.platform !== "darwin") {
  console.log(`${logPrefix} skipped: Device Hub patch is only needed on macOS.`);
  process.exit(0);
}

const prerequisitePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo",
  "node_modules",
  "@expo",
  "cli",
  "build",
  "src",
  "start",
  "doctor",
  "apple",
  "SimulatorAppPrerequisite.js",
);
const ensureRunningPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo",
  "node_modules",
  "@expo",
  "cli",
  "build",
  "src",
  "start",
  "platforms",
  "ios",
  "ensureSimulatorAppRunning.js",
);
const appleDeviceManagerPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo",
  "node_modules",
  "@expo",
  "cli",
  "build",
  "src",
  "start",
  "platforms",
  "ios",
  "AppleDeviceManager.js",
);

function patchFile(filePath, label, replacements, alreadyPatched) {
  if (!fs.existsSync(filePath)) {
    console.log(`${logPrefix} skipped ${label}: target file is not installed.`);
    return;
  }

  const original = fs.readFileSync(filePath, "utf8");

  if (alreadyPatched(original)) {
    console.log(`${logPrefix} already applied ${label}.`);
    return;
  }

  const missingTargets = replacements
    .map(([target]) => target)
    .filter((target) => !original.includes(target));

  if (missingTargets.length > 0) {
    console.warn(`${logPrefix} skipped ${label}: expected Expo source changed.`);
    return;
  }

  const patched = replacements.reduce(
    (content, [target, replacement]) => content.replace(target, replacement),
    original,
  );

  fs.writeFileSync(filePath, patched);
  console.log(`${logPrefix} applied ${label}.`);
}

patchFile(
  prerequisitePath,
  "SimulatorAppPrerequisite",
  [
    [
      "return (await (0, _osascript().execAsync)('id of app \"Simulator\"')).trim();",
      "for (const appName of ['Device Hub', 'Simulator']) {\n            try {\n                return (await (0, _osascript().execAsync)(`id of app \"${appName}\"`)).trim();\n            } catch  {}\n        }",
    ],
    [
      "const simulatorInfoPlist = _path().default.join(developerDir.trim(), 'Applications', 'Simulator.app', 'Contents', 'Info.plist');\n        const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [\n            'read',\n            simulatorInfoPlist,\n            'CFBundleIdentifier'\n        ]);\n        return bundleId.trim() || null;",
      "for (const appName of ['Device Hub.app', 'Simulator.app']) {\n            const simulatorInfoPlist = _path().default.join(developerDir.trim(), 'Applications', appName, 'Contents', 'Info.plist');\n            try {\n                const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [\n                    'read',\n                    simulatorInfoPlist,\n                    'CFBundleIdentifier'\n                ]);\n                if (bundleId.trim()) {\n                    return bundleId.trim();\n                }\n            } catch  {}\n        }\n        try {\n            await (0, _spawnasync().default)('xcrun', ['simctl', 'help']);\n            return 'com.apple.CoreSimulator.SimulatorTrampoline';\n        } catch  {}\n        return null;",
    ],
    [
      "result !== 'com.apple.CoreSimulator.SimulatorTrampoline') {",
      "result !== 'com.apple.CoreSimulator.SimulatorTrampoline' && result !== 'com.apple.dt.Devices') {",
    ],
  ],
  (content) => content.includes("Device Hub") && content.includes("com.apple.dt.Devices"),
);

patchFile(
  ensureRunningPath,
  "ensureSimulatorAppRunning",
  [
    [
      "count processes whose name is \"Simulator\"",
      "count processes whose name is \"Device Hub\"",
    ],
    ["        'Simulator'\n", "        'Device Hub'\n"],
    [
      "throw new _errors.CommandError('SIMULATOR_TIMEOUT', `Simulator app did not open fast enough. Try opening Simulator first, then running your app.`);",
      "return;",
    ],
  ],
  (content) => content.includes("Device Hub") && content.includes("return;"),
);

patchFile(
  appleDeviceManagerPath,
  "AppleDeviceManager",
  [
    ['tell application "Simulator" to activate', 'tell application "Device Hub" to activate'],
    [
      'await _osascript().execAsync(`tell application "Device Hub" to activate`);',
      'try {\n            await _osascript().execAsync(`tell application "Device Hub" to activate`);\n        } catch  {}',
    ],
  ],
  (content) =>
    content.includes('tell application "Device Hub" to activate') &&
    content.includes("try {\n            await _osascript().execAsync"),
);
