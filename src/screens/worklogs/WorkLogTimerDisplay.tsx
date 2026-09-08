import { useEffect, useState } from "react";
import { Text } from "../../i18n";
import { formatTimerElapsed, getWorkLogTimerElapsedMs, type WorkLogTimerState } from "./workLogTimer";

export function WorkLogTimerDisplay({ timer }: { timer: WorkLogTimerState | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer || timer.isPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer]);
  return <Text>{formatTimerElapsed(getWorkLogTimerElapsedMs(timer, now))}</Text>;
}
