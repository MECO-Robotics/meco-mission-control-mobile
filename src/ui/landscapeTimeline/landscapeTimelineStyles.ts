import { StyleSheet } from "react-native";

import { plannerColors, spacing } from "../../theme";

export const landscapeTimelineStyles = StyleSheet.create({
  shell: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  board: {
    minHeight: 268,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: plannerColors.border,
    backgroundColor: plannerColors.chart,
    overflow: "hidden",
  },
  contentRow: {
    flexDirection: "row",
  },
  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: plannerColors.chart,
  },
  emptyText: {
    color: plannerColors.muted,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
});
