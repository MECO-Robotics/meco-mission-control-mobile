import { Pressable, ScrollView, View } from "react-native";

import { Text, useTranslation } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import type { Event, Subsystem, Task } from "../../types/domain";
import {
  DAY_WIDTH,
  daysBetween,
  getLaneTaskRange,
  parseDate,
  toDateKey,
  type PackedLane,
} from "./landscapeTimelineModel";
import { landscapeTimelineChartStyles as chartStyles } from "./landscapeTimelineChartStyles";
import { landscapeTimelineSidebarStyles as sidebarStyles } from "./landscapeTimelineSidebarStyles";
import { landscapeTimelineStyles as styles } from "./landscapeTimelineStyles";

type Props = {
  colors: AppThemeColors;
  events: Event[];
  laneHeight: number;
  lanes: PackedLane[];
  locale: string;
  onTaskPress: (task: Task) => void;
  subsystemsById: Record<string, Subsystem>;
  timelineDays: Date[];
  timelineStart: Date;
  todayKey: string;
};

function formatProjectLabel(lane: PackedLane, subsystemsById: Record<string, Subsystem>) {
  const parentSubsystem = lane.subsystem?.parentSubsystemId
    ? subsystemsById[lane.subsystem.parentSubsystemId]
    : null;

  return (
    parentSubsystem?.name ??
    lane.subsystem?.name ??
    lane.subsystem?.projectId ??
    lane.tasks[0]?.task.projectId ??
    "Operations"
  );
}

export function LandscapeTimelineBoard({
  colors,
  events,
  laneHeight,
  lanes,
  locale,
  onTaskPress,
  subsystemsById,
  timelineDays,
  timelineStart,
  todayKey,
}: Props) {
  const { t } = useTranslation();
  const chartWidth = timelineDays.length * DAY_WIDTH;
  const markerEvents = events
    .map((event) => ({
      event,
      dayIndex: daysBetween(timelineStart, parseDate(event.startDateTime)),
    }))
    .filter(({ dayIndex }) => dayIndex >= 0 && dayIndex < timelineDays.length);
  const visibleTaskCount = lanes.reduce((count, lane) => count + lane.tasks.length, 0);

  return (
    <View style={[styles.board, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {visibleTaskCount === 0 && markerEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.subtleText }]}>
            No tasks in {timelineStart.toLocaleDateString(locale, { month: "long", year: "numeric" })}.
          </Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          <View style={[sidebarStyles.sidebar, { borderColor: colors.border }]}>
            <View style={[sidebarStyles.sidebarHeader, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={[sidebarStyles.sidebarHeaderCell, sidebarStyles.projectHeaderCell]}>
                <Text style={[sidebarStyles.sidebarHeaderText, { color: colors.ink }]}>Project</Text>
                <Text style={[sidebarStyles.headerEye, { color: colors.subtleText }]}>o</Text>
              </View>
              <View style={sidebarStyles.sidebarHeaderCell}>
                <Text style={[sidebarStyles.sidebarHeaderText, { color: colors.ink }]}>Subsystem</Text>
                <Text style={[sidebarStyles.headerEye, { color: colors.subtleText }]}>o</Text>
              </View>
            </View>
            {lanes.map((lane) => {
              const completeTasks = lane.tasks.filter(({ task }) => task.status === "complete").length;

              return (
                <View
                  key={lane.id}
                  style={[
                    sidebarStyles.laneLabel,
                    { borderBottomColor: colors.border, borderLeftColor: lane.color, height: lane.height },
                  ]}
                >
                  <View style={[sidebarStyles.projectCell, { borderColor: colors.border, backgroundColor: colors.canvas }]}>
                    <Text style={[sidebarStyles.disclosure, { color: colors.subtleText }]}>v</Text>
                    <Text numberOfLines={1} style={[sidebarStyles.projectLabel, { color: colors.ink }]}>
                      {formatProjectLabel(lane, subsystemsById)}
                    </Text>
                  </View>
                  <View style={sidebarStyles.subsystemCell}>
                    <View style={[sidebarStyles.subsystemDot, { backgroundColor: lane.color }]} />
                    <Text numberOfLines={1} style={[sidebarStyles.lanePrimary, { color: colors.ink }]}>
                      {lane.subsystem?.name ?? t("Unknown")}
                    </Text>
                    <Text style={[sidebarStyles.laneSecondary, { color: colors.subtleText }]}>
                      {completeTasks}/{lane.tasks.length}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[chartStyles.chart, { backgroundColor: colors.canvas, width: chartWidth }]}>
              <View style={[chartStyles.monthLabel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[chartStyles.monthText, { color: colors.navyInk }]}>
                  {timelineStart.toLocaleDateString(locale, { month: "long" })}
                </Text>
              </View>
              <View style={[chartStyles.dayHeaderRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {timelineDays.map((day) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = toDateKey(day) === todayKey;

                  return (
                    <View
                      key={toDateKey(day)}
                      style={[
                        chartStyles.dayHeaderCell,
                        { borderColor: colors.border },
                        isWeekend ? { backgroundColor: colors.navySurface } : null,
                      ]}
                    >
                      {isToday ? <Text style={[chartStyles.todayPill, { color: colors.blue }]}>TODAY</Text> : null}
                      <Text style={[chartStyles.weekday, { color: colors.subtleText }]}>
                        {day.toLocaleDateString(locale, { weekday: "short" }).toLocaleUpperCase(locale)}
                      </Text>
                      <Text style={[chartStyles.dayNumber, { color: colors.ink }]}>{day.getDate()}</Text>
                    </View>
                  );
                })}
              </View>

              {lanes.map((lane) => (
                <View key={lane.id} style={[chartStyles.lane, { borderColor: colors.border, height: lane.height }]}>
                  {timelineDays.map((day) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <View
                        key={`${lane.id}-${toDateKey(day)}`}
                        style={[
                          chartStyles.dayCell,
                          { borderColor: colors.border, backgroundColor: colors.canvas },
                          isWeekend ? { backgroundColor: colors.navySurface } : null,
                        ]}
                      />
                    );
                  })}
                  {lane.tasks.map(({ color, task, top }) => {
                    const range = getLaneTaskRange(task, timelineStart, timelineDays.length);
                    if (!range) {
                      return null;
                    }

                    return (
                      <Pressable
                        key={task.id}
                        onPress={() => onTaskPress(task)}
                        style={[
                          chartStyles.taskBar,
                          { left: range.left, top, width: range.width, backgroundColor: color },
                        ]}
                      >
                        <Text numberOfLines={1} style={chartStyles.taskBarText}>
                          {task.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}

              {markerEvents.map(({ dayIndex, event }) => (
                <View key={event.id} pointerEvents="none" style={[chartStyles.milestoneMarker, { left: dayIndex * DAY_WIDTH }]}>
                  <View
                    style={[
                      chartStyles.milestoneBlock,
                      { backgroundColor: colors.orangeSurface, borderColor: colors.orange, height: 40 + laneHeight },
                    ]}
                  />
                  <Text numberOfLines={1} style={[chartStyles.milestoneLabel, { backgroundColor: colors.orange, color: colors.white }]}>
                    {event.title}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
