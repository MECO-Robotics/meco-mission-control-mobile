import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_DEVELOPER_DIR,
  DEFAULT_IOS_API_BASE_URL,
  buildExpoArgs,
  buildIosEnv,
  getExpoDotenvFiles,
  parseDotenvAssignment,
  parseDotenvKey,
} = require("./run-ios.js");

function withTempRepo(callback) {
  const dir = mkdtempSync(path.join(tmpdir(), "meco-ios-env-"));
  try {
    callback(dir);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

test("parseDotenvKey reads normal and exported assignments", () => {
  assert.equal(
    parseDotenvKey("EXPO_PUBLIC_IOS_API_BASE_URL=http://example.test"),
    "EXPO_PUBLIC_IOS_API_BASE_URL",
  );
  assert.equal(
    parseDotenvKey("export EXPO_PUBLIC_IOS_API_BASE_URL=http://example.test"),
    "EXPO_PUBLIC_IOS_API_BASE_URL",
  );
  assert.equal(
    parseDotenvKey("# EXPO_PUBLIC_IOS_API_BASE_URL=http://example.test"),
    null,
  );
});

test("parseDotenvAssignment reads keys and values", () => {
  assert.deepEqual(
    parseDotenvAssignment("EXPO_PUBLIC_IOS_API_BASE_URL=http://example.test"),
    {
      key: "EXPO_PUBLIC_IOS_API_BASE_URL",
      value: "http://example.test",
    },
  );
  assert.deepEqual(parseDotenvAssignment("EXPO_PUBLIC_IOS_API_BASE_URL=   "), {
    key: "EXPO_PUBLIC_IOS_API_BASE_URL",
    value: "",
  });
});

test("buildIosEnv supplies simulator defaults when no override exists", () => {
  withTempRepo((repoRoot) => {
    const env = buildIosEnv({}, repoRoot);

    assert.equal(env.DEVELOPER_DIR, DEFAULT_DEVELOPER_DIR);
    assert.equal(env.EXPO_PUBLIC_IOS_API_BASE_URL, DEFAULT_IOS_API_BASE_URL);
  });
});

test("buildIosEnv preserves parent iOS API overrides", () => {
  withTempRepo((repoRoot) => {
    const env = buildIosEnv(
      {
        DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
        EXPO_PUBLIC_IOS_API_BASE_URL: "http://staging.example.test",
      },
      repoRoot,
    );

    assert.equal(env.DEVELOPER_DIR, "/Applications/Xcode.app/Contents/Developer");
    assert.equal(env.EXPO_PUBLIC_IOS_API_BASE_URL, "http://staging.example.test");
  });
});

test("buildIosEnv lets dotenv iOS API overrides win over the default", () => {
  withTempRepo((repoRoot) => {
    writeFileSync(
      path.join(repoRoot, ".env.local"),
      "EXPO_PUBLIC_IOS_API_BASE_URL=http://dotenv.example.test\n",
    );

    const env = buildIosEnv({}, repoRoot);

    assert.equal(env.EXPO_PUBLIC_IOS_API_BASE_URL, undefined);
  });
});

test("buildIosEnv honors development dotenv iOS API overrides", () => {
  withTempRepo((repoRoot) => {
    writeFileSync(
      path.join(repoRoot, ".env.development.local"),
      "EXPO_PUBLIC_IOS_API_BASE_URL=http://development.example.test\n",
    );

    const env = buildIosEnv({}, repoRoot);

    assert.equal(env.EXPO_PUBLIC_IOS_API_BASE_URL, undefined);
  });
});

test("buildIosEnv treats blank dotenv iOS API values as missing", () => {
  withTempRepo((repoRoot) => {
    writeFileSync(path.join(repoRoot, ".env.local"), "EXPO_PUBLIC_IOS_API_BASE_URL=\n");

    const env = buildIosEnv({}, repoRoot);

    assert.equal(env.EXPO_PUBLIC_IOS_API_BASE_URL, DEFAULT_IOS_API_BASE_URL);
  });
});

test("getExpoDotenvFiles follows NODE_ENV when provided", () => {
  assert.deepEqual(getExpoDotenvFiles({ NODE_ENV: "test" }), [
    ".env",
    ".env.local",
    ".env.test",
    ".env.test.local",
  ]);
});

test("buildExpoArgs forwards additional Expo start flags", () => {
  assert.deepEqual(buildExpoArgs(["--clear"]), [
    "expo",
    "start",
    "--localhost",
    "--port",
    "8081",
    "--clear",
  ]);
});

test("build_and_run launchers check dotenv before injecting iOS API default", () => {
  const bashLauncher = readFileSync(
    path.join(process.cwd(), "script", "build_and_run.sh"),
    "utf8",
  );
  const powershellLauncher = readFileSync(
    path.join(process.cwd(), "script", "build_and_run.ps1"),
    "utf8",
  );

  assert.match(bashLauncher, /use_ios_api_default_if_needed/);
  assert.match(bashLauncher, /\.env\.\$\{expo_env\}\.local/);
  assert.doesNotMatch(
    bashLauncher,
    /EXPO_PUBLIC_IOS_API_BASE_URL="\$\{EXPO_PUBLIC_IOS_API_BASE_URL:-http:\/\/localhost:8080\}"/,
  );

  assert.match(powershellLauncher, /Set-IosApiDefaultIfNeeded/);
  assert.match(powershellLauncher, /\.env\.\$expoEnv\.local/);
  assert.doesNotMatch(
    powershellLauncher,
    /Set-DefaultEnvValue "EXPO_PUBLIC_IOS_API_BASE_URL" "http:\/\/localhost:8080"/,
  );
});
