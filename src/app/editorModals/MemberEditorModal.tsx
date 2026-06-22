import type { Dispatch, SetStateAction } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { PLANNED_ATTENDANCE_DAY_OPTIONS, getPhotoFileName } from "../appModel";
import { styles } from "../../ui/styles";
import type { EditorMode, MemberDraft, Option } from "../../ui/types";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { MemberRole } from "../../types/domain";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type MemberEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  deleteMemberDraft: () => void;
  disciplineOptions: Option[];
  memberDraft: MemberDraft;
  memberEditorMode: EditorMode | null;
  memberError: string | null;
  onCancel: () => void;
  onSave: () => void;
  setMemberDraft: Dispatch<SetStateAction<MemberDraft>>;
  setMemberError: (value: string | null) => void;
  showProfilePhotoUrlOnlyMessage: () => void;
  themeColors: AppThemeColors;
};

export function MemberEditorModal({
  appResponsiveStyles,
  deleteMemberDraft,
  disciplineOptions,
  memberDraft,
  memberEditorMode,
  memberError,
  onCancel,
  onSave,
  setMemberDraft,
  setMemberError,
  showProfilePhotoUrlOnlyMessage,
  themeColors,
}: MemberEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={memberEditorMode === "edit" ? deleteMemberDraft : undefined}
      onSave={onSave}
      saveLabel={memberEditorMode === "edit" ? "Update person" : "Add person"}
      title={memberEditorMode === "edit" ? "Edit selected person" : "Add person"}
      visible={Boolean(memberEditorMode)}
    >
      {memberEditorMode === "create" ? (
        <Text style={[styles.modalDescription, { color: themeColors.subtleText }]}>
          Create a new roster entry for this workspace.
        </Text>
      ) : null}
      {memberError ? (
        <EditorCallout
          body={memberError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing roster details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <View style={styles.profilePhotoField}>
        <Text style={[styles.modalFieldLabel, { color: themeColors.ink }]}>
          Profile photo
        </Text>
        <View style={[styles.profilePhotoPicker, { borderColor: themeColors.border }]}>
          <Pressable
            accessibilityRole="button"
            onPress={showProfilePhotoUrlOnlyMessage}
            style={styles.profilePhotoChooseButton}
          >
            <Text style={styles.profilePhotoChooseButtonLabel}>Use URL</Text>
          </Pressable>
          <Text style={[styles.profilePhotoFileName, { color: themeColors.ink }]}>
            {getPhotoFileName(memberDraft.photoUrl)}
          </Text>
        </View>
        <ModalField
          label="Profile photo URL"
          onChangeText={(value) => {
            setMemberError(null);
            setMemberDraft((current) => ({ ...current, photoUrl: value }));
          }}
          placeholder="https://example.com/photo.jpg"
          value={memberDraft.photoUrl}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setMemberDraft((current) => ({ ...current, photoUrl: "" }))}
          style={styles.profilePhotoClearButton}
        >
          <Text style={[styles.profilePhotoClearButtonLabel, { color: themeColors.ink }]}>
            Clear file
          </Text>
        </Pressable>
      </View>
      <ModalField
        label="Name"
        onChangeText={(value) => {
          setMemberError(null);
          setMemberDraft((current) => ({ ...current, name: value }));
        }}
        placeholder="Person name"
        value={memberDraft.name}
      />
      <ModalField
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => {
          setMemberError(null);
          setMemberDraft((current) => ({ ...current, email: value }));
        }}
        placeholder="person@mecorobotics.org"
        value={memberDraft.email}
      />
      <DropdownField
        clearLabel="None"
        label="Discipline"
        onChange={(value) => {
          setMemberError(null);
          setMemberDraft((current) => ({ ...current, disciplineId: value }));
        }}
        options={disciplineOptions}
        placeholder="None"
        value={memberDraft.disciplineId}
      />
      <DropdownField
        label="Role"
        onChange={(value) => {
          const role = value as MemberRole;
          setMemberError(null);
          setMemberDraft((current) => ({
            ...current,
            role,
            elevated: role === "lead" || role === "admin",
          }));
        }}
        options={[
          { id: "student", name: "Student" },
          { id: "lead", name: "Student + subteam lead" },
          { id: "mentor", name: "Mentor" },
          { id: "admin", name: "Admin" },
          { id: "external", name: "External access" },
        ]}
        value={memberDraft.role}
      />
      <ModalField
        keyboardType="numeric"
        label="Planned weekly attendance"
        onChangeText={(value) => {
          setMemberError(null);
          setMemberDraft((current) => ({
            ...current,
            plannedWeeklyAttendanceHours: value,
          }));
        }}
        placeholder="0"
        value={memberDraft.plannedWeeklyAttendanceHours}
      />
      <View style={styles.plannedDaysField}>
        <Text style={[styles.modalFieldLabel, { color: themeColors.ink }]}>
          Planned days
        </Text>
        <View style={styles.plannedDaysRow}>
          {PLANNED_ATTENDANCE_DAY_OPTIONS.map((day) => {
            const isSelected = memberDraft.plannedAttendanceDays.includes(day.id);

            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                key={day.id}
                onPress={() => {
                  setMemberError(null);
                  setMemberDraft((current) => ({
                    ...current,
                    plannedAttendanceDays: current.plannedAttendanceDays.includes(day.id)
                      ? current.plannedAttendanceDays.filter((value) => value !== day.id)
                      : [...current.plannedAttendanceDays, day.id],
                  }));
                }}
                style={styles.plannedDayOption}
              >
                <View
                  style={[
                    styles.plannedDayCheckbox,
                    {
                      backgroundColor: isSelected ? themeColors.navySurface : themeColors.canvas,
                      borderColor: isSelected ? themeColors.blue : themeColors.border,
                    },
                  ]}
                />
                <Text style={[styles.plannedDayLabel, { color: themeColors.ink }]}>
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ModalField
        label="Attendance notes"
        multiline
        onChangeText={(value) => {
          setMemberError(null);
          setMemberDraft((current) => ({
            ...current,
            plannedAttendanceNotes: value,
          }));
        }}
        placeholder=""
        value={memberDraft.plannedAttendanceNotes}
      />
    </EditorModal>
  );
}
