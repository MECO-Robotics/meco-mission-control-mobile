const MS_PER_HOUR = 1000 * 60 * 60;

export type WorkLogTimerState = {
  id: string;
  elapsedMs: number;
  isPaused: boolean;
  reminderNotificationIds: string[];
  startedAt: number | null;
};
export function formatTimerElapsed(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}

export function formatHoursFromTimer(elapsedMs: number) {
  const roundedHours = Math.round((elapsedMs / MS_PER_HOUR) * 100) / 100;

  return Number.isInteger(roundedHours)
    ? String(roundedHours)
    : String(roundedHours).replace(/0$/, "");
}

export function getWorkLogTimerElapsedMs(
  timer: WorkLogTimerState | null,
  now = Date.now(),
) {
  if (!timer) {
    return 0;
  }

  return (
    timer.elapsedMs +
    (timer.startedAt && !timer.isPaused
      ? Math.max(0, now - timer.startedAt)
      : 0)
  );
}
