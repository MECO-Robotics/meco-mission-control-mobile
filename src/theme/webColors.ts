export const brandColors = {
  blue: "#16478e",
  red: "#ea1c2d",
  grey: "#bbbbbb",
  black: "#000000",
  white: "#ffffff",
} as const;

export const surfaceColors = {
  pageStart: "#ffffff",
  canvas: "#f5f7fb",
  surface: "#ffffff",
  border: "#e5e7eb",
  track: "#f1f5f9",
  ink: "#000000",
  subtleText: "#64748b",
  softText: "#f8fafc",
  bodyText: "#11213d",
  rowTint: "rgba(22, 71, 142, 0.14)",
} as const;

export const toneColors = {
  orange: brandColors.red,
  orangeSurface: "rgba(234, 28, 45, 0.12)",
  orangeInk: "#991b1b",
  mintSurface: "rgba(22, 71, 142, 0.12)",
  mintInk: brandColors.blue,
  goldSurface: "rgba(187, 187, 187, 0.22)",
  goldInk: "#475569",
  navySurface: "rgba(22, 71, 142, 0.18)",
  navyInk: "#0d2e5c",
} as const;

export const statusToneColors = {
  success: {
    surface: "#dcfce7",
    ink: "#166534",
    mark: "#166534",
    darkSurface: "#064e3b",
    darkInk: "#34d399",
  },
  info: {
    surface: "#e0f2fe",
    ink: "#075985",
    darkSurface: "#082f49",
    darkInk: "#38bdf8",
  },
  warning: {
    surface: "#fef3c7",
    ink: "#92400e",
    darkSurface: "#451a03",
    darkInk: "#fbbf24",
  },
  danger: {
    surface: "#fee2e2",
    ink: "#991b1b",
    darkSurface: "#450a0a",
    darkInk: "#f87171",
  },
  neutral: {
    surface: "#f1f5f9",
    ink: "#475569",
    softSurface: "#eef2f7",
    darkSurface: "#1e293b",
    darkInk: "#94a3b8",
  },
} as const;

export const workflowStatusColors = {
  notStarted: "#54627b",
  inProgress: "#b77900",
  waitingForQa: "#275098",
  complete: "#246847",
  blocked: "#8f4b5d",
  dependencyWait: "#c25a14",
  highPriority: "#a84712",
  inProgressAlternate: "#8a5c00",
} as const;

export const workflowStatusToneColors = {
  notStarted: {
    surface: "rgba(84, 98, 123, 0.14)",
    ink: workflowStatusColors.notStarted,
  },
  inProgress: {
    surface: "rgba(183, 121, 0, 0.14)",
    ink: workflowStatusColors.inProgress,
  },
  waitingForQa: {
    surface: "rgba(39, 80, 152, 0.14)",
    ink: workflowStatusColors.waitingForQa,
  },
  complete: {
    surface: "rgba(36, 104, 71, 0.14)",
    ink: workflowStatusColors.complete,
  },
  blocked: {
    surface: "rgba(143, 75, 93, 0.14)",
    ink: workflowStatusColors.blocked,
  },
  dependencyWait: {
    surface: "rgba(194, 90, 20, 0.14)",
    ink: workflowStatusColors.dependencyWait,
  },
  highPriority: {
    surface: "rgba(168, 71, 18, 0.14)",
    ink: workflowStatusColors.highPriority,
  },
  inProgressAlternate: {
    surface: "rgba(138, 92, 0, 0.14)",
    ink: workflowStatusColors.inProgressAlternate,
  },
} as const;

export const riskSeverityColors = {
  high: {
    border: brandColors.red,
    surface: "rgba(234, 28, 45, 0.12)",
    ink: statusToneColors.danger.ink,
  },
  medium: {
    border: "rgba(233, 131, 53, 0.45)",
    surface: "rgba(233, 131, 53, 0.12)",
    ink: statusToneColors.warning.ink,
  },
  low: {
    border: "rgba(22, 71, 142, 0.26)",
    surface: "rgba(22, 71, 142, 0.08)",
    ink: statusToneColors.neutral.ink,
  },
} as const;

