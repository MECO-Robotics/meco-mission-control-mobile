import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { capitalize } from "../../ui/helpers";
import type { Member } from "../../types/domain";
import type { AppThemeColors } from "../../theme";
import { rosterMemberDetailStyles as styles } from "./rosterMemberDetailStyles";

const PLANNED_ATTENDANCE_DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type RosterMemberDetailProps = {
  canMentorApprove: boolean;
  disciplineName: string | null;
  member: Member;
  onClose: () => void;
  onEdit: (memberId: string) => void;
  themeColors: AppThemeColors;
};

function formatRole(role: string) {
  return role === "external" ? "External access" : capitalize(role);
}

function formatPlannedAttendanceDays(member: Member) {
  if (!member.plannedAttendanceDays || member.plannedAttendanceDays.length === 0) {
    return "Not set";
  }

  return member.plannedAttendanceDays
    .map((day) => PLANNED_ATTENDANCE_DAY_LABELS[day] ?? capitalize(day))
    .join(", ");
}

export function RosterMemberDetail({
  canMentorApprove,
  disciplineName,
  member,
  onClose,
  onEdit,
  themeColors,
}: RosterMemberDetailProps) {
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: themeColors.ink }]}>
            {member.name}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: themeColors.subtleText },
            ]}
          >
            {disciplineName ?? formatRole(member.role)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close member details"
          accessibilityRole="button"
          onPress={onClose}
          style={[
            styles.closeButton,
            {
              backgroundColor: themeColors.canvas,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.closeButtonLabel, { color: themeColors.ink }]}>
            X
          </Text>
        </Pressable>
      </View>

      {canMentorApprove ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onEdit(member.id);
            }}
            style={[
              styles.editButton,
              {
                backgroundColor: themeColors.navySurface,
                borderColor: themeColors.blue,
              },
            ]}
          >
            <Text
              style={[
                styles.editButtonLabel,
                { color: themeColors.navyInk },
              ]}
            >
              Edit
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.grid}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: themeColors.subtleText }]}>
            Name
          </Text>
          <Text style={[styles.value, { color: themeColors.ink }]}>
            {member.name}
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: themeColors.subtleText }]}>
            Email
          </Text>
          <Text style={[styles.value, { color: themeColors.ink }]}>
            {member.email || "Not set"}
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: themeColors.subtleText }]}>
            Days coming
          </Text>
          <Text style={[styles.value, { color: themeColors.ink }]}>
            {formatPlannedAttendanceDays(member)}
          </Text>
        </View>
      </View>

      {member.plannedAttendanceNotes ? (
        <Text style={[styles.notes, { color: themeColors.subtleText }]}>
          {member.plannedAttendanceNotes}
        </Text>
      ) : null}
    </View>
  );
}
