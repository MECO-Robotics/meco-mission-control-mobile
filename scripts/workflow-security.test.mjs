import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const workflowsDirectory = path.join(root, ".github", "workflows");

async function readWorkflow(name) {
  return readFile(path.join(workflowsDirectory, name), "utf8");
}

function runBlocks(workflow) {
  const lines = workflow.split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)run:\s*\|\s*$/);
    if (!match) continue;

    const indentation = match[1].length;
    const block = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() && line.match(/^\s*/)[0].length <= indentation) {
        index -= 1;
        break;
      }
      block.push(line);
    }
    blocks.push(block.join("\n"));
  }

  return blocks;
}

test("all third-party Actions use immutable commit SHAs", async () => {
  const workflowFiles = (await readdir(workflowsDirectory)).filter((name) => name.endsWith(".yml"));
  const mutable = [];

  for (const name of workflowFiles) {
    const workflow = await readWorkflow(name);
    for (const [index, line] of workflow.split("\n").entries()) {
      if (!/^\s*uses:/.test(line)) continue;
      if (!/^\s*uses:\s+[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}(?:\s+#.*)?$/.test(line)) {
        mutable.push(`${name}:${index + 1}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(mutable, []);
});

test("pull-request workflows do not expose repository secrets", async () => {
  for (const name of ["ci.yml", "check-skills.yml"]) {
    const workflow = await readWorkflow(name);
    assert.match(workflow, /\bpull_request:/);
    assert.doesNotMatch(workflow, /\bsecrets\./, `${name} must remain secretless`);
  }
});

test("release source is protected main or a release tag contained in main", async () => {
  const release = await readWorkflow("mobile-release.yml");

  assert.doesNotMatch(release, /release_manifest/i);
  assert.doesNotMatch(release, /\n\s+push:\s*\n/);
  assert.match(release, /EVENT_REF.*refs\/heads\/main/s);
  assert.match(release, /\^release-\[A-Za-z0-9\._-\]\+\$/);
  assert.match(release, /git merge-base --is-ancestor "\$TARGET_SHA" refs\/remotes\/origin\/main/);
  assert.match(release, /ref: main/);
  assert.equal((release.match(/environment: production/g) ?? []).length, 2);
});

test("dispatch inputs never interpolate directly into shell scripts", async () => {
  const release = await readWorkflow("mobile-release.yml");
  for (const block of runBlocks(release)) {
    assert.doesNotMatch(block, /\$\{\{\s*(?:inputs|github\.event\.inputs)\./);
  }
  assert.match(release, /INPUT_RELEASE_TAG: \$\{\{ inputs\.release_tag \|\| '' \}\}/);
  assert.match(release, /INPUT_RELEASE_NAME: \$\{\{ inputs\.release_name \|\| '' \}\}/);
});

test("release credentials and write permission are narrowly scoped", async () => {
  const release = await readWorkflow("mobile-release.yml");
  const prepare = release.slice(release.indexOf("\n  prepare:"), release.indexOf("\n  build:"));
  const build = release.slice(release.indexOf("\n  build:"), release.indexOf("\n  publish:"));
  const publish = release.slice(release.indexOf("\n  publish:"));

  assert.doesNotMatch(prepare, /\bsecrets\./);
  assert.doesNotMatch(publish, /\bsecrets\./);
  assert.doesNotMatch(release, /^\s+token:\s*\$\{\{\s*secrets\./m);
  assert.match(build, /permissions:\n\s+contents: read/);
  assert.match(publish, /permissions:\n\s+contents: write/);
  assert.doesNotMatch(release, /^    env:\s*\n      EXPO_TOKEN:/m);
  assert.match(build, /Install dependencies before exposing release credentials[\s\S]*?run: npm ci/);
});

test("release and CI tool versions are reproducible", async () => {
  const release = await readWorkflow("mobile-release.yml");
  const ci = await readWorkflow("ci.yml");
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const nvm = (await readFile(path.join(root, ".nvmrc"), "utf8")).trim();

  assert.doesNotMatch(release, /eas-version:\s*latest/);
  assert.match(release, /eas-version: 21\.7\.1/);
  assert.doesNotMatch(release, /npx\s+(?:--yes\s+)?eas-cli/);
  assert.doesNotMatch(`${release}\n${ci}`, /node-version:\s*22(?:\s|$)/);
  assert.equal(nvm, "22.13.0");
  assert.equal(pkg.engines.node, ">=22.13 <23");
});
