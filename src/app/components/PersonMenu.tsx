import type { StyleProp, ViewStyle } from "react-native";
import {
  Modal,
  Pressable,
  View,
} from "react-native";

import { Text } from "../../i18n";
import { appThemes, type AppThemeName } from "../../theme";
import { styles } from "../../ui/styles";
import type { SeasonOption } from "../appModel";

type AppThemeColors = (typeof appThemes)[AppThemeName];

type PersonMenuProps = {
  activeSeasonId: string;
  apiToken: string | null;
  cardStyle: StyleProp<ViewStyle>;
  createSeason: () => void;
  deleteSeason: (seasonId: string) => void;
  iconButtonStyle: StyleProp<ViewStyle>;
  isDarkModeEnabled: boolean;
  isSeasonMenuVisible: boolean;
  onClose: () => void;
  onResetWorkspaceData: () => void;
  onOpenDeviceSessions: () => void;
  onSelectSeason: (seasonId: string) => void;
  onSignOut: () => void;
  onToggleSeasonMenu: () => void;
  onUpdateThemePreference: (
    nextThemeMode: AppThemeName,
    token: string | null,
  ) => Promise<void>;
  rowActiveStyle: StyleProp<ViewStyle>;
  rowStyle: StyleProp<ViewStyle>;
  seasonModeLabel: string;
  seasons: SeasonOption[];
  signedInEmailInitial: string;
  submenuRowActiveStyle: StyleProp<ViewStyle>;
  submenuStyle: StyleProp<ViewStyle>;
  syncStatusLabel: string;
  themeColors: AppThemeColors;
  themeMode: AppThemeName;
  visible: boolean;
};

export function PersonMenu({
  activeSeasonId,
  apiToken,
  cardStyle,
  createSeason,
  deleteSeason,
  iconButtonStyle,
  isDarkModeEnabled,
  isSeasonMenuVisible,
  onClose,
  onResetWorkspaceData,
  onOpenDeviceSessions,
  onSelectSeason,
  onSignOut,
  onToggleSeasonMenu,
  onUpdateThemePreference,
  rowActiveStyle,
  rowStyle,
  seasonModeLabel,
  seasons,
  signedInEmailInitial,
  submenuRowActiveStyle,
  submenuStyle,
  syncStatusLabel,
  themeColors,
  themeMode,
  visible,
}: PersonMenuProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.overlayScrim}>
        <Pressable onPress={() => undefined} style={[styles.overlayCard, cardStyle]}>
          <View style={styles.overlayHeader}>
            <View style={[styles.personMark, { backgroundColor: themeColors.navySurface }]}>
              <Text style={[styles.personMarkLabel, { color: themeColors.navyInk }]}>
                {signedInEmailInitial}
              </Text>
            </View>
            <View style={styles.overlayHeaderCopy}>
              <Text style={[styles.overlayTitle, { color: themeColors.ink }]}>Personal settings</Text>
              <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>{syncStatusLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onSignOut}
              style={styles.overlayHeaderAction}
            >
              <Text style={[styles.overlayHeaderActionLabel, { color: themeColors.ink }]}>
                Sign out
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              void onUpdateThemePreference(
                themeMode === "dark" ? "light" : "dark",
                apiToken,
              );
            }}
            style={[
              styles.settingsRow,
              rowStyle,
              isDarkModeEnabled && [styles.settingsRowActive, rowActiveStyle],
            ]}
          >
            <View>
              <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>Theme</Text>
            </View>
            <Text style={[styles.settingsRowValue, { color: themeColors.navyInk }]}>
              {themeMode === "dark" ? "Dark" : "Light"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onToggleSeasonMenu}
            style={[
              styles.settingsRow,
              rowStyle,
              isSeasonMenuVisible && [styles.settingsRowActive, rowActiveStyle],
            ]}
          >
            <View>
              <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>Season</Text>
            </View>
            {isSeasonMenuVisible ? (
              <Pressable
                accessibilityLabel="Add new season"
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  createSeason();
                }}
                style={[styles.settingsIconButton, iconButtonStyle]}
              >
                <Text style={[styles.settingsIconButtonLabel, { color: themeColors.navyInk }]}>
                  +
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.settingsRowValue, { color: themeColors.navyInk }]}>
                {seasonModeLabel}
              </Text>
            )}
          </Pressable>

          {isSeasonMenuVisible ? (
            <View style={[styles.settingsSubmenu, submenuStyle]}>
              {seasons.map((option) => {
                const isSelected = activeSeasonId === option.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={option.id}
                    onPress={() => onSelectSeason(option.id)}
                    style={[
                      styles.settingsSubmenuRow,
                      isSelected && [
                        styles.settingsSubmenuRowActive,
                        submenuRowActiveStyle,
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.settingsSubmenuLabel,
                        { color: themeColors.ink },
                        isSelected && { color: themeColors.navyInk },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Delete ${option.label}`}
                      accessibilityRole="button"
                      onPress={(event) => {
                        event.stopPropagation();
                        deleteSeason(option.id);
                      }}
                      style={[styles.settingsIconButton, iconButtonStyle]}
                    >
                      <Text
                        style={[
                          styles.settingsIconButtonLabel,
                          { color: themeColors.navyInk },
                        ]}
                      >
                        -
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Pressable
            onPress={onOpenDeviceSessions}
            style={[styles.settingsRow, rowStyle]}
          >
            <View>
              <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>Signed-in devices</Text>
            </View>
            <Text style={[styles.settingsRowValue, { color: themeColors.navyInk }]}>Manage</Text>
          </Pressable>

          <Pressable
            onPress={onResetWorkspaceData}
            style={[styles.settingsRow, rowStyle]}
          >
            <View>
              <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>Refresh data</Text>
            </View>
            <Text style={[styles.settingsRowValue, { color: themeColors.navyInk }]}>Run</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
