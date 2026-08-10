import { StatusBar } from "expo-status-bar";
import type {
  GestureResponderHandlers,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  ScrollView,
  View,
} from "react-native";
import type { ReactNode } from "react";

import { Text } from "../../i18n";
import { appThemes, type AppThemeName } from "../../theme";
import type { Member, MobileDeviceSessionSummary } from "../../types/domain";
import { styles } from "../../ui/styles";
import type { NavItem, ViewTab } from "../../ui/types";
import type { AttendanceStatus, SeasonOption } from "../appModel";
import { AttendanceModal, ProjectOverlay } from "./AppOverlays";
import { AppTopBar } from "./AppTopBar";
import { DeviceSessionsModal } from "./DeviceSessionsModal";
import { NavigationMenu } from "./NavigationMenu";
import { PersonMenu } from "./PersonMenu";

type SubtabOption = {
  value: string;
};

type NavigationSection = {
  title: string;
  items: NavItem[];
};

type MeetingAttendance = {
  member: Member;
  status: AttendanceStatus;
};

type AppThemeColors = (typeof appThemes)[AppThemeName];

export type WorkspaceResponsiveStyles = {
  brandEyebrow: StyleProp<TextStyle>;
  brandTitle: StyleProp<TextStyle>;
  calloutBody: StyleProp<TextStyle>;
  calloutBox: StyleProp<ViewStyle>;
  calloutTitle: StyleProp<TextStyle>;
  iconButton: StyleProp<ViewStyle>;
  navBubble: StyleProp<ViewStyle>;
  navCount: StyleProp<ViewStyle>;
  navDrawer: StyleProp<ViewStyle>;
  navTab: StyleProp<ViewStyle>;
  navTabActive: StyleProp<ViewStyle>;
  overlayCard: StyleProp<ViewStyle>;
  quickActionButton: StyleProp<ViewStyle>;
  quickActionButtonLabel: StyleProp<TextStyle>;
  rowCard: StyleProp<ViewStyle>;
  rowSubtitle: StyleProp<TextStyle>;
  rowTitle: StyleProp<TextStyle>;
  settingsIconButton: StyleProp<ViewStyle>;
  settingsRow: StyleProp<ViewStyle>;
  settingsRowActive: StyleProp<ViewStyle>;
  settingsSubmenu: StyleProp<ViewStyle>;
  settingsSubmenuRowActive: StyleProp<ViewStyle>;
  topbar: StyleProp<ViewStyle>;
};

type WorkspaceShellProps = {
  activeSeasonId: string;
  activeSubtabIndex: number;
  activeSubtabOptions: SubtabOption[];
  activeTab: ViewTab;
  activeTabContent: ReactNode;
  activeTabLabel: string;
  apiToken: string | null;
  createSeason: () => void;
  deleteSeason: (seasonId: string) => void;
  deviceSessions: MobileDeviceSessionSummary[];
  deviceSessionsError: string | null;
  editorModals: ReactNode;
  hasSubtabPages: boolean;
  isAttendanceModalVisible: boolean;
  isCompactLayout: boolean;
  isDarkModeEnabled: boolean;
  isDeviceSessionsVisible: boolean;
  isLoadingDeviceSessions: boolean;
  isNavMenuVisible: boolean;
  isPersonMenuVisible: boolean;
  isProjectOverlayVisible: boolean;
  isSeasonMenuVisible: boolean;
  meetingAttendance: MeetingAttendance[];
  navigationCloseHandlers: GestureResponderHandlers;
  navigationOpenHandlers: GestureResponderHandlers;
  navigationSections: NavigationSection[];
  onCloseAttendance: () => void;
  onCloseDeviceSessions: () => void;
  onCloseNavigation: () => void;
  onClosePersonMenu: () => void;
  onCloseProjectOverlay: () => void;
  onOpenNavigation: () => void;
  onOpenDeviceSessions: () => void;
  onOpenPersonMenu: () => void;
  onOpenProjectOverlay: () => void;
  onOpenSubsystems: () => void;
  onResetWorkspaceData: () => void;
  onRevokeAllDeviceSessions: () => void;
  onRevokeDeviceSession: (sessionId: string) => void;
  onSelectSeason: (seasonId: string) => void;
  onSelectTab: (tab: ViewTab) => void;
  onSignOut: () => void;
  onToggleSeasonMenu: () => void;
  onUpdateThemePreference: (
    nextThemeMode: AppThemeName,
    token: string | null,
  ) => Promise<void>;
  personInitial: string;
  responsiveStyles: WorkspaceResponsiveStyles;
  seasonModeLabel: string;
  seasons: SeasonOption[];
  signedInEmailInitial: string;
  subtabSwipeHandlers: GestureResponderHandlers;
  syncError: string | null;
  syncStatusLabel: string;
  themeColors: AppThemeColors;
  themeMode: AppThemeName;
};

