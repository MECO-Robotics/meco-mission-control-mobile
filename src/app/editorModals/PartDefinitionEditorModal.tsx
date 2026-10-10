import { Callout } from "../../ui/Callout";
import type { usePartDefinitionEditor } from "./usePartDefinitionEditor";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ResponsiveScreenStyles } from "../../screens/types";
type Props = { editor: ReturnType<typeof usePartDefinitionEditor>; appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle"> };
export function PartDefinitionEditorModal({ editor, appResponsiveStyles }: Props) {
  return <EditorModal onCancel={editor.close} onDelete={editor.id ? editor.remove : undefined} onSave={editor.save} saveLabel={editor.id ? "Update part definition" : "Create part definition"} title={editor.id ? "Edit part definition" : "Create part definition"} visible={editor.visible}>
    {!editor.id && !editor.canCreateParts ? <Callout title="Team permission required" body="Only leads, mentors, and admins can add part definitions." responsiveStyles={appResponsiveStyles} /> : null}
    {editor.error ? <Callout body={editor.error} title="Part definition" responsiveStyles={appResponsiveStyles} /> : null}
    <ModalField label="Name" onChangeText={(name) => editor.updateDraft({ name })} placeholder="Part name" value={editor.draft.name} />
    <ModalField label="Part number" onChangeText={(partNumber) => editor.updateDraft({ partNumber })} placeholder="ROB-101" value={editor.draft.partNumber} />
    <ModalField label="Revision" onChangeText={(revision) => editor.updateDraft({ revision })} placeholder="A" value={editor.draft.revision} />
    <ModalField label="Type" onChangeText={(type) => editor.updateDraft({ type })} placeholder="custom part" value={editor.draft.type} />
    <DropdownField label="Default acquisition" onChange={(defaultAcquisitionMethod) => editor.updateDraft({ defaultAcquisitionMethod: defaultAcquisitionMethod as "stock" | "purchase-cots" | "manufacture" })} options={editor.acquisitionOptions} value={editor.draft.defaultAcquisitionMethod} />
    <DropdownField label="CAD source" onChange={(cadSource) => editor.updateDraft({ cadSource: cadSource as "manual" | "step" | "onshape" })} options={[{ id: "manual", name: "Manual" }, { id: "step", name: "STEP" }, { id: "onshape", name: "Onshape" }]} value={editor.draft.cadSource} />
    <ModalField label="Description" multiline onChangeText={(description) => editor.updateDraft({ description })} placeholder="Technical context" value={editor.draft.description} />
    <ModalField label="Material ID (optional)" onChangeText={(materialId) => editor.updateDraft({ materialId })} placeholder="Material record id" value={editor.draft.materialId} />
  </EditorModal>;
}
