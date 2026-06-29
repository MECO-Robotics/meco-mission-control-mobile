param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ModeArgs
)

$ErrorActionPreference = "Stop"

$Mode = if ($ModeArgs.Count -gt 0) { $ModeArgs[0] } else { "start" }
$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location $RootDir

function Add-SessionPathEntry {
  param([string]$PathEntry)

  if (-not $PathEntry -or -not (Test-Path $PathEntry)) {
    return
  }

  $entries = $env:Path -split ";" | Where-Object { $_ }
  if ($entries -notcontains $PathEntry) {
    $env:Path = "$PathEntry;$env:Path"
  }
}

function Set-DefaultEnvValue {
  param(
    [string]$Name,
    [string]$Value
  )

  $currentValue = [Environment]::GetEnvironmentVariable($Name, "Process")
  if (-not [string]::IsNullOrWhiteSpace($currentValue)) {
    return
  }

  [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
}

function Use-AndroidSdk {
  $sdk = $env:ANDROID_HOME
  if (-not $sdk -or -not (Test-Path $sdk)) {
    $candidate = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $candidate) {
      $sdk = $candidate
      $env:ANDROID_HOME = $sdk
      $env:ANDROID_SDK_ROOT = $sdk
    }
  }

  if ($sdk -and (Test-Path $sdk)) {
    Add-SessionPathEntry (Join-Path $sdk "emulator")
    Add-SessionPathEntry (Join-Path $sdk "platform-tools")
    Add-SessionPathEntry (Join-Path $sdk "cmdline-tools\latest\bin")
  }
}

function Get-AndroidDevices {
  if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    return @()
  }

  $devices = & adb devices
  return @($devices | Where-Object { $_ -match "\sdevice$" })
}

function Get-AndroidAvdName {
  if ($env:ANDROID_AVD_NAME) {
    return $env:ANDROID_AVD_NAME
  }

  if (Get-Command emulator -ErrorAction SilentlyContinue) {
    $avds = @(& emulator -list-avds 2>$null | Where-Object { $_ })
    if ($avds.Count -gt 0) {
      return $avds[0]
    }
  }

  return "Medium_Phone_API_36.0"
}

function Start-AndroidEmulatorIfNeeded {
  if ((Get-AndroidDevices).Count -gt 0) {
    return
  }

  if (-not (Get-Command emulator -ErrorAction SilentlyContinue)) {
    throw "Android emulator was not found on PATH. Confirm Android Studio is installed and ANDROID_HOME points to the SDK."
  }

  $avdName = Get-AndroidAvdName
  Write-Host "Starting Android emulator: $avdName"
  Start-Process -FilePath "emulator" -ArgumentList @("-avd", $avdName) -WindowStyle Normal | Out-Null

  $deadline = (Get-Date).AddMinutes(4)
  do {
    Start-Sleep -Seconds 5
    if ((Get-AndroidDevices).Count -gt 0) {
      $bootCompleted = (& adb shell getprop sys.boot_completed 2>$null | Select-Object -First 1).Trim()
      if ($bootCompleted -eq "1") {
        return
      }
    }
  } while ((Get-Date) -lt $deadline)

  throw "Android emulator did not finish booting before the timeout."
}

function Stop-ExpoGoIfRunning {
  if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    return
  }

  & adb shell am force-stop host.exp.exponent 2>$null | Out-Null
}

function Show-Usage {
  @"
usage: powershell -ExecutionPolicy Bypass -File ./script/build_and_run.ps1 [mode]

Modes:
  start, run        Start the Expo dev server
  --android, android
                    Start Expo and open Android
  --ios, ios        Start Expo and open iOS
  --web, web        Start Expo for web
  --dev-client, dev-client
                    Start Expo in development-client mode
  --tunnel, tunnel  Start Expo using tunnel transport
  --export-web, export-web
                    Export the web build locally
  --doctor, doctor  Run Expo diagnostics
  --help, help      Show this help
"@
}

