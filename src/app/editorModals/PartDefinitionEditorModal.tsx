import type { Dispatch, SetStateAction } from "react";

import { ACQUISITION_METHOD_OPTIONS, PART_SOURCE_OPTIONS } from "../../ui/constants";
import type { AcquisitionMethod, EditorMode, PartDefinitionDraft } from "../../ui/types";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type PartDefinitionEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  deletePartDefinitionDraft: () => void;
  onCancel: () => void;
  onSave: () => void;
  partDefinitionDraft: PartDefinitionDraft;
  partDefinitionEditorMode: EditorMode | null;
  partDefinitionError: string | null;
  setPartDefinitionDraft: Dispatch<SetStateAction<PartDefinitionDraft>>;
  setPartDefinitionError: (value: string | null) => void;
};

export function PartDefinitionEditorModal({
  appResponsiveStyles,
  deletePartDefinitionDraft,
  onCancel,
  onSave,
  partDefinitionDraft,
  partDefinitionEditorMode,
  partDefinitionError,
  setPartDefinitionDraft,
  setPartDefinitionError,
}: PartDefinitionEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={partDefinitionEditorMode === "edit" ? deletePartDefinitionDraft : undefined}
      onSave={onSave}
      saveLabel={partDefinitionEditorMode === "edit" ? "Update part definition" : "Create part definition"}
      title={partDefinitionEditorMode === "edit" ? "Edit part definition" : "Create part definition"}
      visible={Boolean(partDefinitionEditorMode)}
    >
      {partDefinitionError ? (
        <EditorCallout
          body={partDefinitionError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing part details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Name"
        onChangeText={(value) => {
          setPartDefinitionError(null);
          setPartDefinitionDraft((current) => ({ ...current, name: value }));
        }}
        placeholder="Part name"
        value={partDefinitionDraft.name}
      />
      <ModalField
        label="Part number"
        onChangeText={(value) => {
          setPartDefinitionError(null);
          setPartDefinitionDraft((current) => ({ ...current, partNumber: value }));
        }}
        placeholder="DRV-101"
        value={partDefinitionDraft.partNumber}
      />
      <ModalField
        label="Revision"
        onChangeText={(value) => {
          setPartDefinitionError(null);
          setPartDefinitionDraft((current) => ({ ...current, revision: value }));
        }}
        placeholder="A"
        value={partDefinitionDraft.revision}
      />
      <DropdownField
        label="Source"
        onChange={(value) => {
          setPartDefinitionError(null);
          setPartDefinitionDraft((current) => ({
            ...current,
            source: value,
            acquisitionMethod:
              value === "FRC Supplier" || value === "COTS" ? "purchase" : current.acquisitionMethod,
          }));
        }}
        options={PART_SOURCE_OPTIONS}
        value={partDefinitionDraft.source || "Onshape"}
      />
      {partDefinitionEditorMode === "create" ? (
        <DropdownField
          label="Acquisition method"
          onChange={(value) => {
            setPartDefinitionError(null);
            setPartDefinitionDraft((current) => ({
              ...current,
              acquisitionMethod: value as AcquisitionMethod,
            }));
          }}
          options={ACQUISITION_METHOD_OPTIONS}
          value={partDefinitionDraft.acquisitionMethod}
        />
      ) : null}
    </EditorModal>
  );
}
