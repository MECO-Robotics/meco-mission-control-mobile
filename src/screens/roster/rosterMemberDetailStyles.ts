import { StyleSheet } from "react-native";

import { colors, overlayColors, radii, shadows, spacing } from "../../theme";

export const rosterMemberDetailStyles = StyleSheet.create({
  rosterItem: {
    gap: spacing.xs,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: overlayColors.modalScrim,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.subtleText,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  actions: {
    alignItems: "flex-start",
  },
  editButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.navySurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  editButtonLabel: {
    color: colors.navyInk,
    fontSize: 12,
    fontWeight: "800",
  },
  grid: {
    gap: spacing.xs,
  },
  field: {
    gap: 2,
  },
  label: {
    color: colors.subtleText,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  value: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  notes: {
    color: colors.subtleText,
    fontSize: 13,
    lineHeight: 18,
  },
});
