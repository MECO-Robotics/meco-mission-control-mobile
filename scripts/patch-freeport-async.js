const fs = require("fs");
const path = require("path");

const freeportPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "freeport-async",
  "index.js",
);

const logPrefix = "[patch-freeport-async]";
const maxPortConstant = "const MAX_PORT = 65535;";
const rangeStartTarget = "const DEFAULT_PORT_RANGE_START = 11000;";
const awaitablesTarget = "    var awaitables = [];";
const rangeGuard = [
  "    if (lowPort + rangeSize - 1 > MAX_PORT) {",
  "      reject(new Error(`No available ports between ${DEFAULT_PORT_RANGE_START} and ${MAX_PORT}`));",
  "      return;",
  "    }",
].join("\n");

if (!fs.existsSync(freeportPath)) {
  console.log(`${logPrefix} skipped: freeport-async is not installed.`);
  process.exit(0);
}

const original = fs.readFileSync(freeportPath, "utf8");

if (original.includes(maxPortConstant) && original.includes(rangeGuard)) {
  console.log(`${logPrefix} already applied.`);
  process.exit(0);
}

const missingTargets = [rangeStartTarget, awaitablesTarget].filter(
  (target) => !original.includes(target),
);

if (missingTargets.length > 0) {
  console.warn(
    `${logPrefix} skipped: expected freeport-async source changed (${missingTargets.join(", ")}).`,
  );
  process.exit(0);
}

const patched = original
  .replace(rangeStartTarget, `${rangeStartTarget}\n${maxPortConstant}`)
  .replace(awaitablesTarget, `${rangeGuard}\n${awaitablesTarget}`);

fs.writeFileSync(freeportPath, patched);
console.log(`${logPrefix} applied.`);
