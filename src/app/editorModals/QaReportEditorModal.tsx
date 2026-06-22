import type { Dispatch, SetStateAction } from "react";

import { QA_RESULT_OPTIONS } from "../../ui/constants";
import type { Option, QaReportDraft } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField, ToggleField } from "../../ui/ui";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type QaReportEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  onCancel: () => void;
  onSave: () => void;
  qaReportDraft: QaReportDraft;
  qaReportEditorMode: string | null;
  qaReportError: string | null;
  setActiveQaRequestId: (value: string | null) => void;
  setQaReportDraft: Dispatch<SetStateAction<QaReportDraft>>;
  setQaReportError: (value: string | null) => void;
  taskOptions: Option[];
};

export function QaReportEditorModal({
  appResponsiveStyles,
  onCancel,
  onSave,
  qaReportDraft,
  qaReportEditorMode,
  qaReportError,
  setActiveQaRequestId,
  setQaReportDraft,
  setQaReportError,
  taskOptions,
}: QaReportEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onSave={onSave}
      saveLabel="Save QA report"
      title="QA report"
      visible={Boolean(qaReportEditorMode)}
    >
      {qaReportError ? (
        <EditorCallout
          body={qaReportError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing QA details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <DropdownField
        clearLabel="No task"
        label="Task"
        onChange={(value) => {
          setQaReportDraft((current) => ({ ...current, taskId: value }));
          setActiveQaRequestId(null);
          setQaReportError(null);
        }}
        options={taskOptions}
        placeholder="Select task"
        value={qaReportDraft.taskId}
      />
      <DropdownField
        label="Result"
        onChange={(value) => {
          setQaReportError(null);
          setQaReportDraft((current) => ({ ...current, result: value as QaReportDraft["result"] }));
        }}
        options={QA_RESULT_OPTIONS}
        value={qaReportDraft.result}
      />
      <ModalField
        label="Participants (member IDs, comma separated)"
        onChangeText={(value) => {
          setQaReportDraft((current) => ({ ...current, participantIdsText: value }));
          setQaReportError(null);
        }}
        placeholder="ava,jordan"
        value={qaReportDraft.participantIdsText}
      />
      <ModalField
        label="Notes"
        multiline
        onChangeText={(value) => {
          setQaReportDraft((current) => ({ ...current, notes: value }));
          setQaReportError(null);
        }}
        placeholder="Inspection result, evidence, and follow-up"
        value={qaReportDraft.notes}
      />
      <ModalField
        label="Evidence / references"
        multiline
        onChangeText={(value) => {
          setQaReportDraft((current) => ({ ...current, evidenceNotes: value }));
          setQaReportError(null);
        }}
        placeholder="Photo links, notebook page, test run ID, video, or file reference"
        value={qaReportDraft.evidenceNotes}
      />
      <AdvancedOptions>
        <ModalField
          label="Follow-up task title"
          onChangeText={(value) => {
            setQaReportError(null);
            setQaReportDraft((current) => ({ ...current, followUpTaskTitle: value }));
          }}
          placeholder="Leave blank to create one automatically"
          value={qaReportDraft.followUpTaskTitle}
        />
        <ToggleField
          label="Mentor approved"
          onToggle={(value) => {
            setQaReportError(null);
            setQaReportDraft((current) => ({ ...current, mentorApproved: value }));
          }}
          value={qaReportDraft.mentorApproved}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
