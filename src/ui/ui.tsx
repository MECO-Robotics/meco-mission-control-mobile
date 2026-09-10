import type { ReactNode } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";

import { Text } from "../i18n";
import { getResponsiveMetrics, scaleFont } from "./responsive";
import { styles } from "./styles";
import { useAppTheme } from "./themeContext";

export function WorkspacePanel({
  title,
  subtitle,
  actions,
  children,
  compactActionsInline = false,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  compactActionsInline?: boolean;
}) {
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const { colors: themeColors } = useAppTheme();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        },
        {
          marginHorizontal: metrics.gutter,
          padding: metrics.panelPadding,
        },
      ]}
    >
      <View
        style={[
          styles.panelHeader,
          metrics.isCompact &&
            (compactActionsInline
              ? styles.panelHeaderCompactInline
              : styles.panelHeaderCompact),
        ]}
      >
        <View style={styles.panelHeaderCopy}>
          <Text
            style={[
              styles.panelTitle,
              { color: themeColors.ink, fontSize: scaleFont(18, metrics) },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.panelSubtitle,
              {
                color: themeColors.subtleText,
                fontSize: scaleFont(13, metrics),
                lineHeight: scaleFont(18, metrics),
              },
            ]}
          >
            {subtitle}
          </Text>
        </View>
        {actions ? (
          <View
            style={[
              styles.panelActions,
              metrics.isCompact &&
                !compactActionsInline &&
                styles.panelActionsCompact,
            ]}
          >
            {actions}
          </View>
        ) : null}
      </View>

      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

export function SectionTabs<T extends string>({
  activeValue,
  onChange,
  options,
}: {
  activeValue: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const { colors: themeColors } = useAppTheme();
  return (
    <View accessibilityRole="tablist">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.sectionTabsRow, { paddingHorizontal: metrics.gutter }]}
      >
        {options.map((option) => {
          const isActive = option.value === activeValue;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(option.value)}
              style={[
                styles.sectionTab,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                  paddingHorizontal: metrics.chipPaddingHorizontal + 4,
                  paddingVertical: metrics.chipPaddingVertical,
                  minHeight: 44,
                  justifyContent: "center",
                },
                isActive && [styles.sectionTabActive, { backgroundColor: themeColors.navySurface }],
              ]}
            >
              <Text
                style={[
                  styles.sectionTabLabel,
                  { color: themeColors.subtleText, fontSize: scaleFont(13, metrics) },
                  isActive && [styles.sectionTabLabelActive, { color: themeColors.navyInk }],
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export { FilterToolbar, SearchField, OptionChipRow } from "./selectionWidgets";
export { DropdownField, SummaryRow, StatusPill, EmptyState } from "./selectionFieldWidgets";
export { InteractionNote, AdvancedOptions, EditorModal } from "./editorWidgets";
export { ModalField, ToggleField } from "./editorFieldWidgets";