export const destructiveColors = {
  lightText: "#b42318",
  darkText: "#fca5a5",
  lightSurface: "#fff1f2",
  actionAccent: "#fda29b",
  gradientStart: "#b81d2c",
  gradientMiddle: "#f02c3d",
  gradientEnd: "#8f1320",
} as const;

export const operationalAccentColors = {
  cadWarningSurface: "rgba(245, 158, 11, 0.12)",
  cadWarningBorder: "rgba(245, 158, 11, 0.28)",
  cadWarningInk: statusToneColors.warning.ink,
  cadInfoSurface: "rgba(37, 99, 235, 0.1)",
  cadInfoBorder: "rgba(37, 99, 235, 0.22)",
  activeWorklogHelpSurface: "rgba(202, 138, 4, 0.13)",
  activeWorklogHelpInk: "#854d0e",
  activeWorklogBlockerInk: statusToneColors.danger.ink,
  boardDropSurface: "rgba(22, 71, 142, 0.08)",
  boardFocusRing: "rgba(22, 71, 142, 0.38)",
  boardDropRing: "rgba(22, 71, 142, 0.44)",
} as const;

export const supportBlueColors = {
  label: "#93c5fd",
  labelStrong: "#bfdbfe",
  soft: "#dbeafe",
  action: "#2563eb",
  sky: "#0ea5e9",
  progress: "#60a5fa",
  bright: "#38bdf8",
  pale: "#deebff",
  surface: "#eef2f8",
} as const;

export const neutralColors = {
  deep: "#21304a",
  secondary: "#58667d",
  muted: surfaceColors.subtleText,
  darkMuted: "#94a3b8",
  coolBorder: "#cbd5e1",
  grey: "#d1d1d1",
  softBorder: "#d6dbe6",
  border: surfaceColors.border,
  lavenderBorder: "#e6e7f3",
  track: surfaceColors.track,
  row: "#f8fafc",
  authLight: "#f8fbff",
  authLower: "#eef4fb",
} as const;

export const eventTypeColors = {
  practice: {
    columnSurface: "rgba(22, 71, 142, 0.1)",
    border: "rgba(22, 71, 142, 0.32)",
    surface: "rgba(22, 71, 142, 0.18)",
    ink: toneColors.navyInk,
    darkBorder: "rgba(147, 197, 253, 0.48)",
    darkSurface: "rgba(59, 130, 246, 0.22)",
    darkInk: "#bfdbfe",
  },
  competition: {
    columnSurface: "rgba(76, 121, 207, 0.12)",
    border: "rgba(76, 121, 207, 0.35)",
    surface: "rgba(76, 121, 207, 0.2)",
    ink: "#1f3f7a",
    darkBorder: "rgba(147, 197, 253, 0.5)",
    darkSurface: "rgba(96, 165, 250, 0.24)",
    darkInk: "#dbeafe",
  },
  deadline: {
    columnSurface: "rgba(234, 28, 45, 0.11)",
    border: "rgba(234, 28, 45, 0.36)",
    surface: "rgba(234, 28, 45, 0.18)",
    ink: "#8e1120",
    darkBorder: "rgba(251, 113, 133, 0.5)",
    darkSurface: "rgba(244, 63, 94, 0.22)",
    darkInk: "#fecdd3",
  },
  review: {
    columnSurface: "rgba(36, 104, 71, 0.11)",
    border: "rgba(36, 104, 71, 0.34)",
    surface: "rgba(36, 104, 71, 0.18)",
    ink: "#1d5338",
    darkBorder: "rgba(134, 239, 172, 0.46)",
    darkSurface: "rgba(34, 197, 94, 0.2)",
    darkInk: "#bbf7d0",
  },
  demo: {
    columnSurface: "rgba(112, 128, 154, 0.13)",
    border: "rgba(84, 98, 123, 0.35)",
    surface: "rgba(84, 98, 123, 0.22)",
    ink: "#36475f",
    darkBorder: "rgba(203, 213, 225, 0.42)",
    darkSurface: "rgba(148, 163, 184, 0.2)",
    darkInk: "#e2e8f0",
  },
} as const;

