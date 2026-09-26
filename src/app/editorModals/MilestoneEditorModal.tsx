import { Callout } from "../../ui/Callout";
import type { useMilestoneEditor } from "./useMilestoneEditor";

import { EVENT_TYPE_OPTIONS } from "../../ui/constants";
import { localTodayDate } from "../../ui/helpers";
import { AdvancedOptions, DropdownField, EditorModal, ModalField, ToggleField } from "../../ui/ui";
import type { EventType } from "../../types/domain";
import type { ResponsiveScreenStyles } from "../../screens/types";

type MilestoneEditorModalProps = {
  appResponsiveStyles: Pick<ResponsiveScreenStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  editor: ReturnType<typeof useMilestoneEditor>;
};

export function MilestoneEditorModal({
  appResponsiveStyles,
  editor,
}: MilestoneEditorModalProps) {
  const { draft, id, error, visible, close, save, deleteMilestone, updateDraft } = editor;
  return (
    <EditorModal
      onCancel={close}
      onDelete={id ? deleteMilestone : undefined}
      onSave={save}
      saveLabel={id ? "Update milestone" : "Create milestone"}
      title={id ? "Edit milestone" : "Create milestone"}
      visible={visible}
    >
      {error ? (
        <Callout
          body={error}
          title="Milestone needs attention"
          responsiveStyles={appResponsiveStyles}
        />
      ) : null}
      <ModalField
        label="Title"
        onChangeText={(value) => updateDraft({ title: value })}
        placeholder="Milestone title"
        value={draft.title}
      />
      <DropdownField
        label="Type"
        onChange={(value) => updateDraft({ type: value as EventType })}
        options={EVENT_TYPE_OPTIONS}
        value={draft.type}
      />
      <ModalField
        label="Start date (YYYY-MM-DD)"
        onChangeText={(value) => updateDraft({ startDate: value })}
        placeholder={localTodayDate()}
        value={draft.startDate}
      />
      <ModalField
        label="Start time (HH:mm)"
        onChangeText={(value) => updateDraft({ startTime: value })}
        placeholder="18:00"
        value={draft.startTime}
      />
      <AdvancedOptions>
        <ModalField
          label="End date (optional, YYYY-MM-DD)"
          onChangeText={(value) => updateDraft({ endDate: value })}
          placeholder="2026-04-30"
          value={draft.endDate}
        />
        <ModalField
          label="End time (optional, HH:mm)"
          onChangeText={(value) => updateDraft({ endTime: value })}
          placeholder="20:00"
          value={draft.endTime}
        />
        <ModalField
          label="Description"
          multiline
          onChangeText={(value) => updateDraft({ description: value })}
          placeholder="Milestone details"
          value={draft.description}
        />
        <ModalField
          label="Related subsystem IDs (comma separated)"
          onChangeText={(value) => updateDraft({ relatedSubsystemIdsText: value })}
          placeholder="drive, controls"
          value={draft.relatedSubsystemIdsText}
        />
        <ToggleField
          label="External milestone"
          onToggle={(value) => updateDraft({ isExternal: value })}
          value={draft.isExternal}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
