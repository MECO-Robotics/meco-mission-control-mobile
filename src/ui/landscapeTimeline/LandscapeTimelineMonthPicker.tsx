import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { landscapeTimelineHeaderStyles as styles } from "./landscapeTimelineHeaderStyles";

type Props = {
  colors: AppThemeColors;
  locale: string;
  onSelectMonth: (date: Date) => void;
  timelineStart: Date;
  timelineYear: number;
};

function formatMonth(anchor: Date, locale: string) {
  return anchor.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function getMonthOptions(year: number, locale: string) {
  return Array.from({ length: 12 }, (_value, monthIndex) => {
    const date = new Date(year, monthIndex, 1);

    return {
      date,
      label: date.toLocaleDateString(locale, { month: "short" }),
      monthIndex,
    };
  });
}

function getYearShiftDate(anchor: Date, offset: number) {
  return new Date(anchor.getFullYear() + offset, anchor.getMonth(), 1);
}

export function LandscapeTimelineMonthPicker({
  colors,
  locale,
  onSelectMonth,
  timelineStart,
  timelineYear,
}: Props) {
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const monthOptions = getMonthOptions(timelineYear, locale);

  return (
    <>
      <View style={styles.monthMenuAnchor}>
        <Pressable
          accessibilityLabel={`Select month ${formatMonth(timelineStart, locale)}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isMonthMenuOpen }}
          onPress={() => setIsMonthMenuOpen((current) => !current)}
          style={[styles.controlButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.controlLabel, { color: colors.ink }]}>{formatMonth(timelineStart, locale)}</Text>
        </Pressable>
        {isMonthMenuOpen ? (
          <View style={[styles.monthMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.monthMenuYearRow}>
              <Pressable
                accessibilityLabel="Previous year"
                accessibilityRole="button"
                onPress={() => onSelectMonth(getYearShiftDate(timelineStart, -1))}
                style={[styles.monthMenuYearButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.monthMenuYearButtonText, { color: colors.ink }]}>Prev</Text>
              </Pressable>
              <Text style={[styles.monthMenuYearLabel, { color: colors.ink }]}>{timelineYear}</Text>
              <Pressable
                accessibilityLabel="Next year"
                accessibilityRole="button"
                onPress={() => onSelectMonth(getYearShiftDate(timelineStart, 1))}
                style={[styles.monthMenuYearButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.monthMenuYearButtonText, { color: colors.ink }]}>Next</Text>
              </Pressable>
            </View>
            <View style={styles.monthMenuGrid}>
              {monthOptions.map((option) => {
                const isSelected = option.monthIndex === timelineStart.getMonth();

                return (
                  <Pressable
                    key={option.monthIndex}
                    accessibilityLabel={formatMonth(option.date, locale)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onSelectMonth(option.date);
                      setIsMonthMenuOpen(false);
                    }}
                    style={[
                      styles.monthMenuItem,
                      isSelected ? { backgroundColor: colors.navySurface } : null,
                    ]}
                  >
                    <Text style={[styles.monthMenuItemText, { color: isSelected ? colors.navyInk : colors.ink }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}
