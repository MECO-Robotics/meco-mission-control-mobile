import type { useMemberEditor } from "./useMemberEditor";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { PLANNED_ATTENDANCE_DAY_OPTIONS, getPhotoFileName } from "../appModel";
import { styles } from "../../ui/styles";
import type { Option } from "../../ui/types";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { MemberRole } from "../../types/domain";
import type { ResponsiveScreenStyles } from "../../screens/types";
import { EditorCallout } from "./EditorCallout";

type MemberEditorModalProps = {
  editor: ReturnType<typeof useMemberEditor>;
  appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  disciplineOptions: Option[];
  themeColors: AppThemeColors;
};

export function MemberEditorModal({
  editor,
  appResponsiveStyles,
  disciplineOptions,
  themeColors,
}: MemberEditorModalProps) {
  return (
    <EditorModal
      onCancel={editor.close}
      onDelete={editor.id ? editor.remove : undefined}
      onSave={editor.save}
      saveLabel={editor.id ? "Update person" : "Add person"}
      title={editor.id ? "Edit selected person" : "Add person"}
      visible={editor.visible}
    >
      {!editor.id ? (
        <Text style={[styles.modalDescription, { color: themeColors.subtleText }]}>
          Create a new roster entry for this workspace.
        </Text>
      ) : null}
      {editor.error ? (
        <EditorCallout
          body={editor.error}
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
            onPress={editor.showPhotoNotice}
            style={styles.profilePhotoChooseButton}
          >
            <Text style={styles.profilePhotoChooseButtonLabel}>Use URL</Text>
          </Pressable>
          <Text style={[styles.profilePhotoFileName, { color: themeColors.ink }]}>
            {getPhotoFileName(editor.draft.photoUrl)}
          </Text>
        </View>
        <ModalField
          label="Profile photo URL"
          onChangeText={(value) => editor.updateDraft({ photoUrl: value })}
          placeholder="https://example.com/photo.jpg"
          value={editor.draft.photoUrl}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => editor.updateDraft({ photoUrl: "" })}
          style={styles.profilePhotoClearButton}
        >
          <Text style={[styles.profilePhotoClearButtonLabel, { color: themeColors.ink }]}>
            Clear file
          </Text>
        </Pressable>
      </View>
      <ModalField
        label="Name"
        onChangeText={(value) => editor.updateDraft({ name: value })}
        placeholder="Person name"
        value={editor.draft.name}
      />
      <ModalField
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => editor.updateDraft({ email: value })}
        placeholder="person@mecorobotics.org"
        value={editor.draft.email}
      />
      <DropdownField
        clearLabel="None"
        label="Discipline"
        onChange={(value) => editor.updateDraft({ disciplineId: value })}
        options={disciplineOptions}
        placeholder="None"
        value={editor.draft.disciplineId}
      />
      <DropdownField
        label="Role"
        onChange={(value) => {
          const role = value as MemberRole;
          editor.updateDraft({
            role,
            elevated: role === "lead" || role === "admin",
          });
        }}
        options={[
          { id: "student", name: "Student" },
          { id: "lead", name: "Student + subteam lead" },
          { id: "mentor", name: "Mentor" },
          { id: "admin", name: "Admin" },
          { id: "external", name: "External access" },
        ]}
        value={editor.draft.role}
      />
      <ModalField
        keyboardType="numeric"
        label="Planned weekly attendance"
        onChangeText={(value) => editor.updateDraft({ plannedWeeklyAttendanceHours: value })}
        placeholder="0"
        value={editor.draft.plannedWeeklyAttendanceHours}
      />
      <View style={styles.plannedDaysField}>
        <Text style={[styles.modalFieldLabel, { color: themeColors.ink }]}>
          Planned days
        </Text>
        <View style={styles.plannedDaysRow}>
          {PLANNED_ATTENDANCE_DAY_OPTIONS.map((day) => {
            const isSelected = editor.draft.plannedAttendanceDays.includes(day.id);

            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                key={day.id}
                onPress={() => {
                  editor.updateDraft({
                    plannedAttendanceDays: editor.draft.plannedAttendanceDays.includes(day.id)
                      ? editor.draft.plannedAttendanceDays.filter((value) => value !== day.id)
                      : [...editor.draft.plannedAttendanceDays, day.id],
                  });
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
        onChangeText={(value) => editor.updateDraft({ plannedAttendanceNotes: value })}
        placeholder=""
        value={editor.draft.plannedAttendanceNotes}
      />
    </EditorModal>
  );
}
