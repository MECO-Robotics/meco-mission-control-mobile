import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function dependencyAuditCommand(platform = process.platform, npmPath = process.env.npm_execpath, nodePath = process.execPath) {
  const args = ["audit", "--omit=dev", "--json"];
  if (npmPath) return [nodePath, [npmPath, ...args]];
  return platform === "win32" ? ["cmd.exe", ["/d", "/s", "/c", "npm audit --omit=dev --json"]] : ["npm", args];
}

export function verifyDependencyAudit(report, lock, exceptions, now = new Date()) {
  if (report?.error || report?.auditReportVersion !== 2 || !report.metadata?.vulnerabilities ||
      !report.vulnerabilities || typeof report.vulnerabilities !== "object" || Array.isArray(report.vulnerabilities)) {
    throw new Error("Dependency audit did not return a complete report.");
  }
  const levels = ["info", "low", "moderate", "high", "critical"];
  const counts = report.metadata.vulnerabilities;
  if (![...levels, "total"].every((level) => Number.isInteger(counts[level]) && counts[level] >= 0) ||
      levels.reduce((sum, level) => sum + counts[level], 0) !== counts.total) {
    throw new Error("Dependency audit did not return complete severity counts.");
  }
  const accepted = new Map();
  for (const entry of exceptions) {
    const expiry = Date.parse(`${entry.expires}T00:00:00Z`);
    if (!/^GHSA-[\w-]+$/.test(entry.id) || !entry.package || !entry.version || !entry.reason ||
        !["high", "critical"].includes(entry.severity) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires) ||
        !Number.isFinite(expiry) || new Date(expiry).toISOString().slice(0, 10) !== entry.expires || expiry <= now.getTime()) {
      throw new Error(`Invalid or expired dependency exception: ${entry.id}`);
    }
    if (accepted.has(entry.id)) throw new Error(`Duplicate dependency exception: ${entry.id}`);
    accepted.set(entry.id, entry);
    const packages = Object.entries(lock.packages ?? {}).filter(([path]) => path.endsWith(`/node_modules/${entry.package}`) || path === `node_modules/${entry.package}`);
    if (!packages.length || packages.some(([, pkg]) => pkg.version !== entry.version)) {
      throw new Error(`Dependency exception version drift: ${entry.package}`);
    }
  }
  const inspect = (name, ancestors = new Set()) => {
    if (ancestors.has(name)) return -1;
    const stack = new Set(ancestors).add(name);
    const vulnerability = report.vulnerabilities[name];
    if (!vulnerability || !Array.isArray(vulnerability.via) || !vulnerability.via.length) {
      throw new Error(`Missing advisory evidence for ${name}`);
    }
    let maxSeverity = -1;
    for (const source of vulnerability.via) {
      if (typeof source === "string") { maxSeverity = Math.max(inspect(source, stack), maxSeverity); continue; }
      if (!source || typeof source !== "object" || typeof source.name !== "string" ||
          !["info", "low", "moderate", "high", "critical"].includes(source.severity)) {
        throw new Error(`Malformed advisory evidence for ${name}`);
      }
      maxSeverity = Math.max(maxSeverity, levels.indexOf(source.severity));
      if (!["high", "critical"].includes(source.severity)) continue;
      const id = typeof source.url === "string" ? /^https:\/\/github\.com\/advisories\/(GHSA-[\w-]+)$/.exec(source.url)?.[1] : null;
      const exception = accepted.get(id);
      if (!exception || exception.package !== source.name || exception.package !== name || source.severity !== exception.severity) {
        throw new Error(`Unaccepted dependency advisory: ${id ?? name}`);
      }
    }
    return maxSeverity;
  };
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!vulnerability || !levels.includes(vulnerability.severity)) throw new Error(`Malformed vulnerability evidence for ${name}`);
    if (inspect(name) !== levels.indexOf(vulnerability.severity)) {
      throw new Error(`Cyclic or inconsistent advisory severity evidence for ${name}`);
    }
  }
  for (const level of levels) {
    if (Object.values(report.vulnerabilities).filter((item) => item.severity === level).length !== counts[level]) {
      throw new Error("Dependency audit severity counts do not match findings.");
    }
  }
  return accepted.size;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, args] = dependencyAuditCommand();
    const result = spawnSync(command, args, { encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
    if (result.error || ![0, 1].includes(result.status)) throw new Error("Dependency audit command failed.");
    const count = verifyDependencyAudit(JSON.parse(result.stdout), JSON.parse(readFileSync("package-lock.json", "utf8")), JSON.parse(readFileSync(new URL("./dependency-exceptions.json", import.meta.url), "utf8")));
    console.log(`Dependency audit passed with ${count} exact, expiring build-tool exceptions.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
