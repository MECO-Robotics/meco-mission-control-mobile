#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-start}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

show_usage() {
  cat <<'USAGE'
usage: ./script/build_and_run.sh [mode]

Modes:
  start, run        Start the Expo dev server
  --ios, ios        Start Expo and open iOS
  --android, android
                   Start Expo and open Android
  --web, web        Start Expo for web
  --dev-client, dev-client
                   Start Expo in development-client mode
  --tunnel, tunnel Start Expo using tunnel transport
  --export-web, export-web
                   Export the web build locally
  --doctor, doctor Run Expo diagnostics
  --help, help     Show this help
USAGE
}

add_path_entry() {
  local path_entry="$1"
  if [[ -d "$path_entry" && ":$PATH:" != *":$path_entry:"* ]]; then
    export PATH="$path_entry:$PATH"
  fi
}

use_android_sdk() {
  local sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"

  if [[ -z "$sdk" && -n "${LOCALAPPDATA:-}" ]]; then
    local sdk_win="${LOCALAPPDATA}\\Android\\Sdk"
    if command -v cygpath >/dev/null 2>&1; then
      sdk="$(cygpath "$sdk_win")"
    else
      sdk="$sdk_win"
    fi
  fi

  if [[ -z "$sdk" && -d "$HOME/Library/Android/sdk" ]]; then
    sdk="$HOME/Library/Android/sdk"
  fi

  if [[ -n "$sdk" && -d "$sdk" ]]; then
    export ANDROID_HOME="$sdk"
    export ANDROID_SDK_ROOT="$sdk"
    add_path_entry "$sdk/emulator"
    add_path_entry "$sdk/platform-tools"
    add_path_entry "$sdk/cmdline-tools/latest/bin"
  fi
}

get_android_devices() {
  if ! command -v adb >/dev/null 2>&1; then
    return 0
  fi

  adb devices | awk '/device$/ { print $1 }'
}

get_android_avd_name() {
  if [[ -n "${ANDROID_AVD_NAME:-}" ]]; then
    printf '%s\n' "$ANDROID_AVD_NAME"
    return
  fi

  if command -v emulator >/dev/null 2>&1; then
    local avd
    avd="$(emulator -list-avds 2>/dev/null | sed -n '1p')"
    if [[ -n "$avd" ]]; then
      printf '%s\n' "$avd"
      return
    fi
  fi

  printf '%s\n' "Medium_Phone_API_36.0"
}

start_android_emulator_if_needed() {
  if [[ -n "$(get_android_devices)" ]]; then
    return
  fi

  if ! command -v emulator >/dev/null 2>&1; then
    echo "Android emulator was not found on PATH. Confirm Android Studio is installed and ANDROID_HOME points to the SDK." >&2
    exit 1
  fi

  local avd_name
  avd_name="$(get_android_avd_name)"
  echo "Starting Android emulator: $avd_name"
  emulator -avd "$avd_name" >/dev/null 2>&1 &

  local deadline=$((SECONDS + 240))
  while (( SECONDS < deadline )); do
    sleep 5
    if [[ -n "$(get_android_devices)" ]]; then
      if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
        return
      fi
    fi
  done

  echo "Android emulator did not finish booting before the timeout." >&2
  exit 1
}

stop_expo_go_if_running() {
  if command -v adb >/dev/null 2>&1; then
    adb shell am force-stop host.exp.exponent >/dev/null 2>&1 || true
  fi
}

resolve_expo_cmd() {
  if [[ -n "${EXPO_CLI:-}" ]]; then
    # Optional escape hatch for projects that need a wrapper command.
    # shellcheck disable=SC2206
    EXPO_CMD=(${EXPO_CLI})
    return
  fi

  if [[ -f node_modules/expo/bin/cli ]]; then
    EXPO_CMD=(node node_modules/expo/bin/cli)
  elif [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then
    EXPO_CMD=(pnpm exec expo)
  elif [[ -f yarn.lock ]] && command -v yarn >/dev/null 2>&1; then
    EXPO_CMD=(yarn expo)
  elif { [[ -f bun.lock ]] || [[ -f bun.lockb ]]; } && command -v bun >/dev/null 2>&1; then
    EXPO_CMD=(bunx expo)
  else
    EXPO_CMD=(npx expo)
  fi
}

run_doctor() {
  if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null 2>&1; then
    pnpm exec expo-doctor
  elif [[ -f yarn.lock ]] && command -v yarn >/dev/null 2>&1; then
    yarn expo-doctor
  elif { [[ -f bun.lock ]] || [[ -f bun.lockb ]]; } && command -v bun >/dev/null 2>&1; then
    bunx expo-doctor
  else
    npx expo-doctor
  fi
}

use_android_sdk
resolve_expo_cmd

case "$MODE" in
  start|run)
    exec "${EXPO_CMD[@]}" start
    ;;
  --ios|ios)
    exec "${EXPO_CMD[@]}" start --ios
    ;;
  --android|android)
    start_android_emulator_if_needed
    stop_expo_go_if_running
    export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-10.0.2.2}"
    export EXPO_PUBLIC_ANDROID_API_BASE_URL="${EXPO_PUBLIC_ANDROID_API_BASE_URL:-http://10.0.2.2:8080}"
    if command -v adb >/dev/null 2>&1; then
      adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
    fi
    exec "${EXPO_CMD[@]}" start --android --lan
    ;;
  --web|web)
    exec "${EXPO_CMD[@]}" start --web
    ;;
  --dev-client|dev-client)
    exec "${EXPO_CMD[@]}" start --dev-client
    ;;
  --tunnel|tunnel)
    exec "${EXPO_CMD[@]}" start --tunnel
    ;;
  --export-web|export-web)
    exec "${EXPO_CMD[@]}" export --platform web
    ;;
  --doctor|doctor)
    run_doctor
    ;;
  --help|help)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
