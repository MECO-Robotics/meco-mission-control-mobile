import type { useManufacturingEditor } from "./useManufacturingEditor";
import { View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { MANUFACTURING_VIEW_OPTIONS } from "../../ui/constants";
import { styles } from "../../ui/styles";
import type { Option } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ManufacturingItem } from "../../types/domain";
import type { ResponsiveScreenStyles } from "../../screens/types";
import { EditorCallout } from "./EditorCallout";

type ManufacturingEditorModalProps = {
  editor: ReturnType<typeof useManufacturingEditor>;
  appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  memberOptions: Option[];
  subsystemOptions: Option[];
  themeColors: AppThemeColors;
};

export function ManufacturingEditorModal({
  editor,
  appResponsiveStyles,
  memberOptions,
  subsystemOptions,
  themeColors,
}: ManufacturingEditorModalProps) {
  const { draft, id, visible, error, canDelete, requesterName, close, save, deleteManufacturing, updateDraft } = editor;
  return (
    <EditorModal
      onCancel={close}
      onDelete={id && canDelete ? deleteManufacturing : undefined}
      onSave={save}
      saveLabel={id ? "Update item" : "Create item"}
      title={id ? "Edit manufacturing item" : "Create manufacturing item"}
      visible={visible}
    >
      {error ? (
        <EditorCallout
          body={error}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing manufacturing details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Title"
        onChangeText={(value) => updateDraft({ title: value })}
        placeholder="Part title"
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
      {!id ? (
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
            onChange={(value) => updateDraft({ requestedById: value })}
            options={memberOptions}
            placeholder="Select requester"
            value={draft.requestedById}
          />
        </>
      )}
      <DropdownField
        label="Process"
        onChange={(value) => updateDraft({ process: value as ManufacturingItem["process"] })}
        options={MANUFACTURING_VIEW_OPTIONS.filter((option) => option.value !== "all").map((option) => ({
          id: option.value === "prints" ? "3d-print" : option.value,
          name: option.label,
        }))}
        value={draft.process}
      />
      <ModalField
        label="Material"
        onChangeText={(value) => updateDraft({ material: value })}
        placeholder="Material"
        value={draft.material}
      />
      <ModalField
        label="Quantity"
        keyboardType="numeric"
        onChangeText={(value) => updateDraft({ quantity: value })}
        placeholder="1"
        value={draft.quantity}
      />
      <ModalField
        label="Due date (YYYY-MM-DD)"
        onChangeText={(value) => updateDraft({ dueDate: value })}
        placeholder="2026-04-24"
        value={draft.dueDate}
      />
      <AdvancedOptions>
        <ModalField
          label="Batch label"
          onChangeText={(value) => updateDraft({ batchLabel: value })}
          placeholder="B-17"
          value={draft.batchLabel}
        />
        <ModalField
          label="QA review count"
          keyboardType="numeric"
          onChangeText={(value) => updateDraft({ qaReviewCount: value })}
          placeholder="0"
          value={draft.qaReviewCount}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
