const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const BASH_FALLBACKS = [
  "C:\\Program Files\\Git\\bin\\bash.exe",
  "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  "/usr/bin/bash",
  "/bin/bash",
];

function getPathBashCandidates() {
  const command = process.platform === "win32" ? "where.exe" : "sh";
  const args = process.platform === "win32" ? ["bash"] : ["-lc", "command -v bash"];
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0 || !result.stdout) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

function resolveBash() {
  const candidates = [
    process.env.BASH_PATH,
    ...getPathBashCandidates(),
    ...BASH_FALLBACKS,
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const forwardedArgs = args.filter((arg) => arg !== "--check");
const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, "script", "build_and_run.sh");
const bashPath = resolveBash();

if (!existsSync(scriptPath)) {
  console.error(`Build script not found: ${scriptPath}`);
  process.exit(1);
}

if (!bashPath) {
  console.error("Bash was not found. Install Git for Windows or set BASH_PATH to a bash executable.");
  process.exit(1);
}

if (checkOnly) {
  console.log(`bash=${bashPath}`);
  console.log(`script=${scriptPath}`);
  process.exit(0);
}

const result = spawnSync(bashPath, [scriptPath, ...forwardedArgs], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
