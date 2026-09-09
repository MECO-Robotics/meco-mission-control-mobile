import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { Text, useTranslation } from "../i18n";
import { getResponsiveMetrics, scaleFont } from "./responsive";
import { styles } from "./styles";
import { useAppTheme } from "./themeContext";
import type { Option } from "./types";

export function FilterToolbar({ children }: { children: ReactNode }) {
  return <View style={styles.filterToolbar}>{children}</View>;
}

export function SearchField({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const { colors: themeColors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.searchFieldWrap,
        {
          backgroundColor: themeColors.canvas,
          borderColor: themeColors.border,
          minHeight: metrics.controlHeight,
          paddingHorizontal: metrics.chipPaddingHorizontal + 4,
        },
      ]}
    >
      <TextInput
        accessibilityLabel={t(placeholder)}
        onChangeText={onChangeText}
        placeholder={t(placeholder)}
        placeholderTextColor={themeColors.subtleText}
        style={[
          styles.searchFieldInput,
          { color: themeColors.ink, fontSize: scaleFont(14, metrics) },
        ]}
        value={value}
      />
    </View>
  );
}

export function OptionChipRow({
  allLabel,
  options,
  value,
  onChange,
}: {
  allLabel: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { width } = useWindowDimensions();
  const metrics = getResponsiveMetrics(width);
  const { colors: themeColors } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.optionChipRow}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === "all" }}
        onPress={() => onChange("all")}
        style={[
          styles.optionChip,
          {
            backgroundColor: themeColors.canvas,
            borderColor: themeColors.border,
            paddingHorizontal: metrics.chipPaddingHorizontal,
            paddingVertical: metrics.chipPaddingVertical,
          },
          value === "all" && [
            styles.optionChipActive,
            { backgroundColor: themeColors.navySurface },
          ],
        ]}
      >
        <Text
          style={[
            styles.optionChipLabel,
            { color: themeColors.subtleText, fontSize: scaleFont(12, metrics) },
            value === "all" && [styles.optionChipLabelActive, { color: themeColors.navyInk }],
          ]}
        >
          {allLabel}
        </Text>
      </Pressable>

      {options.map((option) => {
        const isActive = value === option.id;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.id)}
            style={[
              styles.optionChip,
              {
                backgroundColor: themeColors.canvas,
                borderColor: themeColors.border,
                paddingHorizontal: metrics.chipPaddingHorizontal,
                paddingVertical: metrics.chipPaddingVertical,
              },
              isActive && [
                styles.optionChipActive,
                { backgroundColor: themeColors.navySurface },
              ],
            ]}
          >
            <Text
              style={[
                styles.optionChipLabel,
                { color: themeColors.subtleText, fontSize: scaleFont(12, metrics) },
                isActive && [styles.optionChipLabelActive, { color: themeColors.navyInk }],
              ]}
            >
              {option.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
