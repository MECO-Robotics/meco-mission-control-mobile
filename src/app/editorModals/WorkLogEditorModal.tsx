import { Callout } from "../../ui/Callout";
import { ActionButton } from "../../ui/ActionButton";
import { ParticipantField } from "../../ui/editorFieldWidgets";
import type { Dispatch, SetStateAction } from "react";
import { View } from "react-native";

import { WORKLOG_TEMPLATE_OPTIONS } from "../../ui/constants";
import { styles } from "../../ui/styles";
import type { EditorMode, Option, WorkLogDraft } from "../../ui/types";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ResponsiveScreenStyles } from "../../screens/types";

type WorkLogEditorModalProps = {
  appResponsiveStyles: Pick<
    ResponsiveScreenStyles,
    "calloutBody" | "calloutBox" | "calloutTitle" | "quickActionButton" | "quickActionButtonLabel"
  >;
  deleteWorkLogDraft: () => void;
  onCancel: () => void;
  onSave: () => void;
  setWorkLogDraft: Dispatch<SetStateAction<WorkLogDraft>>;
  setWorkLogError: (value: string | null) => void;
  taskOptions: Option[];
  memberOptions: Option[];
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
  memberOptions,
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
        <Callout
          body={workLogError}
          title="Missing work log details"
          responsiveStyles={appResponsiveStyles}
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
      <ParticipantField
        options={memberOptions}
        value={workLogDraft.participantIdsText}
        onChange={(value) => {
          setWorkLogDraft((current) => ({ ...current, participantIdsText: value }));
          setWorkLogError(null);
        }}
      />
      <View style={styles.quickActionRow}>
        {WORKLOG_TEMPLATE_OPTIONS.map((template) => (
          <ActionButton key={template.id} onPress={() => {
              setWorkLogError(null);
              setWorkLogDraft((current) => ({
                ...current,
                notes: current.notes.trim()
                  ? `${current.notes.trim()}\n\n${template.notes}`
                  : template.notes,
              }));
            }} variant="quick" responsiveStyles={appResponsiveStyles}>{template.name}</ActionButton>
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
