import type { usePartDefinitionEditor } from "./usePartDefinitionEditor";

import { ACQUISITION_METHOD_OPTIONS, PART_SOURCE_OPTIONS } from "../../ui/constants";
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
          title="Missing part details"
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
        onChange={(value) => editor.updateDraft({
            source: value,
            acquisitionMethod:
              value === "FRC Supplier" || value === "COTS" ? "purchase" : editor.draft.acquisitionMethod,
          })}
        options={PART_SOURCE_OPTIONS}
        value={editor.draft.source || "Onshape"}
      />
      {!editor.id ? (
        <DropdownField
          label="Acquisition method"
          onChange={(value) => editor.updateDraft({ acquisitionMethod: value as AcquisitionMethod })}
          options={ACQUISITION_METHOD_OPTIONS}
          value={editor.draft.acquisitionMethod}
        />
      ) : null}
    </EditorModal>
  );
}
