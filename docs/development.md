# Development Guide

## Prerequisites

- Node 22.13 or newer Node 22 is required by Expo SDK 57 and `package.json`.
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

Expo SDK 57 no longer needs the repository's former `freeport-async` or Expo
Device Hub installation patches, so dependency installation does not execute
repository postinstall scripts.

## Common Commands

```bash
npm run start
npm run ios
npm run android
npm run dev
npm run lint
npm run test:workflow-security
npm run typecheck
npm run sim:reset
```

Command notes:

- `npm run start`: starts Expo.
- `npm run ios`: resets the iOS simulator first, then starts Expo on localhost port 8081.
- `npm run android`: invokes the installed Expo CLI through `scripts/start-android.js` on every host.
- `npm run dev`: delegates to `npm run android`; additional Expo arguments are forwarded.
- `npm run lint`: runs ESLint.
- `npm run test:workflow-security`: verifies secretless PR jobs, trusted release sources, immutable Action pins, and release credential scoping.
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

Production environment secrets:

```text
EXPO_TOKEN=<expo-token>
EXPO_PUBLIC_API_BASE_URL=https://mission-control-api.example
```

Store these values in the protected GitHub `production` environment, not in a
developer `.env` file or a pull-request workflow.

## Android Launching

Run `npm run android` on Windows, macOS, or Linux. Node launches the installed
Expo CLI; Expo handles SDK/device discovery, emulator boot, and Metro forwarding.
Set `ANDROID_HOME` for a nonstandard SDK location, or start a selected emulator
in Android Studio before launching Expo.

The API URL defaults to `http://10.0.2.2:8080`; an explicit Android URL takes
precedence over a shared API URL, and both take precedence over the default.
For physical devices, configure a reachable API URL. Additional Expo arguments
work with `npm run android -- --clear` or `npm run dev -- --clear`.

Use `npm start -- --web`, `npm start -- --dev-client`, `npm start -- --tunnel`,
`npx expo export --platform web`, or `npx expo-doctor` for other modes. The
Bash/PowerShell launch scripts and their custom environment switches are removed.

## Adding Code

Follow `AGENTS.md` structural rules:

- Keep implementation files under 300 counted implementation lines.
- Refactor above 220 counted implementation lines.
- Keep direct directory size under 20 files.
- Split screens/components/hooks/utilities by responsibility.
- Keep styles scoped to a component or feature.

For this app's current architecture, prefer adding feature rendering inside the relevant `src/screens/<feature>/` folder, app-shell components inside `src/app/`, shared controls inside `src/ui/`, domain types inside `src/types/domain.ts`, API helpers inside `src/data/`, and device services inside `src/services/`.
