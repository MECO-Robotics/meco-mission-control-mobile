import { useState } from "react";

import { Callout } from "../../ui/Callout";
import { DropdownField, EditorModal, ModalField } from "../../ui/ui";
import { ToggleField } from "../../ui/editorFieldWidgets";
import type { Project, ResponsibleGroup, Risk, RiskCategory, RiskMutationPayload, RiskStatus, Subsystem, Task } from "../../types/domain";
import type { ResponsiveScreenStyles } from "../types";

type Props = {
  visible: boolean;
  appResponsiveStyles: ResponsiveScreenStyles;
  risk: Risk | null;
  projects: Project[];
  groups: ResponsibleGroup[];
  subsystems: Subsystem[];
  tasks: Task[];
  onCancel: () => void;
  onSave: (id: string | null, payload: RiskMutationPayload) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

export function RiskEditorModal({ visible, appResponsiveStyles, risk, projects, groups, subsystems, tasks, onCancel, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(risk?.title ?? "");
  const [detail, setDetail] = useState(risk?.detail ?? "");
  const [projectId, setProjectId] = useState(risk?.projectId ?? projects[0]?.id ?? "");
  const [category, setCategory] = useState<RiskCategory>(risk?.category ?? "other");
  const [severity, setSeverity] = useState<Risk["severity"]>(risk?.severity ?? "medium");
  const [status, setStatus] = useState<RiskStatus>(risk?.status ?? "open");
  const [blocksWork, setBlocksWork] = useState(risk?.blocksWork ?? false);
  const [ownerGroupId, setOwnerGroupId] = useState(risk?.ownerGroupId ?? "");
  const [mitigationTaskId, setMitigationTaskId] = useState(risk?.mitigationTaskId ?? "");
  const [subsystemId, setSubsystemId] = useState(risk?.relatedTargets.find((target) => target.kind === "subsystem")?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (title.trim().length < 2 || detail.trim().length < 2 || !projectId) {
      setError("Choose a project and enter a title and detail of at least two characters.");
      return;
    }
    const relatedTargets = (risk?.relatedTargets ?? []).filter((target) => target.kind !== "subsystem");
    if (subsystemId) relatedTargets.push({ kind: "subsystem", id: subsystemId });
    const payload: RiskMutationPayload = {
      projectId, title: title.trim(), detail: detail.trim(), category, severity, status, blocksWork,
      source: risk?.source ?? { kind: "manual" }, relatedTargets,
      mitigationTaskId: mitigationTaskId || null, ownerGroupId: ownerGroupId || null,
    };
    if (await onSave(risk?.id ?? null, payload)) onCancel();
  };
  const remove = async () => {
    if (risk && await onDelete(risk.id)) onCancel();
  };

  return <EditorModal visible={visible} title={risk ? "Edit risk" : "Create risk"}
    saveLabel={risk ? "Update risk" : "Create risk"} onCancel={onCancel} onSave={save}
    onDelete={risk ? remove : undefined}>
    {error ? <Callout title="Risk needs attention" body={error} responsiveStyles={appResponsiveStyles} /> : null}
    <ModalField label="Title" placeholder="Risk title" value={title} onChangeText={setTitle} />
    <ModalField label="Detail" placeholder="Describe the unresolved risk" value={detail} onChangeText={setDetail} multiline />
    <DropdownField label="Project" value={projectId} onChange={setProjectId} options={projects.map((item) => ({ id: item.id, name: item.name }))} />
    <DropdownField label="Category" value={category} onChange={(value) => setCategory(value as RiskCategory)} options={[
      "dependency", "design", "manufacturing", "supply", "schedule", "qa", "inventory", "other",
    ].map((value) => ({ id: value, name: value }))} />
    <DropdownField label="Severity" value={severity} onChange={(value) => setSeverity(value as Risk["severity"])} options={[
      "critical", "high", "medium", "low",
    ].map((value) => ({ id: value, name: value }))} />
    {risk ? <DropdownField label="Status" value={status} onChange={(value) => setStatus(value as RiskStatus)} options={[
      "open", "mitigating", "accepted", "resolved",
    ].map((value) => ({ id: value, name: value }))} /> : null}
    <ToggleField label="Blocks work" value={blocksWork} onToggle={setBlocksWork} />
    <DropdownField label="Subsystem" value={subsystemId} onChange={setSubsystemId} clearLabel="No subsystem" options={subsystems.map((item) => ({ id: item.id, name: item.name }))} />
    <DropdownField label="Owner group" value={ownerGroupId} onChange={setOwnerGroupId} clearLabel="Unassigned" options={groups.filter((item) => !item.isArchived).map((item) => ({ id: item.id, name: item.name }))} />
    <DropdownField label="Mitigation task" value={mitigationTaskId} onChange={setMitigationTaskId} clearLabel="No mitigation task" options={tasks.map((item) => ({ id: item.id, name: item.title }))} />
  </EditorModal>;
}
