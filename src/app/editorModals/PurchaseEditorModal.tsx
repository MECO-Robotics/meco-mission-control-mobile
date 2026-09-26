import { Callout } from "../../ui/Callout";
import type { usePurchaseEditor } from "./usePurchaseEditor";

import type { Option } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ResponsiveScreenStyles } from "../../screens/types";

type PurchaseEditorModalProps = {
  editor: ReturnType<typeof usePurchaseEditor>;
  appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  memberOptions: Option[];
  subsystemOptions: Option[];
};

export function PurchaseEditorModal({
  editor,
  appResponsiveStyles,
  memberOptions,
  subsystemOptions,
}: PurchaseEditorModalProps) {
  const { draft, id, visible, error, canManageProtectedFields, close, save, deletePurchase, updateDraft } = editor;
  return (
    <EditorModal
      onCancel={close}
      onDelete={
        id && canManageProtectedFields
          ? deletePurchase
          : undefined
      }
      onSave={save}
      saveLabel={id ? "Update purchase" : "Create purchase"}
      title={id ? "Edit purchase" : "Create purchase"}
      visible={visible}
    >
      {error ? (
        <Callout
          body={error}
          title="Purchase needs attention"
          responsiveStyles={appResponsiveStyles}
        />
      ) : null}
      <ModalField
        label="Title"
        onChangeText={(value) => updateDraft({ title: value })}
        placeholder="Item title"
        value={draft.title}
      />
      <DropdownField
        clearLabel="No subsystem"
        label="Subsystem"
        onChange={(value) => updateDraft({ subsystemId: value })}
        options={subsystemOptions}
        placeholder="Select subsystem"
        value={draft.subsystemId}
      />
      <DropdownField
        clearLabel="No requester"
        label="Requester"
        onChange={(value) => updateDraft({ requestedById: value })}
        options={memberOptions}
        placeholder="Select requester"
        value={draft.requestedById}
      />
      <ModalField
        label="Vendor"
        onChangeText={(value) => updateDraft({ vendor: value })}
        placeholder="Vendor"
        value={draft.vendor}
      />
      <ModalField
        label="Quantity"
        keyboardType="numeric"
        onChangeText={(value) => updateDraft({ quantity: value })}
        placeholder="1"
        value={draft.quantity}
      />
      <ModalField
        label="Estimated cost"
        keyboardType="decimal-pad"
        onChangeText={(value) => updateDraft({ estimatedCost: value })}
        placeholder="82"
        value={draft.estimatedCost}
      />
      <AdvancedOptions>
        <ModalField
          label="Acquisition website"
          onChangeText={(value) => updateDraft({ linkLabel: value })}
          placeholder="vendor.com/item"
          value={draft.linkLabel}
        />
        {canManageProtectedFields ? (
          <ModalField
            label="Final cost (optional)"
            keyboardType="decimal-pad"
            onChangeText={(value) => updateDraft({ finalCost: value })}
            placeholder="61"
            value={draft.finalCost}
          />
        ) : null}
      </AdvancedOptions>
    </EditorModal>
  );
}
