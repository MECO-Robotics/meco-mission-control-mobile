import { colors, darkColors } from "./theme/webColors";

export {
  brandColors,
  colors,
  darkColors,
  destructiveColors,
  eventTypeColors,
  loginColors,
  neutralColors,
  operationalAccentColors,
  overlayColors,
  plannerColors,
  riskSeverityColors,
  statusToneColors,
  supportBlueColors,
  surfaceColors,
  timelineAccentColors,
  timelineDisciplineColors,
  toneColors,
  workflowStatusColors,
  workflowStatusToneColors,
  workspaceColorPalette,
} from "./theme/webColors";

export const appThemes = {
  light: colors,
  dark: darkColors,
} as const;

export type AppThemeName = keyof typeof appThemes;
export type AppThemeColors = Record<keyof typeof colors, string>;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 40,
};

export const radii = {
  md: 14,
  lg: 20,
  xl: 28,
};

export const shadows = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
};
