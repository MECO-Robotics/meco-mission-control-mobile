const fs = require("fs");
const path = require("path");

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

function patchFile(filePath, patcher) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const original = fs.readFileSync(filePath, "utf8");
  const patched = patcher(original);

  if (patched === original) {
    return;
  }

  fs.writeFileSync(filePath, patched);
}

patchFile(prerequisitePath, (original) => {
  if (
    original.includes("Device Hub") &&
    original.includes("com.apple.dt.Devices")
  ) {
    return original;
  }

  return original
    .replace(
      "return (await (0, _osascript().execAsync)('id of app \"Simulator\"')).trim();",
      "for (const appName of ['Device Hub', 'Simulator']) {\n            try {\n                return (await (0, _osascript().execAsync)(`id of app \"${appName}\"`)).trim();\n            } catch  {}\n        }",
    )
    .replace(
      "const simulatorInfoPlist = _path().default.join(developerDir.trim(), 'Applications', 'Simulator.app', 'Contents', 'Info.plist');\n        const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [\n            'read',\n            simulatorInfoPlist,\n            'CFBundleIdentifier'\n        ]);\n        return bundleId.trim() || null;",
      "for (const appName of ['Device Hub.app', 'Simulator.app']) {\n            const simulatorInfoPlist = _path().default.join(developerDir.trim(), 'Applications', appName, 'Contents', 'Info.plist');\n            try {\n                const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [\n                    'read',\n                    simulatorInfoPlist,\n                    'CFBundleIdentifier'\n                ]);\n                if (bundleId.trim()) {\n                    return bundleId.trim();\n                }\n            } catch  {}\n        }\n        try {\n            await (0, _spawnasync().default)('xcrun', ['simctl', 'help']);\n            return 'com.apple.CoreSimulator.SimulatorTrampoline';\n        } catch  {}\n        return null;",
    )
    .replace(
      "result !== 'com.apple.CoreSimulator.SimulatorTrampoline') {",
      "result !== 'com.apple.CoreSimulator.SimulatorTrampoline' && result !== 'com.apple.dt.Devices') {",
    );
});

patchFile(ensureRunningPath, (original) =>
  original
    .replace(
      "count processes whose name is \"Simulator\"",
      "count processes whose name is \"Device Hub\"",
    )
    .replace("        'Simulator'\n", "        'Device Hub'\n")
    .replace(
      "throw new _errors.CommandError('SIMULATOR_TIMEOUT', `Simulator app did not open fast enough. Try opening Simulator first, then running your app.`);",
      "return;",
    ),
);

patchFile(appleDeviceManagerPath, (original) =>
  original
    .replace(
      'tell application "Simulator" to activate',
      'tell application "Device Hub" to activate',
    )
    .replace(
      'await _osascript().execAsync(`tell application "Device Hub" to activate`);',
      'try {\n            await _osascript().execAsync(`tell application "Device Hub" to activate`);\n        } catch  {}',
    ),
);
