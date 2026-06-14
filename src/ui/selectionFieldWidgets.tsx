import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";

import { Text } from "../i18n";
import { getResponsiveMetrics, scaleFont } from "./responsive";
import { statusToneLabelStyles, statusToneStyles, styles } from "./styles";
import { explicitStatusPillTones } from "./statusPillTones";
import { useAppTheme } from "./themeContext";
import type { Option, SummaryChipData } from "./types";
import { getStatusGroup } from "./helpers";

export function DropdownField({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  clearLabel,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { colors: themeColors } = useAppTheme();
  const selectedOption = options.find((option) => option.id === value);
  const menuOptions = clearLabel ? [{ id: "", name: clearLabel }, ...options] : options;
  const selectedLabel = selectedOption?.name ?? (!value && clearLabel ? clearLabel : placeholder);

  const chooseOption = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <View style={styles.modalField}>
      <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(true)}
        style={[
          styles.dropdownButton,
          { backgroundColor: themeColors.canvas, borderColor: themeColors.border },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.dropdownButtonLabel,
            {
              color:
                selectedOption || (!value && clearLabel) ? themeColors.ink : themeColors.subtleText,
            },
          ]}
        >
          {selectedLabel}
        </Text>
        <Text style={[styles.dropdownChevron, { color: themeColors.subtleText }]}>v</Text>
      </Pressable>

      {isOpen ? (
        <View
          style={[
            styles.dropdownMenu,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {menuOptions.map((option) => {
              const isSelected = option.id === value || (!option.id && !value);

              return (
                <Pressable
                  key={option.id || "empty"}
                  onPress={() => chooseOption(option.id)}
                  style={[
                    styles.dropdownOption,
                    isSelected && { backgroundColor: themeColors.navySurface },
                  ]}
                >
                  <Text
                    style={[
                      styles.dropdownOptionLabel,
                      { color: isSelected ? themeColors.navyInk : themeColors.ink },
                    ]}
                  >
                    {option.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function SummaryRow({ chips }: { chips: SummaryChipData[] }) {
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const { colors: themeColors } = useAppTheme();
  const minChipWidth = metrics.isVeryCompact ? 92 : 104;

  return (
    <View style={styles.summaryRow}>
      {chips.map((chip) => (
        <View
          key={chip.label}
          style={[
            styles.summaryChip,
            {
              backgroundColor: themeColors.canvas,
              borderColor: themeColors.border,
              minWidth: minChipWidth,
              paddingVertical: metrics.isVeryCompact ? 7 : 8,
            },
          ]}
        >
          <Text
            style={[
              styles.summaryChipLabel,
              { color: themeColors.subtleText, fontSize: scaleFont(10, metrics) },
            ]}
          >
            {chip.label}
          </Text>
          <Text
            style={[
              styles.summaryChipValue,
              { color: themeColors.ink, fontSize: scaleFont(18, metrics) },
            ]}
          >
            {chip.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function StatusPill({ label, value }: { label: string; value: string }) {
  const group = getStatusGroup(value);
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const explicitTone = explicitStatusPillTones[value];

  return (
    <View
      style={[
        styles.statusPill,
        explicitTone ? { backgroundColor: explicitTone.backgroundColor } : statusToneStyles[group],
      ]}
    >
      <Text
        style={[
          styles.statusPillLabel,
          { fontSize: scaleFont(12, metrics) },
          explicitTone ? { color: explicitTone.color } : statusToneLabelStyles[group],
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  const { colors: themeColors } = useAppTheme();

  return (
    <View
      style={[
        styles.emptyStateWrap,
        { backgroundColor: themeColors.canvas, borderColor: themeColors.border },
      ]}
    >
      <Text style={[styles.emptyStateText, { color: themeColors.subtleText }]}>{text}</Text>
    </View>
  );
}
