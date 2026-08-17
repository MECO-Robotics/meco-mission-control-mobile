import type { Dispatch, SetStateAction } from "react";
import { View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { MANUFACTURING_VIEW_OPTIONS } from "../../ui/constants";
import { styles } from "../../ui/styles";
import type { EditorMode, ManufacturingDraft, Option } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ManufacturingItem } from "../../types/domain";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type ManufacturingEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  canDelete: boolean;
  deleteManufacturingDraft: () => void;
  manufacturingDraft: ManufacturingDraft;
  manufacturingEditorMode: EditorMode | null;
  manufacturingError: string | null;
  memberOptions: Option[];
  onCancel: () => void;
  onSave: () => void;
  requesterName: string;
  setManufacturingDraft: Dispatch<SetStateAction<ManufacturingDraft>>;
  setManufacturingError: (value: string | null) => void;
  subsystemOptions: Option[];
  themeColors: AppThemeColors;
};

export function ManufacturingEditorModal({
  appResponsiveStyles,
  canDelete,
  deleteManufacturingDraft,
  manufacturingDraft,
  manufacturingEditorMode,
  manufacturingError,
  memberOptions,
  onCancel,
  onSave,
  requesterName,
  setManufacturingDraft,
  setManufacturingError,
  subsystemOptions,
  themeColors,
}: ManufacturingEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={manufacturingEditorMode === "edit" && canDelete ? deleteManufacturingDraft : undefined}
      onSave={onSave}
      saveLabel={manufacturingEditorMode === "edit" ? "Update item" : "Create item"}
      title={manufacturingEditorMode === "edit" ? "Edit manufacturing item" : "Create manufacturing item"}
      visible={Boolean(manufacturingEditorMode)}
    >
      {manufacturingError ? (
        <EditorCallout
          body={manufacturingError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing manufacturing details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Title"
        onChangeText={(value) => {
          setManufacturingError(null);
          setManufacturingDraft((current) => ({ ...current, title: value }));
        }}
        placeholder="Part title"
        value={manufacturingDraft.title}
      />
      <DropdownField
        clearLabel="No subsystem"
        label="Subsystem"
        onChange={(value) => {
          setManufacturingError(null);
          setManufacturingDraft((current) => ({ ...current, subsystemId: value }));
        }}
        options={subsystemOptions}
        placeholder="Select subsystem"
        value={manufacturingDraft.subsystemId}
      />
      {manufacturingEditorMode === "create" ? (
        <View style={styles.modalField}>
          <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>
            Requester
          </Text>
          <Text
            style={[
              styles.modalFieldInput,
              {
                backgroundColor: themeColors.canvas,
                borderColor: themeColors.border,
                color: themeColors.ink,
              },
            ]}
          >
            {requesterName}
          </Text>
        </View>
      ) : (
        <>
          <DropdownField
            clearLabel="No requester"
            label="Requester"
            onChange={(value) => {
              setManufacturingError(null);
              setManufacturingDraft((current) => ({ ...current, requestedById: value }));
            }}
            options={memberOptions}
            placeholder="Select requester"
            value={manufacturingDraft.requestedById}
          />
          <DropdownField
            label="Process"
            onChange={(value) => {
              setManufacturingError(null);
              setManufacturingDraft((current) => ({
                ...current,
                process: value as ManufacturingItem["process"],
              }));
            }}
            options={MANUFACTURING_VIEW_OPTIONS.map((option) => ({
              id: option.value === "prints" ? "3d-print" : option.value,
              name: option.label,
            }))}
            value={manufacturingDraft.process}
          />
        </>
      )}
      <ModalField
        label="Material"
        onChangeText={(value) => {
          setManufacturingError(null);
          setManufacturingDraft((current) => ({ ...current, material: value }));
        }}
        placeholder="Material"
        value={manufacturingDraft.material}
      />
      <ModalField
        label="Quantity"
        keyboardType="numeric"
        onChangeText={(value) => {
          setManufacturingError(null);
          setManufacturingDraft((current) => ({ ...current, quantity: value }));
        }}
        placeholder="1"
        value={manufacturingDraft.quantity}
      />
      <ModalField
        label="Due date (YYYY-MM-DD)"
        onChangeText={(value) => {
          setManufacturingError(null);
          setManufacturingDraft((current) => ({ ...current, dueDate: value }));
        }}
        placeholder="2026-04-24"
        value={manufacturingDraft.dueDate}
      />
      <AdvancedOptions>
        <ModalField
          label="Batch label"
          onChangeText={(value) => {
            setManufacturingError(null);
            setManufacturingDraft((current) => ({ ...current, batchLabel: value }));
          }}
          placeholder="B-17"
          value={manufacturingDraft.batchLabel}
        />
        <ModalField
          label="QA review count"
          keyboardType="numeric"
          onChangeText={(value) => {
            setManufacturingError(null);
            setManufacturingDraft((current) => ({ ...current, qaReviewCount: value }));
          }}
          placeholder="0"
          value={manufacturingDraft.qaReviewCount}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