function Resolve-ExpoCommand {
  if ($env:EXPO_CLI) {
    return $env:EXPO_CLI -split " "
  }

  $localExpo = Join-Path $RootDir "node_modules\expo\bin\cli"
  if (Test-Path $localExpo) {
    return @("node", $localExpo)
  }

  if ((Test-Path "pnpm-lock.yaml") -and (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    return @("pnpm", "exec", "expo")
  }

  if ((Test-Path "yarn.lock") -and (Get-Command yarn -ErrorAction SilentlyContinue)) {
    return @("yarn", "expo")
  }

  if (((Test-Path "bun.lock") -or (Test-Path "bun.lockb")) -and (Get-Command bun -ErrorAction SilentlyContinue)) {
    return @("bunx", "expo")
  }

  if (Get-Command npx.cmd -ErrorAction SilentlyContinue) {
    return @("npx.cmd", "expo")
  }

  return @("npx", "expo")
}

function Invoke-Expo {
  param([string[]]$ExpoArgs)

  $commandParts = Resolve-ExpoCommand
  $exe = $commandParts[0]
  $runnerArgs = @()
  if ($commandParts.Count -gt 1) {
    $runnerArgs = $commandParts[1..($commandParts.Count - 1)]
  }

  & $exe @runnerArgs @ExpoArgs
  exit $LASTEXITCODE
}

function Invoke-ExpoDoctor {
  if ((Test-Path "pnpm-lock.yaml") -and (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    & pnpm exec expo-doctor
    exit $LASTEXITCODE
  }

  if ((Test-Path "yarn.lock") -and (Get-Command yarn -ErrorAction SilentlyContinue)) {
    & yarn expo-doctor
    exit $LASTEXITCODE
  }

  if (((Test-Path "bun.lock") -or (Test-Path "bun.lockb")) -and (Get-Command bun -ErrorAction SilentlyContinue)) {
    & bunx expo-doctor
    exit $LASTEXITCODE
  }

  if (Get-Command npx.cmd -ErrorAction SilentlyContinue) {
    & npx.cmd expo-doctor
    exit $LASTEXITCODE
  }

  & npx expo-doctor
  exit $LASTEXITCODE
}

Use-AndroidSdk

switch ($Mode) {
  { $_ -in @("start", "run") } {
    Invoke-Expo @("start")
  }
  { $_ -in @("--android", "android") } {
    Start-AndroidEmulatorIfNeeded
    Stop-ExpoGoIfRunning
    Set-DefaultEnvValue "REACT_NATIVE_PACKAGER_HOSTNAME" "10.0.2.2"
    Set-DefaultEnvValue "EXPO_PUBLIC_ANDROID_API_BASE_URL" "http://10.0.2.2:8080"
    if (Get-Command adb -ErrorAction SilentlyContinue) {
      & adb reverse tcp:8081 tcp:8081 | Out-Null
    }
    Invoke-Expo @("start", "--android", "--lan")
  }
  { $_ -in @("--ios", "ios") } {
    Set-DefaultEnvValue "EXPO_PUBLIC_IOS_API_BASE_URL" "http://localhost:8080"
    Invoke-Expo @("start", "--ios")
  }
  { $_ -in @("--web", "web") } {
    Invoke-Expo @("start", "--web")
  }
  { $_ -in @("--dev-client", "dev-client") } {
    Invoke-Expo @("start", "--dev-client")
  }
  { $_ -in @("--tunnel", "tunnel") } {
    Invoke-Expo @("start", "--tunnel")
  }
  { $_ -in @("--export-web", "export-web") } {
    Invoke-Expo @("export", "--platform", "web")
  }
  { $_ -in @("--doctor", "doctor") } {
    Invoke-ExpoDoctor
  }
  { $_ -in @("--help", "help") } {
    Show-Usage
  }
  default {
    Show-Usage | Write-Error
    exit 2
  }
}
