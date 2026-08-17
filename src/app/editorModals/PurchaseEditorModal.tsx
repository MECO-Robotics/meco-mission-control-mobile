import type { Dispatch, SetStateAction } from "react";

import type { EditorMode, Option, PurchaseDraft } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type PurchaseEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  canManageProtectedFields: boolean;
  deletePurchaseDraft: () => void;
  memberOptions: Option[];
  onCancel: () => void;
  onSave: () => void;
  purchaseDraft: PurchaseDraft;
  purchaseEditorMode: EditorMode | null;
  purchaseError: string | null;
  setPurchaseDraft: Dispatch<SetStateAction<PurchaseDraft>>;
  setPurchaseError: (value: string | null) => void;
  subsystemOptions: Option[];
};

export function PurchaseEditorModal({
  appResponsiveStyles,
  canManageProtectedFields,
  deletePurchaseDraft,
  memberOptions,
  onCancel,
  onSave,
  purchaseDraft,
  purchaseEditorMode,
  purchaseError,
  setPurchaseDraft,
  setPurchaseError,
  subsystemOptions,
}: PurchaseEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={
        purchaseEditorMode === "edit" && canManageProtectedFields
          ? deletePurchaseDraft
          : undefined
      }
      onSave={onSave}
      saveLabel={purchaseEditorMode === "edit" ? "Update purchase" : "Create purchase"}
      title={purchaseEditorMode === "edit" ? "Edit purchase" : "Create purchase"}
      visible={Boolean(purchaseEditorMode)}
    >
      {purchaseError ? (
        <EditorCallout
          body={purchaseError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing purchase details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Title"
        onChangeText={(value) => {
          setPurchaseError(null);
          setPurchaseDraft((current) => ({ ...current, title: value }));
        }}
        placeholder="Item title"
        value={purchaseDraft.title}
      />
      <DropdownField
        clearLabel="No subsystem"
        label="Subsystem"
        onChange={(value) => {
          setPurchaseError(null);
          setPurchaseDraft((current) => ({ ...current, subsystemId: value }));
        }}
        options={subsystemOptions}
        placeholder="Select subsystem"
        value={purchaseDraft.subsystemId}
      />
      <DropdownField
        clearLabel="No requester"
        label="Requester"
        onChange={(value) => {
          setPurchaseError(null);
          setPurchaseDraft((current) => ({ ...current, requestedById: value }));
        }}
        options={memberOptions}
        placeholder="Select requester"
        value={purchaseDraft.requestedById}
      />
      <ModalField
        label="Vendor"
        onChangeText={(value) => {
          setPurchaseError(null);
          setPurchaseDraft((current) => ({ ...current, vendor: value }));
        }}
        placeholder="Vendor"
        value={purchaseDraft.vendor}
      />
      <ModalField
        label="Quantity"
        keyboardType="numeric"
        onChangeText={(value) => {
          setPurchaseError(null);
          setPurchaseDraft((current) => ({ ...current, quantity: value }));
        }}
        placeholder="1"
        value={purchaseDraft.quantity}
      />
      <ModalField
        label="Estimated cost"
        keyboardType="decimal-pad"
        onChangeText={(value) => {
          setPurchaseError(null);
          setPurchaseDraft((current) => ({ ...current, estimatedCost: value }));
        }}
        placeholder="82"
        value={purchaseDraft.estimatedCost}
      />
      <AdvancedOptions>
        <ModalField
          label="Acquisition website"
          onChangeText={(value) => {
            setPurchaseError(null);
            setPurchaseDraft((current) => ({ ...current, linkLabel: value }));
          }}
          placeholder="vendor.com/item"
          value={purchaseDraft.linkLabel}
        />
        {canManageProtectedFields ? (
          <ModalField
            label="Final cost (optional)"
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({ ...current, finalCost: value }));
            }}
            placeholder="61"
            value={purchaseDraft.finalCost}
          />
        ) : null}
      </AdvancedOptions>
    </EditorModal>
  );
}
