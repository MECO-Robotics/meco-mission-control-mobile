import type {
  GestureResponderHandlers,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import {
  Modal,
  Pressable,
  SafeAreaView,
  View,
} from "react-native";

import { Text } from "../../i18n";
import { appThemes, type AppThemeName } from "../../theme";
import { styles } from "../../ui/styles";
import type { NavItem, ViewTab } from "../../ui/types";

type AppThemeColors = (typeof appThemes)[AppThemeName];

type NavigationSection = {
  title: string;
  items: NavItem[];
};

type NavigationMenuProps = {
  activeTab: ViewTab;
  activeTabLabel: string;
  closeButtonStyle: StyleProp<ViewStyle>;
  drawerStyle: StyleProp<ViewStyle>;
  navBubbleStyle: StyleProp<ViewStyle>;
  navCountStyle: StyleProp<ViewStyle>;
  navTabActiveStyle: StyleProp<ViewStyle>;
  navTabStyle: StyleProp<ViewStyle>;
  navigationCloseHandlers: GestureResponderHandlers;
  navigationSections: NavigationSection[];
  onClose: () => void;
  onSelectTab: (tab: ViewTab) => void;
  themeColors: AppThemeColors;
  visible: boolean;
};

export function NavigationMenu({
  activeTab,
  activeTabLabel,
  closeButtonStyle,
  drawerStyle,
  navBubbleStyle,
  navCountStyle,
  navTabActiveStyle,
  navTabStyle,
  navigationCloseHandlers,
  navigationSections,
  onClose,
  onSelectTab,
  themeColors,
  visible,
}: NavigationMenuProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={visible}
    >
      <Pressable
        onPress={onClose}
        style={[styles.navDrawerSafeArea, styles.navDrawerScrim]}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Pressable
            accessibilityRole="menu"
            onPress={() => undefined}
            style={[styles.navDrawer, drawerStyle]}
            {...navigationCloseHandlers}
          >
            <View style={styles.navDrawerHeader}>
              <View style={styles.navDrawerHeaderText}>
                <Text style={[styles.navDrawerTitle, { color: themeColors.ink }]}>
                  Workspace
                </Text>
                <Text style={[styles.navDrawerSubtitle, { color: themeColors.subtleText }]}>
                  {activeTabLabel}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close navigation"
                accessibilityRole="button"
                onPress={onClose}
                style={[styles.navDrawerCloseButton, closeButtonStyle]}
              >
                <Text style={[styles.navDrawerCloseLabel, { color: themeColors.navyInk }]}>
                  X
                </Text>
              </Pressable>
            </View>

            <View style={styles.navDrawerList}>
              {navigationSections.map((section) => (
                <View key={section.title} style={styles.navDrawerSection}>
                  <Text style={[styles.navDrawerSectionLabel, { color: themeColors.subtleText }]}>
                    {section.title}
                  </Text>
                  {section.items.map((item) => {
                    const isActive = activeTab === item.key;

                    return (
                      <Pressable
                        accessibilityRole="menuitem"
                        accessibilityState={{ selected: isActive }}
                        key={item.key}
                        onPress={() => onSelectTab(item.key)}
                        style={[
                          styles.navDrawerItem,
                          navTabStyle,
                          isActive && [styles.navDrawerItemActive, navTabActiveStyle],
                        ]}
                      >
                        <View
                          style={[
                            styles.sidebarIconBubble,
                            navBubbleStyle,
                            isActive && styles.sidebarIconBubbleActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sidebarIconLabel,
                              { color: themeColors.navyInk },
                              isActive && styles.sidebarIconLabelActive,
                            ]}
                          >
                            {item.shortLabel}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.navDrawerItemLabel,
                            { color: themeColors.ink },
                            isActive && { color: themeColors.navyInk },
                          ] as StyleProp<TextStyle>}
                        >
                          {item.label}
                        </Text>
                        <View
                          style={[
                            styles.sidebarCountPill,
                            navCountStyle,
                            isActive && styles.sidebarCountPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sidebarCountLabel,
                              { color: themeColors.ink },
                              isActive && styles.sidebarCountLabelActive,
                            ]}
                          >
                            {item.count}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}
