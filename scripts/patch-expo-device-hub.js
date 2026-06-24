const fs = require("fs");
const path = require("path");

const logPrefix = "[patch-expo-device-hub]";
const packageName = "@expo/cli";
const expectedVersion = "54.0.25";

if (process.platform !== "darwin") {
  console.log(
    `${logPrefix} skipped: process.platform=${process.platform}; iOS Device Hub patch only applies on macOS.`,
  );
  process.exit(0);
}

const cliPackageCandidates = [
  path.join(__dirname, "..", "node_modules", "@expo", "cli", "package.json"),
  path.join(
    __dirname,
    "..",
    "node_modules",
    "expo",
    "node_modules",
    "@expo",
    "cli",
    "package.json",
  ),
];

function findInstalledPackage(packagePaths) {
  for (const packagePath of packagePaths) {
    if (fs.existsSync(packagePath)) {
      return {
        packageRoot: path.dirname(packagePath),
        version: JSON.parse(fs.readFileSync(packagePath, "utf8")).version,
      };
    }
  }

  return null;
}

const installedPackage = findInstalledPackage(cliPackageCandidates);

if (installedPackage === null) {
  console.log(`${logPrefix} skipped: ${packageName} is not installed.`);
  process.exit(0);
}

if (installedPackage.version !== expectedVersion) {
  console.warn(
    `${logPrefix} skipped: unsupported ${packageName}@${installedPackage.version}; expected ${expectedVersion}. Review patch targets after dependency upgrades.`,
  );
  process.exit(0);
}

console.log(`${logPrefix} checking ${packageName}@${installedPackage.version}.`);

const prerequisitePath = path.join(
  installedPackage.packageRoot,
  "build",
  "src",
  "start",
  "doctor",
  "apple",
  "SimulatorAppPrerequisite.js",
);
const ensureRunningPath = path.join(
  installedPackage.packageRoot,
  "build",
  "src",
  "start",
  "platforms",
  "ios",
  "ensureSimulatorAppRunning.js",
);
const appleDeviceManagerPath = path.join(
  installedPackage.packageRoot,
  "build",
  "src",
  "start",
  "platforms",
  "ios",
  "AppleDeviceManager.js",
);

function patchFile(filePath, label, replacements, alreadyPatched) {
  if (!fs.existsSync(filePath)) {
    console.warn(`${logPrefix} skipped ${label}: target file is missing.`);
    return "skipped";
  }

  const original = fs.readFileSync(filePath, "utf8");

  if (alreadyPatched(original)) {
    console.log(`${logPrefix} already applied ${label}.`);
    return "already applied";
  }

  const missingTargets = replacements
    .map(([target]) => target)
    .filter((target) => !original.includes(target));

  if (missingTargets.length > 0) {
    console.warn(
      `${logPrefix} skipped ${label}: target strings missing in ${packageName}@${installedPackage.version}.`,
    );
    return "skipped";
  }

  const patched = replacements.reduce(
    (content, [target, replacement]) => content.replace(target, replacement),
    original,
  );

  fs.writeFileSync(filePath, patched);
  console.log(`${logPrefix} applied ${label}.`);
  return "applied";
}

const results = [
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
  ),

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
  ),

  patchFile(
    appleDeviceManagerPath,
    "AppleDeviceManager",
    [
      [
        'await _osascript().execAsync(`tell application "Simulator" to activate`);',
        'try {\n            await _osascript().execAsync(`tell application "Device Hub" to activate`);\n        } catch  {}',
      ],
    ],
    (content) =>
      content.includes('tell application "Device Hub" to activate') &&
      content.includes("try {\n            await _osascript().execAsync"),
  ),
];

const summary = results.reduce(
  (counts, status) => {
    counts[status] += 1;
    return counts;
  },
  { applied: 0, "already applied": 0, skipped: 0 },
);

console.log(
  `${logPrefix} summary: applied=${summary.applied}, already applied=${summary["already applied"]}, skipped=${summary.skipped}.`,
);
