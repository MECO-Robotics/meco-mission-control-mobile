import { Image, Modal, Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { capitalize } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import { SummaryRow, WorkspacePanel } from "../../ui/ui";

import type { Member } from "../../types/domain";
import type { AppScreenProps } from "../types";
import { RosterMemberDetail } from "./RosterMemberDetail";
import { rosterMemberDetailStyles } from "./rosterMemberDetailStyles";

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
  const selectedMember = selectedMemberId
    ? [...rosterStudents, ...rosterMentors, ...rosterExternal].find(
        (member) => member.id === selectedMemberId,
      )
    : null;
  const selectedMemberDisciplineName = selectedMember?.disciplineId
    ? disciplinesById[selectedMember.disciplineId]?.name ?? null
    : null;
  const closeMemberDetails = () => setSelectedMemberId(null);

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
          <Pressable
            accessibilityLabel={`Add ${title.toLowerCase()} person`}
            accessibilityRole="button"
            onPress={() => openCreateMemberEditor(addRole)}
            style={({ pressed }) => [
              styles.rosterAddButton,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
              pressed && styles.rosterAddButtonPressed,
            ]}
          >
            <Text style={[styles.rosterAddButtonLabel, { color: themeColors.blue }]}>
              +
            </Text>
          </Pressable>
        </View>

        {memberList.map((member) => {
          const isSelected = selectedMemberId === member.id;
          const disciplineName = member.disciplineId
            ? disciplinesById[member.disciplineId]?.name
            : null;

          return (
            <View key={member.id} style={rosterMemberDetailStyles.rosterItem}>
              <Pressable
                onPress={() =>
                  setSelectedMemberId(isSelected ? null : member.id)
                }
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

            </View>
          );
        })}
      </View>
    );
  };

  return (
    <WorkspacePanel title="Roster" subtitle="Manage team members, external access, and roles.">
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

      <Modal
        animationType="fade"
        onRequestClose={closeMemberDetails}
        supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
        transparent
        visible={Boolean(selectedMember)}
      >
        <Pressable
          onPress={closeMemberDetails}
          style={rosterMemberDetailStyles.modalScrim}
        >
          <Pressable
            onPress={() => undefined}
            style={rosterMemberDetailStyles.modalCard}
          >
            {selectedMember ? (
              <RosterMemberDetail
                canMentorApprove={canMentorApprove}
                disciplineName={selectedMemberDisciplineName}
                member={selectedMember}
                onClose={closeMemberDetails}
                onEdit={openEditMemberEditor}
                themeColors={themeColors}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </WorkspacePanel>
  );
}
