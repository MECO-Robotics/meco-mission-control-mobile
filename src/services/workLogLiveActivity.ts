export type WorkLogTimerActivityState = {
  elapsedMs: number;
  isPaused: boolean;
  startedAt: number | null;
};

export type WorkLogTimerActivityResult = {
  isNativeLiveActivityAvailable: boolean;
};

const unavailableResult: WorkLogTimerActivityResult = {
  isNativeLiveActivityAvailable: false,
};

export async function startWorkLogLiveActivity(
  _state: WorkLogTimerActivityState,
): Promise<WorkLogTimerActivityResult> {
  return unavailableResult;
}

export async function updateWorkLogLiveActivity(
  _state: WorkLogTimerActivityState,
): Promise<WorkLogTimerActivityResult> {
  return unavailableResult;
}

export async function endWorkLogLiveActivity(): Promise<void> {
  return;
}
