import { Image, Pressable, View } from "react-native";

import { Text } from "../i18n";
import { capitalize } from "../ui/helpers";
import { styles } from "../ui/styles";
import { SummaryRow, WorkspacePanel } from "../ui/ui";

import type { Member } from "../types/domain";
import type { AppScreenProps } from "./types";

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "?";
}

function formatRole(role: string) {
  return role === "external" ? "External access" : capitalize(role);
}

export function RosterScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    canMentorApprove,
    disciplinesById,
    openCreateMemberEditor,
    openEditMemberEditor,
    rosterExternal,
    rosterMentors,
    rosterStudents,
    selectedMemberId,
    setSelectedMemberId,
    themeColors,
  } = props;

  const renderRosterSection = (
    title: string,
    memberList: Member[],
    addRole: "student" | "mentor" | "external",
  ) => {
    return (
      <View style={[styles.rosterSection, appResponsiveStyles.rosterSection]}>
        <View style={styles.rosterSectionHeader}>
          <View style={styles.rosterSectionTitleRow}>
            <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
              {title}
            </Text>
            <View style={[styles.sidebarCountPill, appResponsiveStyles.navCount]}>
              <Text style={[styles.sidebarCountLabel, { color: themeColors.ink }]}>
                {memberList.length}
              </Text>
            </View>
          </View>
          {canMentorApprove ? (
            <Pressable
              accessibilityLabel={`Add ${title.toLowerCase()} person`}
              accessibilityRole="button"
              onPress={() => openCreateMemberEditor(addRole)}
              style={styles.rosterAddButton}
            >
              <Text style={[styles.rosterAddButtonLabel, { color: themeColors.navyInk }]}>
                +
              </Text>
            </Pressable>
          ) : null}
        </View>

        {memberList.map((member) => {
          const isSelected = selectedMemberId === member.id;
          const disciplineName = member.disciplineId
            ? disciplinesById[member.disciplineId]?.name
            : null;

          return (
            <Pressable
              key={member.id}
              onPress={() => setSelectedMemberId(member.id)}
              onLongPress={canMentorApprove ? () => openEditMemberEditor(member.id) : undefined}
              style={[
                styles.memberRow,
                appResponsiveStyles.memberRow,
                isSelected && [styles.memberRowSelected, appResponsiveStyles.memberRowSelected],
              ]}
            >
              <View style={[styles.memberAvatar, appResponsiveStyles.memberAvatar]}>
                {member.photoUrl ? (
                  <Image source={{ uri: member.photoUrl }} style={styles.memberAvatarImage} />
                ) : (
                  <Text style={[styles.memberAvatarLabel, { color: themeColors.navyInk }]}>
                    {getInitials(member.name)}
                  </Text>
                )}
              </View>
              <View style={styles.memberCopy}>
                <Text style={[styles.memberName, { color: themeColors.ink }]}>
                  {member.name}
                </Text>
                <Text style={[styles.memberRole, { color: themeColors.subtleText }]}>
                  {member.email || disciplineName || formatRole(member.role)}
                </Text>
              </View>
              {member.role === "lead" || member.role === "admin" ? (
                <View style={styles.memberRoleBadge}>
                  <Text style={[styles.memberRoleBadgeLabel, { color: themeColors.navyInk }]}>
                    {member.role === "admin" ? "A" : "L"}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <WorkspacePanel
      title="Directory"
      subtitle="Manage team members, external access, and roles."
    >
      <SummaryRow
        chips={[
          { label: "Students", value: String(rosterStudents.length) },
          { label: "Mentors", value: String(rosterMentors.length) },
          { label: "External access", value: String(rosterExternal.length) },
        ]}
      />

      {renderRosterSection("Students", rosterStudents, "student")}
      {renderRosterSection("Mentors", rosterMentors, "mentor")}
      {renderRosterSection("External access", rosterExternal, "external")}
    </WorkspacePanel>
  );
}
