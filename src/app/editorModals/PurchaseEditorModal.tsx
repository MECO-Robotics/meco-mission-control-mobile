import { Callout } from "../../ui/Callout";
import type { usePurchaseEditor } from "./usePurchaseEditor";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ResponsiveScreenStyles } from "../../screens/types";

type Props = { editor: ReturnType<typeof usePurchaseEditor>; appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle"> };
export function PurchaseEditorModal({ editor, appResponsiveStyles }: Props) {
  const { draft, id, visible, error, close, save, deletePurchase, updateDraft, taskOptions, vendorOptions, materialOptions, canManageProtectedFields } = editor;
  return <EditorModal onCancel={close} onDelete={id && canManageProtectedFields ? deletePurchase : undefined} onSave={save} saveLabel={id ? "Update commercial record" : "Create commercial record"} title={id ? "Edit purchase" : "Add purchase"} visible={visible}>
    {error ? <Callout body={error} title="Purchase needs attention" responsiveStyles={appResponsiveStyles} /> : null}
    <DropdownField label="Procurement Task" onChange={(taskId) => updateDraft({ taskId })} options={taskOptions} placeholder="Select Task" value={draft.taskId} />
    <ModalField label="Item" onChangeText={(title) => updateDraft({ title })} placeholder="Item or service" value={draft.title} />
    <DropdownField label="Kind" onChange={(kind) => updateDraft({ kind: kind as "cots-goods" | "manufacturing-service" })} options={[{ id: "cots-goods", name: "COTS goods" }, { id: "manufacturing-service", name: "Manufacturing service" }]} value={draft.kind} />
    <DropdownField clearLabel="No material" label="Material" onChange={(materialId) => updateDraft({ materialId })} options={materialOptions} placeholder="Select material" value={draft.materialId} />
    <DropdownField clearLabel="No vendor quote" label="Quoted vendor" onChange={(vendorId) => updateDraft({ vendorId })} options={vendorOptions} placeholder="Select vendor" value={draft.vendorId} />
    <ModalField label="Quantity" keyboardType="numeric" onChangeText={(quantity) => updateDraft({ quantity })} placeholder="1" value={draft.quantity} />
    <ModalField label="Quote amount" keyboardType="decimal-pad" onChangeText={(amount) => updateDraft({ amount })} placeholder="0.00" value={draft.amount} />
  </EditorModal>;
}
