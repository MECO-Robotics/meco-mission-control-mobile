import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { Text } from "../../i18n";
import { AttendanceStatusMark } from "../../screens/dashboard/AttendanceStatusMark";
import { appThemes, type AppThemeName } from "../../theme";
import type { Member } from "../../types/domain";
import { capitalize } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import type { AttendanceStatus } from "../appModel";

type AppThemeColors = (typeof appThemes)[AppThemeName];

type ProjectOverlayProps = {
  cardStyle: StyleProp<ViewStyle>;
  onClose: () => void;
  onOpenSubsystems: () => void;
  themeColors: AppThemeColors;
  visible: boolean;
};

type AttendanceModalProps = {
  isCompactLayout: boolean;
  meetingAttendance: {
    member: Member;
    status: AttendanceStatus;
  }[];
  onClose: () => void;
  rowCardStyle: StyleProp<ViewStyle>;
  rowSubtitleStyle: StyleProp<TextStyle>;
  rowTitleStyle: StyleProp<TextStyle>;
  themeColors: AppThemeColors;
  visible: boolean;
};

export function ProjectOverlay({
  cardStyle,
  onClose,
  onOpenSubsystems,
  themeColors,
  visible,
}: ProjectOverlayProps) {
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
            <View style={[styles.projectMark, { backgroundColor: themeColors.navySurface }]}>
              <Text style={[styles.projectMarkLabel, { color: themeColors.navyInk }]}>RB</Text>
            </View>
            <View style={styles.overlayHeaderCopy}>
              <Text style={[styles.overlayTitle, { color: themeColors.ink }]}>MECO Mission Control</Text>
              <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>Robot project selector</Text>
            </View>
          </View>

          <Text style={[styles.overlayBody, { color: themeColors.ink }]}>
            Tap this project chip from the top bar to inspect or edit the active robot
            workspace without leaving the current view.
          </Text>

          <View style={styles.overlayActionRow}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenSubsystems}
              style={styles.overlayActionButton}
            >
              <Text style={styles.overlayActionLabel}>Edit robot</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenSubsystems}
              style={[
                styles.overlaySecondaryButton,
                { backgroundColor: themeColors.canvas, borderColor: themeColors.border },
              ]}
            >
              <Text style={[styles.overlaySecondaryLabel, { color: themeColors.navyInk }]}>Switch project</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AttendanceModal({
  isCompactLayout,
  meetingAttendance,
  onClose,
  rowCardStyle,
  rowSubtitleStyle,
  rowTitleStyle,
  themeColors,
  visible,
}: AttendanceModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={visible}
    >
      <View style={[styles.modalScrim, isCompactLayout && styles.modalScrimCompact]}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
            isCompactLayout && styles.modalCardCompact,
          ]}
        >
          <Text style={[styles.modalTitle, { color: themeColors.ink }]}>
            Meeting attendance
          </Text>
          <Text style={[styles.queueRowSubtitle, rowSubtitleStyle]}>
            Everyone for this meeting, sorted alphabetically.
          </Text>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {meetingAttendance.map(({ member, status }) => (
              <View key={member.id} style={[styles.attendanceRow, rowCardStyle]}>
                <View style={styles.queueRowPrimaryText}>
                  <Text style={[styles.queueRowTitle, rowTitleStyle]}>
                    {member.name}
                  </Text>
                  <Text style={[styles.queueRowSubtitle, rowSubtitleStyle]}>
                    {capitalize(member.role)}
                  </Text>
                </View>
                <AttendanceStatusMark status={status} />
              </View>
            ))}
          </ScrollView>

          <View style={[styles.modalActions, isCompactLayout && styles.modalActionsCompact]}>
            <Pressable
              onPress={onClose}
              style={[
                styles.modalSaveButton,
                isCompactLayout && styles.modalActionButtonCompact,
              ]}
            >
              <Text style={styles.modalSaveButtonLabel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
