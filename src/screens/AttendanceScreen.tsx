import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import { capitalize } from "../ui/helpers";
import { styles } from "../ui/styles";
import {
  EmptyState,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";

import type { AppScreenProps, AttendanceStatus } from "./types";

const ATTENDANCE_STATUS_OPTIONS: { status: AttendanceStatus; label: string }[] = [
  { status: "yes", label: "Coming" },
  { status: "maybe", label: "Maybe" },
  { status: "no", label: "Out" },
];

const ATTENDANCE_STATUS_RANK: Record<AttendanceStatus, number> = {
  yes: 0,
  maybe: 1,
  no: 2,
};

export function AttendanceScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    attendanceSummary,
    isSyncing,
    meetingAttendance,
    members,
    setAttendanceStatusByMemberId,
    syncFromBackend,
    themeColors,
  } = props;

const renderScreen = () => {
  const sortedMeetingAttendance = [...meetingAttendance].sort((left, right) => {
    const statusDelta = ATTENDANCE_STATUS_RANK[left.status] - ATTENDANCE_STATUS_RANK[right.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.member.name.localeCompare(right.member.name);
  });

  return (
    <WorkspacePanel
      title="Attendance"
      subtitle={`${members.length} people loaded from the workspace server.`}
      actions={
        <Pressable onPress={syncFromBackend} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>
            {isSyncing ? "Refreshing" : "Refresh"}
          </Text>
        </Pressable>
      }
    >
      <SummaryRow chips={attendanceSummary} />

      <View style={styles.homeSection}>
        <View style={styles.homeSectionHeader}>
          <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
            People
          </Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            Synced from the server and sorted alphabetically.
          </Text>
        </View>
        {sortedMeetingAttendance.map(({ member, status }) => (
          <View
            key={member.id}
            style={[styles.attendanceRow, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowHeader}>
              <View style={[styles.memberAvatar, appResponsiveStyles.memberAvatar]}>
                <Text style={[styles.memberAvatarLabel, { color: themeColors.navyInk }]}>
                  {member.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                  {member.name}
                </Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {capitalize(member.role)}
                  {member.email ? ` - ${member.email}` : ""}
                </Text>
              </View>
              <StatusPill
                label={ATTENDANCE_STATUS_OPTIONS.find((option) => option.status === status)?.label ?? "Maybe"}
                value={status === "yes" ? "complete" : status === "no" ? "critical" : "waiting"}
              />
            </View>
            <View style={styles.attendanceStatusControls}>
              {ATTENDANCE_STATUS_OPTIONS.map((option) => {
                const isSelected = status === option.status;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={option.status}
                    onPress={() =>
                      setAttendanceStatusByMemberId((current) => ({
                        ...current,
                        [member.id]: option.status,
                      }))
                    }
                    style={[
                      styles.attendanceStatusButton,
                      {
                        backgroundColor: themeColors.canvas,
                        borderColor: themeColors.border,
                      },
                      isSelected && [
                        styles.attendanceStatusButtonActive,
                        {
                          backgroundColor: themeColors.blue,
                          borderColor: themeColors.blue,
                        },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.attendanceStatusButtonLabel,
                        { color: themeColors.subtleText },
                        isSelected && [
                          styles.attendanceStatusButtonLabelActive,
                          { color: themeColors.white },
                        ],
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        {meetingAttendance.length === 0 ? (
          <EmptyState text="No people were returned by the server." />
        ) : null}
      </View>
    </WorkspacePanel>
  );
};

  return renderScreen();
}
