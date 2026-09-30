import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import type { Task } from "../../types/domain";
import type { ScheduleEntry } from "../../app/appModel";
import {
  daysBetween,
  getTaskDateRange,
  parseDate,
  toDateKey,
  type PackedLane,
} from "./landscapeTimelineModel";
import { landscapeCalendarStyles as calendarStyles } from "./landscapeCalendarStyles";
import { landscapeTimelineStyles as styles } from "./landscapeTimelineStyles";

type Props = {
  calendarDays: Date[];
  colors: AppThemeColors;
  events: ScheduleEntry[];
  lanes: PackedLane[];
  locale: string;
  onTaskPress: (task: Task) => void;
  timelineStart: Date;
  todayKey: string;
};

const MAX_ITEMS_PER_DAY = 3;

export function LandscapeCalendarView({
  calendarDays,
  colors,
  events,
  lanes,
  locale,
  onTaskPress,
  timelineStart,
  todayKey,
}: Props) {
  const taskItems = lanes.flatMap((lane) => lane.tasks.map((packedTask) => ({ ...packedTask, laneColor: lane.color })));

  return (
    <View style={[styles.board, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={calendarStyles.calendar}>
        <View style={[calendarStyles.weekdayRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {calendarDays.slice(0, 7).map((day) => (
            <View key={toDateKey(day)} style={[calendarStyles.weekdayCell, { borderColor: colors.border }]}>
              <Text style={[calendarStyles.weekdayText, { color: colors.subtleText }]}>
                {day.toLocaleDateString(locale, { weekday: "short" })}
              </Text>
            </View>
          ))}
        </View>
        {Array.from({ length: 6 }, (_week, weekIndex) => {
          const weekDays = calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7);

          return (
            <View key={weekIndex} style={calendarStyles.weekRow}>
              {weekDays.map((day) => {
                const dayKey = toDateKey(day);
                const isCurrentMonth = day.getMonth() === timelineStart.getMonth();
                const isToday = dayKey === todayKey;
                const tasksForDay = taskItems.filter(({ task }) => {
                  const { start, end } = getTaskDateRange(task);
                  return daysBetween(start, day) >= 0 && daysBetween(day, end) >= 0;
                });
                const eventsForDay = events.filter((event) => toDateKey(parseDate(event.startDateTime)) === dayKey);
                const visibleTasks = tasksForDay.slice(0, MAX_ITEMS_PER_DAY);
                const visibleEvents = eventsForDay.slice(0, Math.max(0, MAX_ITEMS_PER_DAY - visibleTasks.length));
                const hiddenCount = tasksForDay.length + eventsForDay.length - visibleTasks.length - visibleEvents.length;

                return (
                  <View
                    key={dayKey}
                    style={[
                      calendarStyles.dayCell,
                      {
                        backgroundColor: isCurrentMonth ? colors.canvas : colors.surface,
                        borderColor: colors.border,
                        opacity: isCurrentMonth ? 1 : 0.55,
                      },
                    ]}
                  >
                    <View style={calendarStyles.dayHeader}>
                      <Text style={[calendarStyles.dayNumber, { color: isToday ? colors.blue : colors.ink }]}>
                        {day.getDate()}
                      </Text>
                      {isToday ? (
                        <View style={[calendarStyles.todayBadge, { backgroundColor: colors.blue }]}>
                          <Text style={calendarStyles.todayText}>TODAY</Text>
                        </View>
                      ) : null}
                    </View>
                    {visibleTasks.map(({ color, task }) => (
                      <Pressable
                        key={task.id}
                        onPress={() => onTaskPress(task)}
                        style={[calendarStyles.itemPill, { backgroundColor: color }]}
                      >
                        <Text numberOfLines={1} style={calendarStyles.itemText}>
                          {task.title}
                        </Text>
                      </Pressable>
                    ))}
                    {visibleEvents.map((event) => (
                      <View
                        key={event.id}
                        style={[
                          calendarStyles.itemPill,
                          calendarStyles.eventPill,
                          { backgroundColor: colors.orangeSurface, borderColor: colors.orange },
                        ]}
                      >
                        <Text numberOfLines={1} style={[calendarStyles.itemText, { color: colors.orange }]}>
                          {event.title}
                        </Text>
                      </View>
                    ))}
                    {hiddenCount > 0 ? (
                      <Text style={[calendarStyles.moreText, { color: colors.subtleText }]}>+{hiddenCount} more</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}
