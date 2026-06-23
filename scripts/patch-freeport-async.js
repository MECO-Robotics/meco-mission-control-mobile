const fs = require("fs");
const path = require("path");

const freeportPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "freeport-async",
  "index.js",
);
const freeportPackagePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "freeport-async",
  "package.json",
);

const logPrefix = "[patch-freeport-async]";
const packageName = "freeport-async";
const expectedVersion = "2.0.0";
const maxPortConstant = "const MAX_PORT = 65535;";
const rangeStartTarget = "const DEFAULT_PORT_RANGE_START = 11000;";
const awaitablesTarget = "    var awaitables = [];";
const rangeGuard = [
  "    if (lowPort + rangeSize - 1 > MAX_PORT) {",
  "      reject(new Error(`No available ports between ${DEFAULT_PORT_RANGE_START} and ${MAX_PORT}`));",
  "      return;",
  "    }",
].join("\n");

function readInstalledVersion(packagePath) {
  if (!fs.existsSync(packagePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
}

const installedVersion = readInstalledVersion(freeportPackagePath);

if (installedVersion === null) {
  console.log(`${logPrefix} skipped: ${packageName} is not installed.`);
  process.exit(0);
}

if (installedVersion !== expectedVersion) {
  console.warn(
    `${logPrefix} skipped: unsupported ${packageName}@${installedVersion}; expected ${expectedVersion}. Review patch targets after dependency upgrades.`,
  );
  process.exit(0);
}

if (!fs.existsSync(freeportPath)) {
  console.warn(
    `${logPrefix} skipped: ${packageName}@${installedVersion} target file is missing.`,
  );
  process.exit(0);
}

const original = fs.readFileSync(freeportPath, "utf8");

if (original.includes(maxPortConstant) && original.includes(rangeGuard)) {
  console.log(`${logPrefix} already applied: ${packageName}@${installedVersion}.`);
  process.exit(0);
}

const missingTargets = [rangeStartTarget, awaitablesTarget].filter(
  (target) => !original.includes(target),
);

if (missingTargets.length > 0) {
  console.warn(
    `${logPrefix} skipped: target strings missing in ${packageName}@${installedVersion} (${missingTargets.join(", ")}).`,
  );
  process.exit(0);
}

const patched = original
  .replace(rangeStartTarget, `${rangeStartTarget}\n${maxPortConstant}`)
  .replace(awaitablesTarget, `${rangeGuard}\n${awaitablesTarget}`);

fs.writeFileSync(freeportPath, patched);
console.log(`${logPrefix} applied: ${packageName}@${installedVersion}.`);
