import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_DEVELOPER_DIR,
  DEFAULT_IOS_API_BASE_URL,
  buildIosEnv,
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
