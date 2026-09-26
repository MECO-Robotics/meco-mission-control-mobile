import type { usePartDefinitionEditor } from "./usePartDefinitionEditor";

import { PART_SOURCE_OPTIONS } from "../../ui/constants";
import type { AcquisitionMethod } from "../../ui/types";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ResponsiveScreenStyles } from "../../screens/types";
import { EditorCallout } from "./EditorCallout";

type PartDefinitionEditorModalProps = {
  editor: ReturnType<typeof usePartDefinitionEditor>;
  appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
};

export function PartDefinitionEditorModal({
  editor,
  appResponsiveStyles,
}: PartDefinitionEditorModalProps) {
  return (
    <EditorModal
      onCancel={editor.close}
      onDelete={editor.id ? editor.remove : undefined}
      onSave={editor.save}
      saveLabel={editor.id ? "Update part definition" : "Create part definition"}
      title={editor.id ? "Edit part definition" : "Create part definition"}
      visible={editor.visible}
    >
      {editor.error ? (
        <EditorCallout
          body={editor.error}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Part definition"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Name"
        onChangeText={(value) => editor.updateDraft({ name: value })}
        placeholder="Part name"
        value={editor.draft.name}
      />
      <ModalField
        label="Part number"
        onChangeText={(value) => editor.updateDraft({ partNumber: value })}
        placeholder="DRV-101"
        value={editor.draft.partNumber}
      />
      <ModalField
        label="Revision"
        onChangeText={(value) => editor.updateDraft({ revision: value })}
        placeholder="A"
        value={editor.draft.revision}
      />
      <DropdownField
        label="Source"
        onChange={(value) => editor.updateDraft({ source: value })}
        options={PART_SOURCE_OPTIONS}
        value={editor.draft.source || "Onshape"}
      />
      {!editor.id ? (
        <DropdownField
          label="Acquisition method"
          onChange={(value) => editor.updateDraft({ acquisitionMethod: value as AcquisitionMethod })}
          options={editor.acquisitionOptions}
          value={editor.draft.acquisitionMethod}
        />
      ) : null}
      {!editor.id && editor.draft.acquisitionMethod !== "stock" ? (
        <>
          <DropdownField
            label="Subsystem"
            options={editor.subsystems.map(({ id, name }) => ({ id, name }))}
            value={editor.draft.subsystemId}
            onChange={(subsystemId) => editor.updateDraft({ subsystemId })}
          />
          <DropdownField
            label="Discipline"
            options={editor.disciplines.map(({ id, name }) => ({ id, name }))}
            value={editor.draft.disciplineId}
            onChange={(disciplineId) => editor.updateDraft({ disciplineId })}
          />
          <DropdownField
            label="Task owner"
            options={editor.owners.map(({ id, name }) => ({ id, name }))}
            value={editor.draft.ownerId}
            onChange={(ownerId) => editor.updateDraft({ ownerId })}
          />
          <DropdownField
            label="QA mentor"
            options={editor.mentors.map(({ id, name }) => ({ id, name }))}
            value={editor.draft.mentorId}
            onChange={(mentorId) => editor.updateDraft({ mentorId })}
          />
          <ModalField
            label="Due date (YYYY-MM-DD)"
            placeholder="YYYY-MM-DD"
            value={editor.draft.dueDate}
            onChangeText={(dueDate) => editor.updateDraft({ dueDate })}
          />
        </>
      ) : null}
    </EditorModal>
  );
}
