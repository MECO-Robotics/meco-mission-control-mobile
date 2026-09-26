import type { useSubsystemEditor } from "./useSubsystemEditor";

import type { Option } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type { ResponsiveScreenStyles } from "../../screens/types";
import { EditorCallout } from "./EditorCallout";

type SubsystemEditorModalProps = {
  editor: ReturnType<typeof useSubsystemEditor>;
  appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  memberOptions: Option[];
};

export function SubsystemEditorModal({
  editor,
  appResponsiveStyles,
  memberOptions,
}: SubsystemEditorModalProps) {
  return (
    <EditorModal
      onCancel={editor.close}
      onDelete={editor.id ? editor.remove : undefined}
      onSave={editor.save}
      saveLabel={editor.id ? "Update subsystem" : "Create subsystem"}
      title={editor.id ? "Edit subsystem" : "Create subsystem"}
      visible={editor.visible}
    >
      {editor.error ? (
        <EditorCallout
          body={editor.error}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing subsystem details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Name"
        onChangeText={(value) => editor.updateDraft({ name: value })}
        placeholder="Subsystem name"
        value={editor.draft.name}
      />
      <ModalField
        label="Description"
        multiline
        onChangeText={(value) => editor.updateDraft({ description: value })}
        placeholder="Subsystem description"
        value={editor.draft.description}
      />
      <DropdownField
        clearLabel="No responsible engineer"
        label="Responsible engineer"
        onChange={(value) => editor.updateDraft({ responsibleEngineerId: value })}
        options={memberOptions}
        placeholder="Select responsible engineer"
        value={editor.draft.responsibleEngineerId}
      />
      <AdvancedOptions>
        <ModalField
          label="Mentor IDs (comma separated)"
          onChangeText={(value) => editor.updateDraft({ mentorIdsText: value })}
          placeholder="jordan,riley"
          value={editor.draft.mentorIdsText}
        />
        <ModalField
          label="Risks (comma separated)"
          onChangeText={(value) => editor.updateDraft({ risksText: value })}
          placeholder="Risk one, risk two"
          value={editor.draft.risksText}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
