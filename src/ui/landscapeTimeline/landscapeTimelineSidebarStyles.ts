import { StyleSheet } from "react-native";

import { plannerColors, spacing } from "../../theme";

export const landscapeTimelineSidebarStyles = StyleSheet.create({
  sidebar: {
    width: 330,
    borderRightWidth: 1,
    borderColor: plannerColors.border,
  },
  sidebarHeader: {
    height: 66,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: plannerColors.border,
    backgroundColor: plannerColors.header,
  },
  sidebarHeaderCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderColor: plannerColors.border,
  },
  projectHeaderCell: {
    flex: 0.82,
  },
  sidebarHeaderText: {
    fontSize: 16,
    fontWeight: "900",
  },
  headerEye: {
    color: plannerColors.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  laneLabel: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: plannerColors.border,
    backgroundColor: plannerColors.panel,
  },
  projectCell: {
    flex: 0.82,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderColor: plannerColors.border,
    backgroundColor: plannerColors.project,
  },
  subsystemCell: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  disclosure: {
    color: plannerColors.muted,
    fontSize: 11,
    fontWeight: "900",
  },
  projectLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "900",
  },
  subsystemDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  lanePrimary: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "900",
  },
  laneSecondary: {
    color: plannerColors.muted,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "right",
  },
});
