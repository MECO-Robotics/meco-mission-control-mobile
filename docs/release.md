# Release Guide

## Branch Model

- `main`: production-ready only.
- `staging` or `staging/*`: audited release-candidate snapshots; immutable except for stabilization fixes.
- `development`: integration branch for active work.
- `feature/*`: short-lived feature branches.
- `fix/*`: short-lived bugfix branches.
- `hotfix/*`: emergency production fixes.

## Pull Request Flow

- Merge `feature/*` and `fix/*` into `development` by pull request only.
- Cut `staging` or `staging/*` from the current `development` head when a frozen release-candidate snapshot needs to remain in an open `main` PR while regular development continues separately.
- Merge `fix/*` or `hotfix/*` into `staging` or `staging/*` by pull request only for stabilization fixes.
- Merge `hotfix/*` into `development` or `main` by pull request only.
- Merge into `main` only from `staging`, `staging/*`, `development`, or `hotfix/*` by pull request only.

## Protected Branch Requirements

`development` requires:

- `merge-requirements`
- at least 1 approval

`staging` and `staging/*` require:

- `merge-requirements`
- at least 1 approval

`main` requires:

- `merge-requirements`
- at least 2 approvals

`merge-requirements` is the required aggregate gate for branch model, validation, snapshot, and production-gate checks. Keep conversation resolution, linear history, and admin enforcement enabled on protected branches.

## CI Expectations

The README notes that CI runs `npm run typecheck` on pull requests and `main`. The app also has a local lint command:

```bash
npm run lint
npm run typecheck
```

Run both before opening or updating a release-bound pull request.

The full `npm run verify` command also runs the workflow security regression
suite and checks the public platform contract without repository credentials.

## EAS Build Configuration

`eas.json` defines a `production` profile:

```json
{
  "cli": {
    "version": "21.7.1"
  },
  "build": {
    "production": {
      "environment": "production",
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

Production builds use Expo SDK 57 and need:

- `EXPO_TOKEN`
- `EXPO_PUBLIC_API_BASE_URL`
- `expo.ios.bundleIdentifier` in `app.json`
- `expo.android.package` in `app.json`

Configure `EXPO_TOKEN` and `EXPO_PUBLIC_API_BASE_URL` as secrets on the GitHub
`production` environment. Add required reviewers to that environment. Both the
EAS build and GitHub publication jobs wait for environment approval.

Current bundle/package ID:

```text
org.mecorobotics.missioncontrol
```

## Release Safety

- Validate sanitized production-like snapshots before merge.
- Enforce stricter cross-repo validation before `main` merges.
- Treat staging branches as frozen candidate snapshots, not places for new feature work.
- Publish mobile releases only from protected `main` or a `release-*` source tag whose commit is contained in protected `main`.
- Run manual releases from the `main` workflow and provide the optional `source_tag`; direct tag-push releases and release manifests are not accepted.
- Release tags must match `^release-[A-Za-z0-9._-]+$`, and release names must be a single line of at most 120 characters.
- Keep dependency installation credential-free. `EXPO_TOKEN` is available only to the authenticated EAS steps.
- Keep Action commit pins and EAS CLI `21.7.1` unchanged until an intentional, reviewed upgrade.
- Review both npm audit modes before release. Expo SDK 57 currently inherits
  `image-size@1.2.1` through Metro; the published advisories mark every
  `image-size` version affected and npm's forced fix downgrades Expo, so do not
  apply that incompatible downgrade. Treat any additional advisory as
  release-blocking and remove this exception when Metro publishes a compatible
  fixed dependency.
- Mobile release target is GitHub Releases/EAS builds.
- Do not target the production VPS for mobile releases.
- Do not introduce a permanent live staging environment; staging is a branch snapshot concept only.

## App Configuration Notes

The app supports iOS and Android, automatic user interface style, Expo new architecture, localization, notifications, screen orientation, and web browser auth session completion.

The app orientation is `default`, but iOS declares portrait and landscape orientations. The UI includes portrait and landscape-specific layout behavior for timeline views.
