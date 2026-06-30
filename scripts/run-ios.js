const { spawnSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const DEFAULT_DEVELOPER_DIR = "/Applications/Xcode-beta.app/Contents/Developer";
const DEFAULT_IOS_API_BASE_URL = "http://localhost:8080";
const DOTENV_FILES = [".env", ".env.local"];

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDotenvKey(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const assignment = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trimStart()
    : trimmed;
  const match = assignment.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  return match?.[1] ?? null;
}

function dotenvDefinesKey(repoRoot, key) {
  return DOTENV_FILES.some((fileName) => {
    const filePath = path.join(repoRoot, fileName);
    if (!existsSync(filePath)) {
      return false;
    }

    return readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .some((line) => parseDotenvKey(line) === key);
  });
}

function buildIosEnv(baseEnv, repoRoot) {
  const env = { ...baseEnv };

  if (!hasValue(env.DEVELOPER_DIR)) {
    env.DEVELOPER_DIR = DEFAULT_DEVELOPER_DIR;
  }

  if (
    !hasValue(env.EXPO_PUBLIC_IOS_API_BASE_URL) &&
    !dotenvDefinesKey(repoRoot, "EXPO_PUBLIC_IOS_API_BASE_URL")
  ) {
    env.EXPO_PUBLIC_IOS_API_BASE_URL = DEFAULT_IOS_API_BASE_URL;
  }

  return env;
}

function runIos(repoRoot = process.cwd(), baseEnv = process.env) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    command,
    ["expo", "start", "--localhost", "--port", "8081"],
    {
      cwd: repoRoot,
      env: buildIosEnv(baseEnv, repoRoot),
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

if (require.main === module) {
  process.exit(runIos());
}

module.exports = {
  DEFAULT_DEVELOPER_DIR,
  DEFAULT_IOS_API_BASE_URL,
  buildIosEnv,
  dotenvDefinesKey,
  parseDotenvKey,
  runIos,
};
