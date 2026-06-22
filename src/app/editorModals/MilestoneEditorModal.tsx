import type { Dispatch, SetStateAction } from "react";

import { EVENT_TYPE_OPTIONS } from "../../ui/constants";
import { localTodayDate } from "../../ui/helpers";
import type { EditorMode, MilestoneDraft } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField, ToggleField } from "../../ui/ui";
import type { EventType } from "../../types/domain";
import type { WorkspaceResponsiveStyles } from "../components/WorkspaceShell";
import { EditorCallout } from "./EditorCallout";

type MilestoneEditorModalProps = {
  appResponsiveStyles: Pick<WorkspaceResponsiveStyles, "calloutBody" | "calloutBox" | "calloutTitle">;
  deleteMilestoneDraft: () => void;
  milestoneDraft: MilestoneDraft;
  milestoneEditorMode: EditorMode | null;
  milestoneEndDate: string;
  milestoneEndTime: string;
  milestoneError: string | null;
  milestoneStartDate: string;
  milestoneStartTime: string;
  onCancel: () => void;
  onSave: () => void;
  setMilestoneDraft: Dispatch<SetStateAction<MilestoneDraft>>;
  setMilestoneEndDate: (value: string) => void;
  setMilestoneEndTime: (value: string) => void;
  setMilestoneError: (value: string | null) => void;
  setMilestoneStartDate: (value: string) => void;
  setMilestoneStartTime: (value: string) => void;
};

export function MilestoneEditorModal({
  appResponsiveStyles,
  deleteMilestoneDraft,
  milestoneDraft,
  milestoneEditorMode,
  milestoneEndDate,
  milestoneEndTime,
  milestoneError,
  milestoneStartDate,
  milestoneStartTime,
  onCancel,
  onSave,
  setMilestoneDraft,
  setMilestoneEndDate,
  setMilestoneEndTime,
  setMilestoneError,
  setMilestoneStartDate,
  setMilestoneStartTime,
}: MilestoneEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={milestoneEditorMode === "edit" ? deleteMilestoneDraft : undefined}
      onSave={onSave}
      saveLabel={milestoneEditorMode === "edit" ? "Update milestone" : "Create milestone"}
      title={milestoneEditorMode === "edit" ? "Edit milestone" : "Create milestone"}
      visible={Boolean(milestoneEditorMode)}
    >
      {milestoneError ? (
        <EditorCallout
          body={milestoneError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Missing milestone details"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      <ModalField
        label="Title"
        onChangeText={(value) => {
          setMilestoneError(null);
          setMilestoneDraft((current) => ({ ...current, title: value }));
        }}
        placeholder="Milestone title"
        value={milestoneDraft.title}
      />
      <DropdownField
        label="Type"
        onChange={(value) => {
          setMilestoneError(null);
          setMilestoneDraft((current) => ({ ...current, type: value as EventType }));
        }}
        options={EVENT_TYPE_OPTIONS}
        value={milestoneDraft.type}
      />
      <ModalField
        label="Start date (YYYY-MM-DD)"
        onChangeText={(value) => {
          setMilestoneError(null);
          setMilestoneStartDate(value);
        }}
        placeholder={localTodayDate()}
        value={milestoneStartDate}
      />
      <ModalField
        label="Start time (HH:mm)"
        onChangeText={(value) => {
          setMilestoneError(null);
          setMilestoneStartTime(value);
        }}
        placeholder="18:00"
        value={milestoneStartTime}
      />
      <AdvancedOptions>
        <ModalField
          label="End date (optional, YYYY-MM-DD)"
          onChangeText={(value) => {
            setMilestoneError(null);
            setMilestoneEndDate(value);
          }}
          placeholder="2026-04-30"
          value={milestoneEndDate}
        />
        <ModalField
          label="End time (optional, HH:mm)"
          onChangeText={(value) => {
            setMilestoneError(null);
            setMilestoneEndTime(value);
          }}
          placeholder="20:00"
          value={milestoneEndTime}
        />
        <ModalField
          label="Description"
          multiline
          onChangeText={(value) => {
            setMilestoneError(null);
            setMilestoneDraft((current) => ({ ...current, description: value }));
          }}
          placeholder="Milestone details"
          value={milestoneDraft.description}
        />
        <ModalField
          label="Related subsystem IDs (comma separated)"
          onChangeText={(value) => {
            setMilestoneError(null);
            setMilestoneDraft((current) => ({ ...current, relatedSubsystemIdsText: value }));
          }}
          placeholder="drive, controls"
          value={milestoneDraft.relatedSubsystemIdsText}
        />
        <ToggleField
          label="External milestone"
          onToggle={(value) => {
            setMilestoneError(null);
            setMilestoneDraft((current) => ({ ...current, isExternal: value }));
          }}
          value={milestoneDraft.isExternal}
        />
      </AdvancedOptions>
    </EditorModal>
  );
}
