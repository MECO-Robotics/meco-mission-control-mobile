import type { Dispatch, SetStateAction } from "react";

import type { EditorMode, Option, SubsystemDraft } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type SubsystemEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  deleteSubsystemDraft: () => void;
  memberOptions: Option[];
  onCancel: () => void;
  onSave: () => void;
  setSubsystemDraft: Dispatch<SetStateAction<SubsystemDraft>>;
  setSubsystemError: (value: string | null) => void;
  subsystemDraft: SubsystemDraft;
  subsystemEditorMode: EditorMode | null;
  subsystemError: string | null;
};

export function SubsystemEditorModal({
  appResponsiveStyles,
  deleteSubsystemDraft,
  memberOptions,
  onCancel,
  onSave,
  setSubsystemDraft,
  setSubsystemError,
  subsystemDraft,
  subsystemEditorMode,
  subsystemError,
}: SubsystemEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={subsystemEditorMode === "edit" ? deleteSubsystemDraft : undefined}
      onSave={onSave}
      saveLabel={subsystemEditorMode === "edit" ? "Update subsystem" : "Create subsystem"}
      title={subsystemEditorMode === "edit" ? "Edit subsystem" : "Create subsystem"}
      visible={Boolean(subsystemEditorMode)}
    >
      {subsystemError ? (
        <EditorCallout
          body={subsystemError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing subsystem details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Name"
        onChangeText={(value) => {
          setSubsystemError(null);
          setSubsystemDraft((current) => ({ ...current, name: value }));
        }}
        placeholder="Subsystem name"
        value={subsystemDraft.name}
      />
      <ModalField
        label="Description"
        multiline
        onChangeText={(value) => {
          setSubsystemError(null);
          setSubsystemDraft((current) => ({ ...current, description: value }));
        }}
        placeholder="Subsystem description"
        value={subsystemDraft.description}
      />
      <DropdownField
        clearLabel="No responsible engineer"
        label="Responsible engineer"
        onChange={(value) => {
          setSubsystemError(null);
          setSubsystemDraft((current) => ({ ...current, responsibleEngineerId: value }));
        }}
        options={memberOptions}
        placeholder="Select responsible engineer"
        value={subsystemDraft.responsibleEngineerId}
      />
      <AdvancedOptions>
        <ModalField
          label="Mentor IDs (comma separated)"
          onChangeText={(value) => {
            setSubsystemError(null);
            setSubsystemDraft((current) => ({ ...current, mentorIdsText: value }));
          }}
          placeholder="jordan,riley"
          value={subsystemDraft.mentorIdsText}
        />
        <ModalField
          label="Risks (comma separated)"
          onChangeText={(value) => {
            setSubsystemError(null);
            setSubsystemDraft((current) => ({ ...current, risksText: value }));
          }}
          placeholder="Risk one, risk two"
          value={subsystemDraft.risksText}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
