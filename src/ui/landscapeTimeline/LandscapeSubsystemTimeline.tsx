import { useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";

import type { Event, Subsystem, Task } from "../../types/domain";
import type { AppThemeColors } from "../../theme";
import { getAppLocale, localTodayDate } from "../helpers";
import { LandscapeCalendarView } from "./LandscapeCalendarView";
import { LandscapeTimelineBoard } from "./LandscapeTimelineBoard";
import {
  buildLanes,
  expandLanesForViewport,
  getCalendarDays,
  getMonthStartDate,
  getTimelineDays,
  parseDate,
} from "./landscapeTimelineModel";
import {
  LandscapeTimelineHeader,
  type LandscapeTaskViewMode,
} from "./LandscapeTimelineHeader";
import { landscapeTimelineStyles as styles } from "./landscapeTimelineStyles";

type Props = {
  colors: AppThemeColors;
  events: Event[];
  onAddDeadline: () => void;
  onAddTask: () => void;
  onTaskPress: (task: Task) => void;
  subsystems: Subsystem[];
  tasks: Task[];
};

export function LandscapeSubsystemTimeline({
  colors,
  events,
  onAddDeadline,
  onAddTask,
  onTaskPress,
  subsystems,
  tasks,
}: Props) {
  const locale = getAppLocale();
  const todayKey = localTodayDate();
  const today = parseDate(todayKey);
  const [selectedMonthStart, setSelectedMonthStart] = useState(() =>
    getMonthStartDate(today),
  );
  const [viewMode, setViewMode] = useState<LandscapeTaskViewMode>("timeline");
  const { height } = useWindowDimensions();
  const timelineStart = selectedMonthStart;
  const timelineYear = timelineStart.getFullYear();
  const timelineDays = useMemo(() => getTimelineDays(timelineStart), [timelineStart]);
  const calendarDays = useMemo(() => getCalendarDays(timelineStart), [timelineStart]);
  const subsystemsById = useMemo(
    () =>
      Object.fromEntries(
        subsystems.map((subsystem) => [subsystem.id, subsystem]),
      ) as Record<string, Subsystem>,
    [subsystems],
  );
  const laneStart = viewMode === "calendar" ? calendarDays[0] : timelineStart;
  const laneDayCount = viewMode === "calendar" ? calendarDays.length : timelineDays.length;
  const packedLanes = useMemo(
    () => buildLanes(tasks, subsystems, laneStart, laneDayCount),
    [laneDayCount, laneStart, subsystems, tasks],
  );
  const lanes = useMemo(
    () => expandLanesForViewport(packedLanes, height),
    [height, packedLanes],
  );
  const laneHeight = useMemo(
    () => lanes.reduce((sum, lane) => sum + lane.height, 0),
    [lanes],
  );

  return (
    <View style={[styles.shell, { backgroundColor: colors.canvas }]}>
      <LandscapeTimelineHeader
        colors={colors}
        locale={locale}
        onAddDeadline={onAddDeadline}
        onAddTask={onAddTask}
        onSelectMonth={setSelectedMonthStart}
        onSelectViewMode={setViewMode}
        timelineStart={timelineStart}
        timelineYear={timelineYear}
        viewMode={viewMode}
      />
      {viewMode === "timeline" ? (
        <LandscapeTimelineBoard
          colors={colors}
          events={events}
          laneHeight={laneHeight}
          lanes={lanes}
          locale={locale}
          onTaskPress={onTaskPress}
          subsystemsById={subsystemsById}
          timelineDays={timelineDays}
          timelineStart={timelineStart}
          todayKey={todayKey}
        />
      ) : (
        <LandscapeCalendarView
          colors={colors}
          calendarDays={calendarDays}
          events={events}
          lanes={lanes}
          locale={locale}
          onTaskPress={onTaskPress}
          timelineStart={timelineStart}
          todayKey={todayKey}
        />
      )}
    </View>
  );
}
