import type { Dispatch, SetStateAction } from "react";

import { PURCHASE_STATUS_OPTIONS } from "../../ui/constants";
import type { EditorMode, Option, PurchaseDraft } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField, ToggleField } from "../../ui/ui";
import type { PurchaseItem } from "../../types/domain";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type PurchaseEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
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
      onDelete={purchaseEditorMode === "edit" ? deletePurchaseDraft : undefined}
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
      <DropdownField
        label="Status"
        onChange={(value) => {
          setPurchaseError(null);
          setPurchaseDraft((current) => ({
            ...current,
            status: value as PurchaseItem["status"],
          }));
        }}
        options={PURCHASE_STATUS_OPTIONS}
        value={purchaseDraft.status}
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
        <ToggleField
          label="Mentor approved"
          onToggle={(value) => {
            setPurchaseError(null);
            setPurchaseDraft((current) => ({ ...current, approvedByMentor: value }));
          }}
          value={purchaseDraft.approvedByMentor}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
