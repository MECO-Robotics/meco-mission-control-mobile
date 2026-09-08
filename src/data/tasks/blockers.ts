import type { TaskBlocker } from "../../types/domain";

export const taskBlockers: TaskBlocker[] = [
  {"id": "intake-guard-blocker-0", "blockedTaskId": "intake-guard", "description": "Waiting on CNC batch B-17 to clear the router.", "status": "open"},
  {"id": "chain-tension-window-blocker-0", "blockedTaskId": "chain-tension-window", "description": "Needs final roller spacing before tension marks are meaningful.", "status": "open"},
  {"id": "intake-state-machine-blocker-0", "blockedTaskId": "intake-state-machine", "description": "Needs electrical current limit validation first.", "status": "open"},
  {"id": "wire-auto-safety-blocker-0", "blockedTaskId": "wire-auto-safety", "description": "Needs final drive calibration report before review.", "status": "open"},
  {"id": "spare-harness-kit-blocker-0", "blockedTaskId": "spare-harness-kit", "description": "Waiting for ferrule kit delivery.", "status": "open"},
  {"id": "scrimmage-spares-loadout-blocker-0", "blockedTaskId": "scrimmage-spares-loadout", "description": "Host team has not confirmed pit power layout or spare-table footprint.", "status": "open"},
  {"id": "auto-replay-suite-blocker-0", "blockedTaskId": "auto-replay-suite", "description": "Driver station image is waiting on firmware and DS log tooling updates.", "status": "open"},
  {"id": "driver-station-image-refresh-blocker-0", "blockedTaskId": "driver-station-image-refresh", "description": "Awaiting final CTRE and REV tool versions for the offseason laptop image.", "status": "open"},
];