export function WorkspaceShell({
  activeSeasonId,
  activeSubtabIndex,
  activeSubtabOptions,
  activeTab,
  activeTabContent,
  activeTabLabel,
  apiToken,
  createSeason,
  deleteSeason,
  deviceSessions,
  deviceSessionsError,
  editorModals,
  hasSubtabPages,
  isAttendanceModalVisible,
  isCompactLayout,
  isDarkModeEnabled,
  isDeviceSessionsVisible,
  isLoadingDeviceSessions,
  isNavMenuVisible,
  isPersonMenuVisible,
  isProjectOverlayVisible,
  isSeasonMenuVisible,
  meetingAttendance,
  navigationCloseHandlers,
  navigationOpenHandlers,
  navigationSections,
  onCloseAttendance,
  onCloseDeviceSessions,
  onCloseNavigation,
  onClosePersonMenu,
  onCloseProjectOverlay,
  onOpenNavigation,
  onOpenDeviceSessions,
  onOpenPersonMenu,
  onOpenProjectOverlay,
  onOpenSubsystems,
  onResetWorkspaceData,
  onRevokeAllDeviceSessions,
  onRevokeDeviceSession,
  onSelectSeason,
  onSelectTab,
  onSignOut,
  onToggleSeasonMenu,
  onUpdateThemePreference,
  personInitial,
  responsiveStyles,
  seasonModeLabel,
  seasons,
  signedInEmailInitial,
  subtabSwipeHandlers,
  syncError,
  syncStatusLabel,
  themeColors,
  themeMode,
}: WorkspaceShellProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.canvas }]}>
      <StatusBar style={isDarkModeEnabled ? "light" : "dark"} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={[styles.screen, { backgroundColor: themeColors.canvas }]}
        contentContainerStyle={styles.screenContent}
      >
        <AppTopBar
          activeSubtabIndex={activeSubtabIndex}
          activeSubtabOptions={activeSubtabOptions}
          activeTabLabel={activeTabLabel}
          brandEyebrowStyle={responsiveStyles.brandEyebrow}
          brandTitleStyle={responsiveStyles.brandTitle}
          hasSubtabPages={hasSubtabPages}
          iconButtonStyle={responsiveStyles.iconButton}
          isCompactLayout={isCompactLayout}
          onOpenNavigation={onOpenNavigation}
          onOpenPersonMenu={onOpenPersonMenu}
          onOpenProjectOverlay={onOpenProjectOverlay}
          personInitial={personInitial}
          themeColors={themeColors}
          topbarStyle={responsiveStyles.topbar}
        />

        {syncError ? (
          <View style={[styles.calloutBox, responsiveStyles.calloutBox]}>
            <Text style={[styles.calloutTitle, responsiveStyles.calloutTitle]}>
              Backend sync issue
            </Text>
            <Text style={[styles.calloutBody, responsiveStyles.calloutBody]}>
              {syncError}
            </Text>
          </View>
        ) : null}

        <View {...subtabSwipeHandlers}>{activeTabContent}</View>
      </ScrollView>

      <View style={styles.navSwipeEdge} {...navigationOpenHandlers} />
      <AttendanceModal
        isCompactLayout={isCompactLayout}
        meetingAttendance={meetingAttendance}
        onClose={onCloseAttendance}
        rowCardStyle={responsiveStyles.rowCard}
        rowSubtitleStyle={responsiveStyles.rowSubtitle}
        rowTitleStyle={responsiveStyles.rowTitle}
        themeColors={themeColors}
        visible={isAttendanceModalVisible}
      />
      {editorModals}
      <NavigationMenu
        activeTab={activeTab}
        activeTabLabel={activeTabLabel}
        closeButtonStyle={responsiveStyles.iconButton}
        drawerStyle={responsiveStyles.navDrawer}
        navBubbleStyle={responsiveStyles.navBubble}
        navCountStyle={responsiveStyles.navCount}
        navTabActiveStyle={responsiveStyles.navTabActive}
        navTabStyle={responsiveStyles.navTab}
        navigationCloseHandlers={navigationCloseHandlers}
        navigationSections={navigationSections}
        onClose={onCloseNavigation}
        onSelectTab={onSelectTab}
        themeColors={themeColors}
        visible={isNavMenuVisible}
      />
      <ProjectOverlay
        cardStyle={responsiveStyles.overlayCard}
        onClose={onCloseProjectOverlay}
        onOpenSubsystems={onOpenSubsystems}
        themeColors={themeColors}
        visible={isProjectOverlayVisible}
      />
      <PersonMenu
        activeSeasonId={activeSeasonId}
        apiToken={apiToken}
        cardStyle={responsiveStyles.overlayCard}
        createSeason={createSeason}
        deleteSeason={deleteSeason}
        iconButtonStyle={responsiveStyles.settingsIconButton}
        isDarkModeEnabled={isDarkModeEnabled}
        isSeasonMenuVisible={isSeasonMenuVisible}
        onClose={onClosePersonMenu}
        onOpenDeviceSessions={onOpenDeviceSessions}
        onResetWorkspaceData={onResetWorkspaceData}
        onSelectSeason={onSelectSeason}
        onSignOut={onSignOut}
        onToggleSeasonMenu={onToggleSeasonMenu}
        onUpdateThemePreference={onUpdateThemePreference}
        rowActiveStyle={responsiveStyles.settingsRowActive}
        rowStyle={responsiveStyles.settingsRow}
        seasonModeLabel={seasonModeLabel}
        seasons={seasons}
        signedInEmailInitial={signedInEmailInitial}
        submenuRowActiveStyle={responsiveStyles.settingsSubmenuRowActive}
        submenuStyle={responsiveStyles.settingsSubmenu}
        syncStatusLabel={syncStatusLabel}
        themeColors={themeColors}
        themeMode={themeMode}
        visible={isPersonMenuVisible}
      />
      <DeviceSessionsModal
        error={deviceSessionsError}
        isLoading={isLoadingDeviceSessions}
        onClose={onCloseDeviceSessions}
        onRevoke={onRevokeDeviceSession}
        onRevokeAll={onRevokeAllDeviceSessions}
        sessions={deviceSessions}
        themeColors={themeColors}
        visible={isDeviceSessionsVisible}
      />
    </SafeAreaView>
  );
}
