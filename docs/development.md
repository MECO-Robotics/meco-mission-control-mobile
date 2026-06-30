# Development Guide

## Prerequisites

- Node 22 LTS is recommended. `package.json` allows Node `>=20 <24`.
- npm is used with the committed `package-lock.json`.
- Expo CLI is used through package scripts.
- iOS simulator requires macOS/Xcode. On newer Xcode/macOS releases, the device
  UI may be Device Hub instead of Simulator.
- Android emulator requires Android Studio or a compatible emulator setup.

## Install

```bash
nvm use
npm install
```

The `postinstall` script runs `scripts/patch-freeport-async.js` and
`scripts/patch-expo-device-hub.js`. Each patch logs whether it was applied,
already applied, or skipped; the iOS Device Hub patch skips automatically on
non-macOS platforms.

## Common Commands

```bash
npm run start
npm run ios
npm run android
npm run dev
npm run lint
npm run typecheck
npm run sim:reset
```

Command notes:

- `npm run start`: starts Expo.
- `npm run ios`: resets the iOS simulator first, then starts Expo on localhost port 8081.
- `npm run android`: runs `script/build_and_run.sh --android`.
- `npm run dev`: Android-focused alias for the same build/run script.
- `npm run lint`: runs ESLint.
- `npm run typecheck`: runs TypeScript with `--noEmit`.
- `npm run sim:reset`: runs `scripts/reset-ios-sim.js`.

Set `SIMULATOR_APP_NAME` if your local Xcode release uses a different device UI
app name.

Do not run Expo or npm scripts with `sudo`.

If ownership gets damaged:

```bash
sudo chown -R "$USER":staff .expo node_modules
```

## Environment Variables

Backend:

```text
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_DEV_AUTH_BYPASS=true
```

`EXPO_PUBLIC_DEV_AUTH_BYPASS=true` exposes a development-only local sign-in
bypass for backend-offline simulator work.

Do not place bearer tokens or service credentials in `EXPO_PUBLIC_` variables;
they are embedded in the Expo bundle. Use normal sign-in or the backend-issued
development bypass endpoint when a local session token is needed.

Android emulator local backend:

```text
EXPO_PUBLIC_ANDROID_API_BASE_URL=http://10.0.2.2:8080
```

Production release secret:

```text
EXPO_TOKEN=<expo-token>
```

## Windows Android Helper

The repo includes `script/build_and_run.ps1` for Windows Android simulator workflows:

```powershell
powershell -ExecutionPolicy Bypass -File ./script/build_and_run.ps1 --android
```

The helper keeps `adb reverse tcp:8081 tcp:8081` refreshed and sets
`EXPO_PUBLIC_ANDROID_API_BASE_URL=http://10.0.2.2:8080` by default for
emulator-to-host backend access.

## Adding Code

Follow `AGENTS.md` structural rules:

- Keep implementation files under 300 counted implementation lines.
- Refactor above 220 counted implementation lines.
- Keep direct directory size under 20 files.
- Split screens/components/hooks/utilities by responsibility.
- Keep styles scoped to a component or feature.

For this app's current architecture, prefer adding feature rendering inside the relevant `src/screens/<feature>/` folder, app-shell components inside `src/app/`, shared controls inside `src/ui/`, domain types inside `src/types/domain.ts`, API helpers inside `src/data/`, and device services inside `src/services/`.
