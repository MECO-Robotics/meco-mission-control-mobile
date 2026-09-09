export type ResponsiveMetrics = {
  scale: number;
  gutter: number;
  panelPadding: number;
  controlHeight: number;
  chipPaddingHorizontal: number;
  chipPaddingVertical: number;
  cardPadding: number;
  isCompact: boolean;
  isVeryCompact: boolean;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export function getResponsiveMetrics(width: number): ResponsiveMetrics {
  const scale = clamp(width / 390, 0.88, 1.08);
  const isCompact = width < 430;
  const isVeryCompact = width < 360;

  return {
    scale,
    gutter: isVeryCompact ? 10 : isCompact ? 12 : 18,
    panelPadding: isVeryCompact ? 8 : isCompact ? 10 : 14,
    controlHeight: Math.max(48, Math.round(48 * scale)),
    chipPaddingHorizontal: isVeryCompact ? 8 : 10,
    chipPaddingVertical: isVeryCompact ? 6 : 7,
    cardPadding: isVeryCompact ? 8 : 10,
    isCompact,
    isVeryCompact,
  };
}

export function scaleFont(size: number, metrics: ResponsiveMetrics) {
  return Math.round(size * metrics.scale);
}
