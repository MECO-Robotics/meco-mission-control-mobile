import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { BackHandler, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Text } from "../../i18n";
import type { AppThemeColors, AppThemeName } from "../../theme";
import type { MobileDeviceSessionSummary } from "../../types/domain";
import type { ViewTab } from "../../ui/types";
import { styles } from "../../ui/styles";
import { SectionTabs } from "../../ui/ui";
import { getNavigationSection, NAVIGATION } from "../navigation";
import { DeviceSessionsModal } from "./DeviceSessionsModal";
import { PersonMenu } from "./PersonMenu";

type WorkspaceShellProps = {
  activeTab: ViewTab;
  activeTabContent: ReactNode;
  editorModals: ReactNode;
  deviceSessions: MobileDeviceSessionSummary[];
  deviceSessionsError: string | null;
  isDeviceSessionsVisible: boolean;
  isLoadingDeviceSessions: boolean;
  isPersonMenuVisible: boolean;
  onCloseDeviceSessions: () => void;
  onClosePersonMenu: () => void;
  onOpenDeviceSessions: () => void;
  onOpenPersonMenu: () => void;
  onRefresh: () => void;
  onRevokeAllDeviceSessions: () => void;
  onRevokeDeviceSession: (id: string) => void;
  onSelectTab: (view: ViewTab) => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  personInitial: string;
  syncError: string | null;
  syncStatusLabel: string;
  themeColors: AppThemeColors;
  themeMode: AppThemeName;
};

export function WorkspaceShell(props: WorkspaceShellProps) {
  const { activeTab, onSelectTab, themeColors: colors } = props;
  const section = getNavigationSection(activeTab);
  const previousViews = useRef<Record<string, ViewTab>>({});
  const scroll = useRef<ScrollView>(null);
  const scrollPositions = useRef<Partial<Record<ViewTab, number>>>({});
  useEffect(() => {
    previousViews.current[section.value] = activeTab;
    scroll.current?.scrollTo({ y: scrollPositions.current[activeTab] ?? 0, animated: false });
  }, [activeTab, section.value]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeTab === "home") return false;
      onSelectTab("home");
      return true;
    });
    return () => subscription.remove();
  }, [activeTab, onSelectTab]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <StatusBar style={props.themeMode === "dark" ? "light" : "dark"} />
      <View style={[local.header, { borderBottomColor: colors.border }]}>
        <View style={local.title}>
          <Text style={[local.eyebrow, { color: colors.subtleText }]}>MECO Mission Control</Text>
          <Text accessibilityRole="header" style={[local.heading, { color: colors.ink }]}>{section.label}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open account menu" onPress={props.onOpenPersonMenu}
          style={[local.account, { backgroundColor: colors.navySurface }]}>
          <Text style={{ color: colors.navyInk }}>{props.personInitial}</Text>
        </Pressable>
      </View>
      {section.views.length > 1 ? <SectionTabs activeValue={activeTab} onChange={onSelectTab} options={section.views} /> : null}
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={[styles.screen, { backgroundColor: colors.canvas }]}
        contentContainerStyle={styles.screenContent} scrollEventThrottle={100}
        onScroll={(event) => { scrollPositions.current[activeTab] = event.nativeEvent.contentOffset.y; }}>
        {props.syncError ? <View style={[styles.calloutBox, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.ink }}>{props.syncError}</Text>
          <Pressable accessibilityRole="button" onPress={props.onRefresh} style={local.action}>
            <Text style={{ color: colors.blue }}>Retry sync</Text>
          </Pressable>
        </View> : null}
        {props.activeTabContent}
      </ScrollView>
      <View accessibilityRole="tablist" style={[local.bottom, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {NAVIGATION.map((item) => {
          const selected = item.value === section.value;
          return <Pressable key={item.value} accessibilityRole="tab" accessibilityLabel={item.label}
            accessibilityState={{ selected }} onPress={() => onSelectTab(previousViews.current[item.value] ?? item.views[0].value)}
            style={[local.tab, selected && { borderTopColor: colors.blue }]}>
            <Text style={{ color: selected ? colors.navyInk : colors.subtleText, fontWeight: selected ? "700" : "400" }}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
      {props.editorModals}
      <PersonMenu visible={props.isPersonMenuVisible} onClose={props.onClosePersonMenu}
        onOpenDeviceSessions={props.onOpenDeviceSessions} onRefresh={props.onRefresh}
        onSignOut={props.onSignOut} onToggleTheme={props.onToggleTheme}
        themeMode={props.themeMode} themeColors={colors} syncStatusLabel={props.syncStatusLabel} />
      <DeviceSessionsModal error={props.deviceSessionsError} isLoading={props.isLoadingDeviceSessions}
        onClose={props.onCloseDeviceSessions} onRevoke={props.onRevokeDeviceSession}
        onRevokeAll={props.onRevokeAllDeviceSessions} sessions={props.deviceSessions}
        themeColors={colors} visible={props.isDeviceSessionsVisible} />
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  title: { flex: 1 }, eyebrow: { fontSize: 12 }, heading: { fontSize: 22, fontWeight: "700", marginTop: 4 },
  account: { minWidth: 48, minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  bottom: { flexDirection: "row", borderTopWidth: 1 },
  tab: { flex: 1, minHeight: 56, paddingHorizontal: 2, alignItems: "center", justifyContent: "center", borderTopWidth: 3, borderTopColor: "transparent" },
  action: { minHeight: 44, justifyContent: "center" },
});
