import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";

import { Text } from "../../i18n";
import { capitalize } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import { DropdownField, SummaryRow, WorkspacePanel } from "../../ui/ui";

import type { Member } from "../../types/domain";
import type { AppScreenProps } from "../types";
import { RosterMemberDetail } from "./RosterMemberDetail";
import { rosterMemberDetailStyles } from "./rosterMemberDetailStyles";
import { AttendanceScreen } from "../dashboard/AttendanceScreen";
import { getCohortMetrics } from "./teamMetrics";

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
  const [classYearFilter, setClassYearFilter] = useState("all");
  const {
    appResponsiveStyles,
    canMentorApprove,
    responsibleGroups,
    openCreateMemberEditor,
    openEditMemberEditor,
    rosterExternal,
    rosterMentors,
    rosterStudents,
    selectedMemberId,
    setSelectedMemberId,
    themeColors,
    tasks,
  } = props;
  const selectedMember = selectedMemberId
    ? [...rosterStudents, ...rosterMentors, ...rosterExternal].find(
        (member) => member.id === selectedMemberId,
      )
    : null;
  const selectedMemberResponsibleGroups = selectedMember ? responsibleGroups.filter((group) => group.memberIds.includes(selectedMember.id)).map((group) => group.name).join(", ") : "";
  const closeMemberDetails = () => setSelectedMemberId(null);
  const cohortMetrics = getCohortMetrics(props.members, tasks, props.workLogs);
  const visibleStudents = classYearFilter === "all" ? rosterStudents : rosterStudents.filter((member) => classYearFilter === "unknown" ? !member.classYear : member.classYear === classYearFilter);

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
          const groupNames = responsibleGroups.filter((group) => group.memberIds.includes(member.id)).map((group) => group.name).join(", ");

          return (
            <View key={member.id} style={rosterMemberDetailStyles.rosterItem}>
              <Pressable
                onPress={() =>
                  setSelectedMemberId(isSelected ? null : member.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${member.name}`}
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
                    {member.email || groupNames || formatRole(member.role)}
                  </Text>
                  {(member.role === "student" || member.role === "lead") && member.classYear ? <Text style={[styles.memberRole, { color: themeColors.subtleText }]}>{capitalize(member.classYear)}</Text> : null}
                  <Text style={[styles.memberRole, { color: themeColors.subtleText }]}>
                    {tasks.filter((task) => (task.ownerId === member.id || task.assigneeIds.includes(member.id)) && task.status !== "complete").length} open tasks · {member.plannedWeeklyAttendanceHours === undefined ? "Availability not set" : `${member.plannedWeeklyAttendanceHours}h/week availability`}
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
    <WorkspacePanel title="People" subtitle="Team availability, assigned work, and roles.">
      <SummaryRow
        chips={[
          { label: "Students", value: String(rosterStudents.length) },
          { label: "Mentors", value: String(rosterMentors.length) },
          { label: "External access", value: String(rosterExternal.length) },
        ]}
      />
      <Text style={[styles.subsectionLabel, { color: themeColors.ink, marginTop: 8 }]}>Student cohorts</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cohortMetrics.map((cohort) => <Pressable key={cohort.classYear} onPress={() => setClassYearFilter(classYearFilter === cohort.classYear ? "all" : cohort.classYear)} style={{ minWidth: "46%", padding: 8, margin: 3, borderWidth: 1, borderColor: themeColors.border, borderRadius: 8, backgroundColor: classYearFilter === cohort.classYear ? themeColors.navySurface : themeColors.surface }}>
          <Text style={{ color: themeColors.ink, fontWeight: "700" }}>{capitalize(cohort.classYear)}</Text>
          <Text style={{ color: themeColors.subtleText }}>{cohort.members} members · {cohort.openTasks} open tasks</Text>
          <Text style={{ color: themeColors.subtleText }}>{cohort.remainingHours.toFixed(1)}h remaining · {cohort.loggedHours.toFixed(1)}h logged</Text>
        </Pressable>)}
      </View>
      <DropdownField label="Filter students" value={classYearFilter} onChange={setClassYearFilter} options={[{ id: "all", name: "All students" }, { id: "unknown", name: "Class year not set" }, { id: "freshman", name: "Freshman" }, { id: "sophomore", name: "Sophomore" }, { id: "junior", name: "Junior" }, { id: "senior", name: "Senior" }]} />

      {renderRosterSection("Students", visibleStudents, "student")}
      {renderRosterSection("Mentors", rosterMentors, "mentor")}
      {renderRosterSection("External access", rosterExternal, "external")}

      <AttendanceScreen {...props} />

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
            <ScrollView>
              {selectedMember ? (
                <RosterMemberDetail
                  canMentorApprove={canMentorApprove}
                  responsibleGroupNames={selectedMemberResponsibleGroups}
                  member={selectedMember}
                  tasks={tasks.filter((task) => (task.ownerId === selectedMember.id || task.assigneeIds.includes(selectedMember.id)) && task.status !== "complete")}
                  onClose={closeMemberDetails}
                  onEdit={openEditMemberEditor}
                  themeColors={themeColors}
                />
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </WorkspacePanel>
  );
}
