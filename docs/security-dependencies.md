# Dependency security ownership

`npm run verify:dependencies` owns npm dependency audit enforcement in full
verification, the pre-commit hook and the Aislop CI workflow. Aislop retains its
source and secret security checks; `security.audit: false` disables its duplicate
npm audit only. No rule or file baseline suppresses security findings.

The gate runs `npm audit --omit=dev --json` and rejects all high/critical advisory
sources except the exact entries in `scripts/dependency-exceptions.json`. It
fails on malformed/audit-error responses, missing source evidence, package
version drift and expiry. Propagated parent findings must resolve to the same
accepted advisory sources. Replacing an advisory ID for an unchanged package
still fails. The existing Node test layer checks those rejection cases.

## Temporary build-tool exceptions

Both exceptions expire at **2026-11-10 00:00 UTC**. They describe accepted build
workstation exposure; they do not claim the packages are fixed. Remove the
exception and use a verified patched version when upstream ships one.

| Advisory | Pinned package | Affected range | Reachability |
| --- | --- | --- | --- |
| GHSA-vfj7-8cjw-p6xm | braces 3.0.3 | <=3.0.3 | micromatch in Metro/Jest build-time pattern matching; avoid running builds on untrusted trees or attacker-supplied glob patterns. |
| GHSA-86w9-cpqp-85rv | node-forge 1.4.0 | <=1.4.0 | Expo CLI certificate utilities and local iOS signing; use trusted signing certificates and keys. |

On 2026-10-10 the npm registry reported those pinned versions as the latest
releases. npm audit's suggested Jest major migration retains Expo's Metro
pattern-matching path; its suggested Expo 44 downgrade retains node-forge and
breaks the current SDK. Neither is a valid remediation.

Actual Android and iOS production JavaScript exports with source maps contained
no `braces`, `micromatch` or `node-forge` source modules. The Expo CLI
`metro-require/require.js` runtime loader is present, but the certificate utilities
and Metro build machinery are absent. The application does not import these
packages. These artifacts establish the shipped-runtime boundary; physical
native devices and remote EAS builds were not exercised.

Review evidence is stored under
`/mnt/zfs-storage/All Drives/Brian Data/mission-control-cache/patch-all-20261010/`:
`mobile-audit-after.json`, `mobile-explain-braces.json`,
`mobile-explain-forge.json`, `mobile-export-sourcemaps/`, and
`mobile-aislop.json`. The original advisories remain in that audit evidence.

Patched compatible shell-quote 1.12.0 and brace-expansion 1.1.21 replace affected
versions. image-size 2.0.4 is explicitly overridden: Metro consumes its preserved
CommonJS default buffer-to-dimensions function, verified by image asset
production exports. React Native 0.86.3 matches Jest Expo's 0.86.3 preset peer,
with a clean lockfile install check; no peer-conflict bypass is used.

`--omit=dev` covers npm's production-classified dependency tree, including
build tools distributed under Expo's production dependency edges. It does not
prove the full development dependency tree has no advisories. The separate full
`npm audit --json` report currently contains 46 high entries propagated from the
two unpatched advisory sources and no critical entries; these remain recorded.

Reproduce the review from a clean checkout:

```sh
npm ci
npm audit --json > full-audit.json
npm run verify:dependencies
npx expo export --platform android --platform ios --source-maps --no-bytecode --output-dir /path/on/HDD/mobile-export
```

Inspect the `sources` arrays in both exported `.js.map` files to verify the
runtime exclusion. CI and the pre-commit hook do not rely on a saved audit report:
they fetch and validate the current report on every run. The audited signing and
pattern-matching exposure remains a build-environment concern until upstream
patches are available.
