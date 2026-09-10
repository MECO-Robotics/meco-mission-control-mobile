import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "../../i18n";
import type { AppThemeColors, AppThemeName } from "../../theme";
import { styles } from "../../ui/styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenDeviceSessions: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  themeMode: AppThemeName;
  themeColors: AppThemeColors;
  syncStatusLabel: string;
};

export function PersonMenu(props: Props) {
  const { themeColors: colors } = props;
  const actions = [
    { label: `Theme: ${props.themeMode === "dark" ? "Dark" : "Light"}`, onPress: props.onToggleTheme },
    { label: "Signed-in devices", onPress: () => { props.onClose(); props.onOpenDeviceSessions(); } },
    { label: "Refresh data", onPress: () => { props.onClose(); props.onRefresh(); } },
    { label: "Sign out", onPress: props.onSignOut },
    { label: "Close", onPress: props.onClose },
  ];
  return <Modal animationType="slide" onRequestClose={props.onClose} visible={props.visible}
    supportedOrientations={["portrait", "landscape-left", "landscape-right"]} transparent>
    <Pressable onPress={props.onClose} style={styles.overlayScrim}>
      <Pressable onPress={() => undefined} style={[styles.overlayCard, { backgroundColor: colors.surface, maxHeight: "90%" }]}>
        <ScrollView>
          <Text accessibilityRole="header" style={[styles.overlayTitle, { color: colors.ink }]}>Account</Text>
          <Text style={[styles.overlaySubtitle, { color: colors.subtleText }]}>{props.syncStatusLabel}</Text>
          <View>{actions.map((action) => <Pressable key={action.label} accessibilityRole="button" onPress={action.onPress}
            style={[styles.settingsRow, { minHeight: 48, borderColor: colors.border }]}>
            <Text style={{ color: colors.ink }}>{action.label}</Text>
          </Pressable>)}</View>
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
