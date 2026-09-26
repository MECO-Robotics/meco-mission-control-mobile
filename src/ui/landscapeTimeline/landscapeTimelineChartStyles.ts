import { StyleSheet } from "react-native";

import { colors, spacing } from "../../theme";
import { DAY_WIDTH } from "./landscapeTimelineModel";
import { planner } from "./landscapeTimelinePalette";

export const landscapeTimelineChartStyles = StyleSheet.create({
  chart: {
    position: "relative",
    backgroundColor: planner.chart,
  },
  monthLabel: {
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: planner.border,
    backgroundColor: planner.header,
  },
  monthText: {
    color: planner.today,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  dayHeaderRow: {
    height: 40,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: planner.border,
    backgroundColor: planner.header,
  },
  dayHeaderCell: {
    width: DAY_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: planner.border,
  },
  weekday: {
    color: planner.muted,
    fontSize: 8,
    fontWeight: "800",
  },
  dayNumber: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "900",
  },
  todayPill: {
    position: "absolute",
    top: 2,
    color: planner.today,
    fontSize: 7,
    fontWeight: "900",
  },
  lane: {
    position: "relative",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: planner.border,
  },
  dayCell: {
    width: DAY_WIDTH,
    borderRightWidth: 1,
    borderColor: planner.border,
    backgroundColor: planner.chart,
  },
  taskBar: {
    position: "absolute",
    height: 26,
    borderRadius: 4,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  taskBarText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  milestoneMarker: {
    position: "absolute",
    top: 26,
    width: DAY_WIDTH,
    alignItems: "center",
    zIndex: 8,
    elevation: 8,
  },
  milestoneBlock: {
    width: DAY_WIDTH,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    opacity: 0.88,
  },
  milestoneLabel: {
    position: "absolute",
    top: 3,
    width: DAY_WIDTH - 6,
    borderRadius: 4,
    paddingVertical: 3,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "900",
  },
});