export const loginColors = {
  lightShell: "#f8fbff",
  lightCard: brandColors.white,
  darkShell: "#10284d",
  darkShellStart: "#0b1731",
  darkInput: "#172746",
  lightLowerWash: "#eef4fb",
  placeholder: "#f1f5ff",
  notice: "#dbeafe",
  darkError: "#fecdd3",
  devModeButton: "#1e293b",
  badgeBlue: "#1e5aae",
} as const;

export const overlayColors = {
  dropdownScrim: "rgba(15, 23, 42, 0.36)",
  modalScrim: "rgba(15, 23, 42, 0.45)",
  drawerScrim: "rgba(15, 23, 42, 0.34)",
  darkShadow: "#000000",
} as const;

export const plannerColors = {
  border: surfaceColors.border,
  chart: surfaceColors.canvas,
  header: surfaceColors.surface,
  ink: "#0f172a",
  muted: surfaceColors.subtleText,
  panel: surfaceColors.surface,
  project: surfaceColors.track,
  stripe: "rgba(22, 71, 142, 0.12)",
  today: brandColors.blue,
  controlBorder: "#d9e0ea",
  controlActiveSurface: "#d7e3f6",
  controlMuted: "#6f7d91",
  controlActiveInk: "#173b6d",
  addButton: "#1f5aa6",
} as const;

export const workspaceColorPalette = [
  "#E76F51",
  "#F4A261",
  "#E9C46A",
  "#2A9D8F",
  "#4F86C6",
  "#7A5CFA",
  "#C855BC",
  "#D64550",
] as const;

export const timelineDisciplineColors = {
  design: "#c67b1f",
  manufacturing: "#b86125",
  assembly: "#d1863d",
  electrical: "#c9a227",
  programming: "#6d5bd0",
  testing: "#b84f7a",
  planning: "#6a7f96",
  communications: "#2f8f83",
  finance: "#5d8c4a",
  research: "#4b7ca8",
  documentation: "#8c6b4d",
  engagement: "#b26d3b",
  presentation: "#a05fb8",
  mediaProduction: "#d05b7f",
  partnerships: "#3a8a76",
  gameAnalysis: "#3e7cc7",
  scouting: "#3aa0b8",
  dataAnalysis: "#4f65b8",
  riskReview: "#8b5c4d",
  curriculum: "#5e8f6a",
  instruction: "#7d62c7",
  practice: "#3d9b7a",
  assessment: "#c16b4a",
  photography: "#a85c46",
  video: "#7a5be0",
  graphics: "#d45e8c",
  writing: "#6f7b91",
  web: "#2f8fa6",
  socialMedia: "#dd6f5a",
  fallback: "#7a8799",
  subsystemFallback: "#4F86C6",
} as const;

export const timelineAccentColors = {
  subsystems: workspaceColorPalette,
  tasks: [
    timelineDisciplineColors.manufacturing,
    timelineDisciplineColors.electrical,
    timelineDisciplineColors.programming,
    timelineDisciplineColors.testing,
    timelineDisciplineColors.planning,
  ],
} as const;

export const colors = {
  ...brandColors,
  ...surfaceColors,
  ...toneColors,
};

export const darkColors = {
  ...colors,
  pageStart: "#08111f",
  canvas: "#0f172a",
  surface: "#1e293b",
  border: "#334155",
  track: "#0f172a",
  ink: "#f8fafc",
  subtleText: "#e2e8f0",
  softText: "#0f172a",
  bodyText: "#e2e8f0",
  rowTint: "rgba(59, 130, 246, 0.18)",
  navySurface: "rgba(22, 71, 142, 0.34)",
  navyInk: "#bfdbfe",
  orangeSurface: "rgba(234, 28, 45, 0.18)",
  orangeInk: "#f87171",
  goldSurface: "rgba(187, 187, 187, 0.18)",
  goldInk: "#94a3b8",
  mintSurface: "rgba(22, 71, 142, 0.28)",
  mintInk: "#bfdbfe",
};
