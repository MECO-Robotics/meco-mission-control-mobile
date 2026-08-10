import { Modal, Pressable, View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import type { MobileDeviceSessionSummary } from "../../types/domain";
import { styles } from "../../ui/styles";

type DeviceSessionsModalProps = {
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onRevoke: (sessionId: string) => void;
  onRevokeAll: () => void;
  sessions: MobileDeviceSessionSummary[];
  themeColors: AppThemeColors;
  visible: boolean;
};

function formatLastUsed(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unknown";
}

export function DeviceSessionsModal({
  error,
  isLoading,
  onClose,
  onRevoke,
  onRevokeAll,
  sessions,
  themeColors,
  visible,
}: DeviceSessionsModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalScrim}>
        <Pressable
          onPress={() => undefined}
          style={[
            styles.overlayCard,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
        >
          <View style={styles.overlayHeader}>
            <View style={styles.overlayHeaderCopy}>
              <Text style={[styles.overlayTitle, { color: themeColors.ink }]}>Signed-in devices</Text>
              <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>Revoke access from devices you no longer use.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.overlayHeaderAction}>
              <Text style={[styles.overlayHeaderActionLabel, { color: themeColors.ink }]}>Close</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>Loading devices...</Text>
          ) : null}
          {error ? <Text style={[styles.calloutBody, { color: themeColors.orangeInk }]}>{error}</Text> : null}
          {!isLoading && sessions.length === 0 ? (
            <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>No active device sessions.</Text>
          ) : null}

          {sessions.map((session) => (
            <View key={session.id} style={styles.settingsRow}>
              <View>
                <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>
                  {session.deviceName?.trim() || "Mobile device"}{session.current ? " (this device)" : ""}
                </Text>
                <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>Last used {formatLastUsed(session.lastUsedAt)}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => onRevoke(session.id)}>
                <Text style={[styles.settingsRowValue, { color: themeColors.orangeInk }]}>Revoke</Text>
              </Pressable>
            </View>
          ))}

          {sessions.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={onRevokeAll} style={styles.settingsRow}>
              <Text style={[styles.settingsRowTitle, { color: themeColors.orangeInk }]}>Sign out all devices</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
