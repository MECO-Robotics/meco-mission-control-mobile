import test from "node:test";
import assert from "node:assert/strict";
import { dependencyAuditCommand, verifyDependencyAudit } from "./verify-dependencies.mjs";

const exception = { id: "GHSA-vfj7-8cjw-p6xm", package: "braces", version: "3.0.3", severity: "high", expires: "2026-11-10", reason: "Verified build-only dependency" };
const lock = { packages: { "node_modules/braces": { version: "3.0.3" } } };
const advisory = { name: "braces", severity: "high", url: `https://github.com/advisories/${exception.id}` };
const report = { auditReportVersion: 2, metadata: { vulnerabilities: { high: 2, critical: 0, info: 0, low: 0, moderate: 0, total: 2 } }, vulnerabilities: { braces: { severity: "high", via: [advisory] }, parent: { severity: "high", via: ["braces"] } } };
const now = new Date("2026-10-10T00:00:00Z");
test("exact build-tool advisory and propagated parents are accepted", () => assert.equal(verifyDependencyAudit(report, lock, [exception], now), 1));
test("another advisory for the same package fails closed", () => assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: { braces: { severity: "high", via: [{ ...advisory, url: "https://github.com/advisories/GHSA-new-risk-here" }] } } }, lock, [exception], now), /Unaccepted/));
test("expired exception fails even after advisory disappears", () => assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: {} }, lock, [exception], new Date("2026-11-10T00:00:00Z")), /expired/));
test("pinned package version drift fails", () => assert.throws(() => verifyDependencyAudit(report, { packages: { "node_modules/braces": { version: "3.0.4" } } }, [exception], now), /version drift/));
test("audit errors or missing evidence fail", () => {
  assert.throws(() => verifyDependencyAudit({ error: { code: "network" } }, lock, [exception], now), /complete report/);
  assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: { parent: { severity: "critical", via: ["missing"] } } }, lock, [exception], now), /Missing advisory/);
});
test("invalid calendar expiry cannot create an indefinite exception", () => {
  for (const expires of ["2026-99-99", "2026-02-30"]) assert.throws(() => verifyDependencyAudit(report, lock, [{ ...exception, expires }], now), /expired/);
});
test("forged advisory URL and severity escalation fail", () => {
  for (const source of [{ ...advisory, url: `https://attacker.test/${exception.id}` }, { ...advisory, severity: "critical" }]) assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: { braces: { severity: "high", via: [source] } } }, lock, [exception], now), /Unaccepted/);
});
test("cyclic and malformed evidence cannot stand in for an accepted advisory", () => {
  assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: { parent: { severity: "high", via: ["parent"] } } }, lock, [exception], now), /Cyclic/);
  for (const source of [null, {}, { ...advisory, name: null }, { ...advisory, severity: null }]) assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: { braces: { severity: "high", via: [source] } } }, lock, [exception], now), /Malformed/);
});
test("incomplete severity counts and duplicate exceptions fail", () => {
  assert.throws(() => verifyDependencyAudit({ ...report, metadata: { vulnerabilities: {} } }, lock, [exception], now), /complete severity/);
  assert.throws(() => verifyDependencyAudit(report, lock, [exception, exception], now), /Duplicate/);
  assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: {} }, lock, [exception], now), /do not match/);
});
test("aggregate escalation, severity with only lower leaves and array reports fail", () => {
  const inconsistent = (severity, source) => ({ ...report, vulnerabilities: { braces: { severity, via: [source] } } });
  assert.throws(() => verifyDependencyAudit(inconsistent("critical", advisory), lock, [exception], now), /inconsistent advisory severity/);
  assert.throws(() => verifyDependencyAudit(inconsistent("high", { ...advisory, severity: "low", url: "https://github.com/advisories/GHSA-new-risk-here" }), lock, [exception], now), /inconsistent advisory severity/);
  assert.throws(() => verifyDependencyAudit({ ...report, vulnerabilities: [] }, lock, [exception], now), /complete report/);
});
test("npm-run launches the JavaScript CLI on Windows and direct invocation uses a fixed cmd command", () => {
  assert.deepEqual(dependencyAuditCommand("win32", "C:\\npm\\npm-cli.js", "C:\\node.exe"), ["C:\\node.exe", ["C:\\npm\\npm-cli.js", "audit", "--omit=dev", "--json"]]);
  assert.deepEqual(dependencyAuditCommand("win32", null), ["cmd.exe", ["/d", "/s", "/c", "npm audit --omit=dev --json"]]);
});
test("aggregate downgrade cannot hide an unknown critical source", () => {
  const downgraded = { ...report, metadata: { vulnerabilities: { high: 0, critical: 0, info: 0, low: 1, moderate: 0, total: 1 } }, vulnerabilities: { braces: { severity: "low", via: [{ ...advisory, severity: "critical", url: "https://github.com/advisories/GHSA-new-risk-here" }] } } };
  assert.throws(() => verifyDependencyAudit(downgraded, lock, [exception], now), /Unaccepted/);
});
