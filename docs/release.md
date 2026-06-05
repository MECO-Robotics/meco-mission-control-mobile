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

## EAS Build Configuration

`eas.json` defines a `production` profile:

```json
{
  "cli": {
    "version": ">= 16.22.0"
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

Production builds need:

- `EXPO_TOKEN`
- `EXPO_PUBLIC_API_BASE_URL`
- `expo.ios.bundleIdentifier` in `app.json`
- `expo.android.package` in `app.json`

Current bundle/package ID:

```text
org.mecorobotics.missioncontrol
```

## Release Safety

- Validate sanitized production-like snapshots before merge.
- Enforce stricter cross-repo validation before `main` merges.
- Treat staging branches as frozen candidate snapshots, not places for new feature work.
- Publish mobile releases only from `main`, `release-*` tags, or a release manifest.
- Mobile release target is GitHub Releases/EAS builds.
- Do not target the production VPS for mobile releases.
- Do not introduce a permanent live staging environment; staging is a branch snapshot concept only.

## App Configuration Notes

The app supports iOS and Android, automatic user interface style, Expo new architecture, localization, notifications, screen orientation, and web browser auth session completion.

The app orientation is `default`, but iOS declares portrait and landscape orientations. The UI includes portrait and landscape-specific layout behavior for timeline views.

