import { Pressable, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { styles } from "../../ui/styles";

type SubtabOption = {
  value: string;
};

type AppTopBarProps = {
  activeSubtabIndex: number;
  activeSubtabOptions: SubtabOption[];
  activeTabLabel: string;
  brandEyebrowStyle: StyleProp<TextStyle>;
  brandTitleStyle: StyleProp<TextStyle>;
  hasSubtabPages: boolean;
  iconButtonStyle: StyleProp<ViewStyle>;
  isCompactLayout: boolean;
  onOpenNavigation: () => void;
  onOpenProjectOverlay: () => void;
  onOpenPersonMenu: () => void;
  personInitial: string;
  themeColors: AppThemeColors;
  topbarStyle: StyleProp<ViewStyle>;
};

export function AppTopBar({
  activeSubtabIndex,
  activeSubtabOptions,
  activeTabLabel,
  brandEyebrowStyle,
  brandTitleStyle,
  hasSubtabPages,
  iconButtonStyle,
  isCompactLayout,
  onOpenNavigation,
  onOpenPersonMenu,
  onOpenProjectOverlay,
  personInitial,
  themeColors,
  topbarStyle,
}: AppTopBarProps) {
  return (
    <View style={[styles.topbar, topbarStyle]}>
      <View style={styles.topbarLeft}>
        <Pressable
          accessibilityLabel="Open navigation"
          accessibilityRole="button"
          onPress={onOpenNavigation}
          style={[styles.iconButton, iconButtonStyle]}
        >
          <View style={styles.menuIcon}>
            <View style={[styles.menuIconBar, { backgroundColor: themeColors.navyInk }]} />
            <View style={[styles.menuIconBar, { backgroundColor: themeColors.navyInk }]} />
            <View style={[styles.menuIconBar, { backgroundColor: themeColors.navyInk }]} />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenProjectOverlay}
          style={styles.brandWrap}
        >
          <Text style={[styles.brandEyebrow, brandEyebrowStyle]}>
            MECO Mission Control
          </Text>
          {!isCompactLayout ? (
            <Text numberOfLines={1} style={[styles.brandTitle, brandTitleStyle]}>
              {activeTabLabel}
            </Text>
          ) : null}
          {hasSubtabPages ? (
            <View style={styles.topbarSubtabDots}>
              {activeSubtabOptions.map((option, index) => {
                const isActive = index === activeSubtabIndex;

                return (
                  <View
                    key={option.value}
                    style={[
                      styles.topbarSubtabDot,
                      {
                        backgroundColor: isActive ? themeColors.blue : themeColors.border,
                        opacity: isActive ? 1 : 0.75,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={[styles.topbarRight, isCompactLayout && styles.topbarRightCompact]}>
        <Pressable
          accessibilityLabel={`Open account menu for ${personInitial}`}
          accessibilityRole="button"
          onPress={onOpenPersonMenu}
          style={[
            styles.personButton,
            iconButtonStyle,
            {
              backgroundColor: themeColors.navySurface,
              borderColor: themeColors.blue,
            },
          ]}
        >
          <Text style={[styles.personButtonLabel, { color: themeColors.navyInk }]}>
            {personInitial}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
