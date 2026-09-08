# Contributing

Follow the [shared Mission Control contribution workflow](https://github.com/MECO-Robotics/mission-control-skills/blob/main/CONTRIBUTING.md) for review criteria and cross-repository changes. This document covers mobile-specific commands and release constraints.

## Setup and local development

Use the Node version in `.nvmrc` (22.13.0) and npm with the committed lockfile:

```bash
nvm use
npm ci
npm start
```

Use `npm run android` for an Android emulator; iOS requires macOS/Xcode and `npm run ios`. Expo owns simulator startup and reports port conflicts; startup never terminates another process. See [development](docs/development.md) for device setup and environment overrides. Configure a reachable API for physical devices; never put secrets in Expo public variables.

## Changes and validation

Keep state and commands with their feature owner, share only demonstrated common behavior, and avoid pass-through modules. Colocate styles where that clarifies ownership. Preserve the existing formatting in touched code; ESLint is the configured lint tool, with no new formatter required.

```bash
npm run verify
```

This owns ESLint, Jest (including role permissions and approval controls), workflow security tests, TypeScript and bootstrap contract verification. Run the relevant existing command while iterating; do not rerun its constituent checks after a successful full verification on the same revision. Documentation-only changes need link/command review and `git diff --check`.

For coordinated contract work, set `PLATFORM_BOOTSTRAP_CONTRACT_SOURCE_PATH` to the platform checkout's `contracts/platform/bootstrap/v1/contract.json`. Otherwise verification compares the published platform development contract (with existing main/sibling fallbacks). CI fails when no source is available; local verification reports a skipped remote check. Report that limitation rather than claiming drift was checked.

For changed device behavior, record the tested OS/device and relevant lifecycle, offline or permission scenarios. Include screenshots or recordings when they help assess a UI change; identify platforms not exercised.

## Pull requests and releases

Use dedicated worktrees and `feature/*` or `fix/*` branches from `origin/development`; open PRs into `development`, then promote reviewed changes through a PR to `main`. Existing staging and hotfix routes remain enforced by CI. Do not fix code directly on promotion branches.

Describe the problem, resulting behavior and validation. Add migration, contract, UI or release evidence only when relevant. Preserve required independent reviews, conversation resolution and `merge-requirements`; automation comments are not approvals.

The merge gate owns branch, CI and snapshot checks, plus the cross-repository production gate for main. Releases use protected main or an eligible `release-*` tag and require the GitHub `production` environment approval. See [release guidance](docs/release.md); mobile releases go to EAS/GitHub Releases.

## Optional shared skills

The ignored `skills/` directory is an optional local import, not an application dependency. Import explicitly with `bash scripts/sync-skills.sh`; compare an existing import with `bash scripts/check-skills-current.sh`. `SKILLS_REPO` and `SKILLS_REF` select the source. CI's separate import smoke check uses `SYNC_MISSING_SKILLS=true`; local comparison defaults to failing on missing imports. No context engine or generated index is required for contributions.

CI renders Expo public configuration after verification and reuses that same-run artifact for snapshot packaging; the snapshot job does not reinstall dependencies.
