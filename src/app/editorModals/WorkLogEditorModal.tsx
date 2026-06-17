import type { Dispatch, SetStateAction } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { WORKLOG_TEMPLATE_OPTIONS } from "../../ui/constants";
import { styles } from "../../ui/styles";
import type { EditorMode, Option, WorkLogDraft } from "../../ui/types";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type WorkLogEditorModalProps = {
  appResponsiveStyles: Pick<
    WorkspaceResponsiveStyles,
    "calloutBody" | "calloutBox" | "calloutTitle" | "quickActionButton" | "quickActionButtonLabel"
  >;
  deleteWorkLogDraft: () => void;
  onCancel: () => void;
  onSave: () => void;
  setWorkLogDraft: Dispatch<SetStateAction<WorkLogDraft>>;
  setWorkLogError: (value: string | null) => void;
  taskOptions: Option[];
  workLogDraft: WorkLogDraft;
  workLogEditorMode: EditorMode | null;
  workLogError: string | null;
};

export function WorkLogEditorModal({
  appResponsiveStyles,
  deleteWorkLogDraft,
  onCancel,
  onSave,
  setWorkLogDraft,
  setWorkLogError,
  taskOptions,
  workLogDraft,
  workLogEditorMode,
  workLogError,
}: WorkLogEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={workLogEditorMode === "edit" ? deleteWorkLogDraft : undefined}
      onSave={onSave}
      saveLabel={workLogEditorMode === "edit" ? "Update work log" : "Create work log"}
      title={workLogEditorMode === "edit" ? "Edit work log" : "Create work log"}
      visible={Boolean(workLogEditorMode)}
    >
      {workLogError ? (
        <EditorCallout
          body={workLogError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing work log details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <DropdownField
        clearLabel="No task"
        label="Task"
        onChange={(value) => {
          setWorkLogError(null);
          setWorkLogDraft((current) => ({ ...current, taskId: value }));
        }}
        options={taskOptions}
        placeholder="Select task"
        value={workLogDraft.taskId}
      />
      <ModalField
        label="Date (YYYY-MM-DD)"
        onChangeText={(value) => {
          setWorkLogError(null);
          setWorkLogDraft((current) => ({ ...current, date: value }));
        }}
        placeholder="2026-04-24"
        value={workLogDraft.date}
      />
      <ModalField
        label="Hours"
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setWorkLogError(null);
          setWorkLogDraft((current) => ({ ...current, hours: value }));
        }}
        placeholder="2.5"
        value={workLogDraft.hours}
      />
      <ModalField
        label="Participants (member IDs, comma separated)"
        onChangeText={(value) => {
          setWorkLogError(null);
          setWorkLogDraft((current) => ({ ...current, participantIdsText: value }));
        }}
        placeholder="ava,jordan"
        value={workLogDraft.participantIdsText}
      />
      <View style={styles.quickActionRow}>
        {WORKLOG_TEMPLATE_OPTIONS.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => {
              setWorkLogError(null);
              setWorkLogDraft((current) => ({
                ...current,
                notes: current.notes.trim()
                  ? `${current.notes.trim()}\n\n${template.notes}`
                  : template.notes,
              }));
            }}
            style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
          >
            <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
              {template.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <ModalField
        label="Notes"
        multiline
        onChangeText={(value) => {
          setWorkLogError(null);
          setWorkLogDraft((current) => ({ ...current, notes: value }));
        }}
        placeholder="What was completed"
        value={workLogDraft.notes}
      />
    </EditorModal>
  );
}
