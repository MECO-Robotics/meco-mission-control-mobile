import { StyleSheet } from "react-native";

import { colors, plannerColors, spacing } from "../../theme";

export const landscapeCalendarStyles = StyleSheet.create({
  calendar: {
    flex: 1,
  },
  weekdayRow: {
    height: 34,
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  weekRow: {
    flexDirection: "row",
    minHeight: 104,
    flex: 1,
  },
  dayCell: {
    flex: 1,
    minWidth: 0,
    padding: spacing.xs,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    gap: 4,
  },
  dayHeader: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: "900",
  },
  todayBadge: {
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignItems: "center",
  },
  todayText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "900",
  },
  itemPill: {
    minHeight: 22,
    borderRadius: 4,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  eventPill: {
    borderWidth: 1,
  },
  itemText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900",
  },
  moreText: {
    color: plannerColors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
});
