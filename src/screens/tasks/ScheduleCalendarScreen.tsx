import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import type { ScheduleEntry } from "../../app/appModel";
import { formatDateTime } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import { ActionButton } from "../../ui/ActionButton";
import { EmptyState, WorkspacePanel } from "../../ui/ui";
import { useAppTheme } from "../../ui/themeContext";
import type { TaskScreenProps } from "./taskScreenTypes";

type Props = Pick<TaskScreenProps,
  "appResponsiveStyles" | "events" | "openCreateMilestoneEditor" | "openEditMilestoneEditor"
>;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStartFor(entries: ScheduleEntry[]) {
  const firstDate = entries.map((entry) => new Date(entry.startDateTime)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => a.getTime() - b.getTime())[0];
  const date = firstDate ?? new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function ScheduleCalendarScreen({ appResponsiveStyles, events, openCreateMilestoneEditor, openEditMilestoneEditor }: Props) {
  const { colors } = useAppTheme();
  const [visibleMonth, setVisibleMonth] = useState(() => monthStartFor(events));
  const [selectedDate, setSelectedDate] = useState(() => {
    const firstDate = events.map((entry) => new Date(entry.startDateTime)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => a.getTime() - b.getTime())[0];
    return dateKey(firstDate ?? new Date());
  });
  const days = useMemo(() => {
    const firstDay = visibleMonth.getDay();
    const count = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((firstDay + count) / 7) * 7 }, (_, index) => {
      const day = index - firstDay + 1;
      return day < 1 || day > count ? null : new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    });
  }, [visibleMonth]);
  const entriesByDate = useMemo(() => events.reduce<Record<string, ScheduleEntry[]>>((grouped, entry) => {
    const date = new Date(entry.startDateTime);
    if (!Number.isNaN(date.getTime())) (grouped[dateKey(date)] ??= []).push(entry);
    return grouped;
  }, {}), [events]);
  const selectedEntries = entriesByDate[selectedDate] ?? [];

  const changeMonth = (delta: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(dateKey(nextMonth));
  };

  return (
    <WorkspacePanel title="Schedule calendar" subtitle="Meetings, events, and milestones retain their own record identities." actions={
      <ActionButton onPress={openCreateMilestoneEditor} variant="primary" responsiveStyles={appResponsiveStyles}>Add milestone</ActionButton>
    }>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <ActionButton onPress={() => changeMonth(-1)} variant="quick" responsiveStyles={appResponsiveStyles}>Previous</ActionButton>
        <Text accessibilityRole="header" style={{ fontWeight: "700" }}>{visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
        <ActionButton onPress={() => changeMonth(1)} variant="quick" responsiveStyles={appResponsiveStyles}>Next</ActionButton>
      </View>
      <View style={{ flexDirection: "row" }}>
        {DAY_NAMES.map((day) => <Text key={day} style={{ width: `${100 / 7}%`, textAlign: "center", fontWeight: "700", paddingVertical: 8 }}>{day}</Text>)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {days.map((day, index) => {
          const key = day ? dateKey(day) : `empty-${index}`;
          const items = day ? entriesByDate[key] ?? [] : [];
          return <Pressable key={key} accessibilityRole={day ? "button" : undefined}
            accessibilityLabel={day ? `${day.toLocaleDateString()}, ${items.length} schedule items` : undefined}
            accessibilityState={day ? { selected: selectedDate === key } : undefined}
            onPress={day ? () => setSelectedDate(key) : undefined}
            style={{ width: `${100 / 7}%`, minHeight: 58, padding: 4, borderWidth: 0.5, borderColor: colors.border, backgroundColor: selectedDate === key ? colors.navySurface : "transparent" }}>
            {day ? <>
              <Text style={{ fontWeight: selectedDate === key ? "700" : "400" }}>{day.getDate()}</Text>
              {items.slice(0, 2).map((entry) => <Text key={`${entry.recordType}:${entry.id}`} numberOfLines={1} style={{ fontSize: 9 }}>{entry.title}</Text>)}
              {items.length > 2 ? <Text style={{ fontSize: 9 }}>+{items.length - 2} more</Text> : null}
            </> : null}
          </Pressable>;
        })}
      </View>
      <Text accessibilityRole="header" style={{ fontWeight: "700", marginTop: 16, marginBottom: 8 }}>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Text>
      {selectedEntries.length ? selectedEntries.map((entry) => {
        const content = <View style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
          <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{entry.title}</Text>
          <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>{entry.recordType} · {entry.type} · {formatDateTime(entry.startDateTime)}</Text>
        </View>;
        return entry.recordType === "milestone"
          ? <Pressable key={`${entry.recordType}:${entry.id}`} onPress={() => openEditMilestoneEditor(entry)}>{content}</Pressable>
          : <View key={`${entry.recordType}:${entry.id}`}>{content}</View>;
      }) : <EmptyState text="No meetings, events, or milestones on this day." />}
    </WorkspacePanel>
  );
}
