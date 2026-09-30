import { Callout } from "../../ui/Callout";
import { useState } from "react";
import type { useTaskEditor } from "./useTaskEditor";
import { View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "../../ui/constants";
import { isoToday } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import type { Option } from "../../ui/types";
import { AdvancedOptions, EditorModal } from "../../ui/editorWidgets";
import { ModalField } from "../../ui/editorFieldWidgets";
import { DropdownField } from "../../ui/selectionFieldWidgets";
import type {
  Mechanism,
  PartInstance,
  PartDefinition,
  Project,
  ManufacturingProcess,
  Material,
  Subsystem,
  TaskPriority,
  TaskStatus,
} from "../../types/domain";
import { TaskDependenciesField } from "./TaskDependenciesField";
import type { TaskDependencyDraft } from "./taskDraft";

type TaskEditorModalProps = {
  editor: ReturnType<typeof useTaskEditor>;
  appResponsiveStyles: { calloutBody: StyleProp<TextStyle>; calloutBox: StyleProp<ViewStyle>; calloutTitle: StyleProp<TextStyle> };
  projectOptions: Option[];
  projectsById: Record<string, Project | undefined>;
  workTypeOptions: Option[];
  workTypesById: Record<string, import("../../types/domain").WorkType | undefined>;
  responsibleGroupOptions: Option[];
  scheduleOptions: Option[];
  scheduleNamesByRef: Record<string, string | undefined>;
  manufacturingProcesses: ManufacturingProcess[];
  materials: Material[];
  isLandscapeCardLayout: boolean;
  mechanisms: Mechanism[];
  mechanismsById: Record<string, Mechanism | undefined>;
  memberOptions: Option[];
  partInstances: PartInstance[];
  partDefinitionsById: Record<string, PartDefinition | undefined>;
  partInstancesById: Record<string, PartInstance | undefined>;
  subsystemsById: Record<string, Subsystem | undefined>;
  taskSubsystemOptions: Option[];
  themeColors: AppThemeColors;
};

export function TaskEditorModal({
  editor,
  appResponsiveStyles,
  projectOptions,
  projectsById,
  workTypeOptions,
  workTypesById,
  responsibleGroupOptions,
  scheduleOptions,
  scheduleNamesByRef,
  manufacturingProcesses,
  materials,
  isLandscapeCardLayout,
  mechanisms,
  mechanismsById,
  memberOptions,
  partInstances,
  partInstancesById,
  partDefinitionsById,
  subsystemsById,
  taskSubsystemOptions,
  themeColors,
}: TaskEditorModalProps) {
  const [partDependencyId, setPartDependencyId] = useState("");
  const { selectSubsystem, selectMechanism, selectPart, addTaskDependency, availableTaskDependencyOptions, deleteTaskDraft, downstreamTaskDependencies, removeTaskDependency, selectedTaskDependencies, setTaskDependencySearch, setTaskDraft, taskDependencyReadinessMessage, taskDependencySearch, taskDraft, taskEditorError, taskEditorMode, closeTaskEditor: onCancel, saveTaskDraft: onSave } = editor;

  const mechanismOptions = mechanisms
    .filter((mechanism) => mechanism.subsystemId === taskDraft.subsystemIds[0])
    .map(({ id, name }) => ({ id, name }));
  const mechanismAndTaskPartOptions = taskDraft.mechanismIds[0]
    ? partInstances
        .filter((part) => part.intendedMechanismId === taskDraft.mechanismIds[0] || (part.location.kind === "installed" && part.location.mechanismId === taskDraft.mechanismIds[0]))
        .map((part) => ({
          id: part.id,
          name: `${partDefinitionsById[part.partDefinitionId]?.name ?? "Part"} ${partDefinitionsById[part.partDefinitionId]?.revision ?? ""}`,
        }))
    : [];

  return (
    <EditorModal
      onCancel={onCancel}
      onDelete={taskEditorMode === "edit" ? deleteTaskDraft : undefined}
      onSave={onSave}
      saveLabel={taskEditorMode === "edit" ? "Update task" : "Create task"}
      title={taskEditorMode === "edit" ? "Edit task" : "Create task"}
      visible={Boolean(taskEditorMode)}
    >
      {taskEditorError ? (
        <Callout
          body={taskEditorError}
          title="Task could not be saved"
          responsiveStyles={appResponsiveStyles}
        />
      ) : null}
      {taskDependencyReadinessMessage ? (
        <Callout
          body={taskDependencyReadinessMessage}
          title="Waiting on dependencies"
          responsiveStyles={appResponsiveStyles}
        />
      ) : null}
      <View style={isLandscapeCardLayout ? styles.taskEditorLandscapeGrid : styles.taskEditorStack}>
        <View style={[styles.taskEditorStack, isLandscapeCardLayout && styles.taskEditorLandscapeColumn]}>
          <ModalField
            label="Title"
            onChangeText={(value) => setTaskDraft((current) => ({ ...current, title: value }))}
            placeholder="Task title"
            value={taskDraft.title}
          />
          <ModalField
            label="Summary"
            multiline
            onChangeText={(value) => setTaskDraft((current) => ({ ...current, summary: value }))}
            placeholder="Task summary"
            value={taskDraft.summary}
          />
          <ModalField
            label="Start date (YYYY-MM-DD)"
            onChangeText={(value) => setTaskDraft((current) => ({ ...current, startDate: value }))}
            placeholder={isoToday()}
            value={taskDraft.startDate}
          />
          <ModalField
            label="End date required (YYYY-MM-DD)"
            onChangeText={(value) => setTaskDraft((current) => ({ ...current, dueDate: value }))}
            placeholder="2026-04-24"
            value={taskDraft.dueDate}
          />
          <DropdownField
            clearLabel="No subsystem"
            label="Subsystem"
            onChange={selectSubsystem}
            options={taskSubsystemOptions}
            placeholder="Select subsystem"
            value={taskDraft.subsystemIds[0] ?? ""}
          />
          <DropdownField label="Project" onChange={(projectId) => {
            const project = projectsById[projectId];
            const workTypeId = workTypesById[taskDraft.workTypeId]?.projectType === project?.projectType ? taskDraft.workTypeId : "";
            setTaskDraft((current) => ({ ...current, projectId, workTypeId }));
          }} options={projectOptions} value={taskDraft.projectId} />
          <DropdownField
            label="Work type"
            onChange={(value) =>
              setTaskDraft((current) => ({ ...current, workTypeId: value }))
            }
            options={workTypeOptions}
            placeholder="Select work type"
            value={taskDraft.workTypeId}
          />
          <DropdownField
            clearLabel="Unassigned group"
            label="Responsible group"
            onChange={(value) => setTaskDraft((current) => ({ ...current, responsibleGroupId: value }))}
            options={responsibleGroupOptions}
            value={taskDraft.responsibleGroupId}
          />
        </View>

        <View style={[styles.taskEditorStack, isLandscapeCardLayout && styles.taskEditorLandscapeColumn]}>
          <DropdownField
            clearLabel="No mechanism"
            label="Mechanism"
            onChange={selectMechanism}
            options={mechanismOptions}
            placeholder="Select mechanism"
            value={taskDraft.mechanismIds[0] || ""}
          />
          <DropdownField
            clearLabel="No part instance"
            label="Part instance"
            onChange={selectPart}
            options={mechanismAndTaskPartOptions}
            placeholder="Select part instance"
            value={taskDraft.partInstanceIds[0] || ""}
          />
          <DropdownField
            clearLabel="No schedule link"
            label="Schedule link"
            onChange={(value) => setTaskDraft((current) => ({ ...current, scheduleRefs: value ? [{ kind: value.slice(0, value.indexOf(":")) as "meeting" | "event" | "milestone", id: value.slice(value.indexOf(":") + 1) }] : [] }))}
            options={scheduleOptions}
            placeholder="Select schedule record"
            value={taskDraft.scheduleRefs[0] ? `${taskDraft.scheduleRefs[0].kind}:${taskDraft.scheduleRefs[0].id}` : ""}
          />
          <DropdownField
            clearLabel="No owner"
            label="Owner"
            onChange={(value) => setTaskDraft((current) => ({ ...current, ownerId: value }))}
            options={memberOptions}
            placeholder="Select owner"
            value={taskDraft.ownerId}
          />
          <DropdownField
            clearLabel="No mentor"
            label="Mentor"
            onChange={(value) => setTaskDraft((current) => ({ ...current, mentorId: value }))}
            options={memberOptions}
            placeholder="Select mentor"
            value={taskDraft.mentorId}
          />
          <DropdownField
            label="Status"
            onChange={(value) =>
              setTaskDraft((current) => ({ ...current, status: value as TaskStatus }))
            }
            options={TASK_STATUS_OPTIONS}
            value={taskDraft.status}
          />
          <DropdownField
            label="Priority"
            onChange={(value) =>
              setTaskDraft((current) => ({ ...current, priority: value as TaskPriority }))
            }
            options={TASK_PRIORITY_OPTIONS}
            value={taskDraft.priority}
          />
          <AdvancedOptions>
            <View style={styles.modalField}>
              <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>
                Traceability
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
                {`${subsystemsById[taskDraft.subsystemIds[0]]?.name ?? "No subsystem"} / `}
                {`${workTypesById[taskDraft.workTypeId]?.name ?? "No work type"} / `}
                {`${taskDraft.mechanismIds[0] ? mechanismsById[taskDraft.mechanismIds[0]]?.name : "No mechanism"} / `}
                {`${taskDraft.partInstanceIds[0] ? partDefinitionsById[partInstancesById[taskDraft.partInstanceIds[0]]?.partDefinitionId ?? ""]?.name : "No part instance"} / `}
                {`${taskDraft.scheduleRefs[0] ? scheduleNamesByRef[`${taskDraft.scheduleRefs[0].kind}:${taskDraft.scheduleRefs[0].id}`] : "No schedule link"}`}
              </Text>
            </View>
            <ModalField
              label="Estimated hours"
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setTaskDraft((current) => ({ ...current, estimatedHours: value }))
              }
              placeholder="4"
              value={taskDraft.estimatedHours}
            />

            <ModalField
              label="Checklist / substeps (comma separated)"
              multiline
              onChangeText={(value) =>
                setTaskDraft((current) => ({ ...current, checklistItemsText: value }))
              }
              placeholder="Cut bracket, Deburr, Test fit, Add photo evidence"
              value={taskDraft.checklistItemsText}
            />
            <TaskDependenciesField
              addTaskDependency={addTaskDependency}
              availableTaskDependencyOptions={availableTaskDependencyOptions}
              downstreamTaskDependencies={downstreamTaskDependencies}
              removeTaskDependency={removeTaskDependency}
              selectedTaskDependencies={selectedTaskDependencies}
              setTaskDependencySearch={setTaskDependencySearch}
              subsystemsById={subsystemsById}
              taskDependencySearch={taskDependencySearch}
              themeColors={themeColors}
            />
            <DropdownField label="Milestone dependency" value="" placeholder="Select milestone" options={scheduleOptions.filter((option) => option.id.startsWith("milestone:"))} onChange={(value) => {
              const refId = value.slice("milestone:".length);
              if (!refId) return;
              const edge: TaskDependencyDraft = { kind: "milestone", refId, dependencyType: "hard", requiredState: "ready" };
              setTaskDraft((current) => current.dependencies.some((item) => item.kind === edge.kind && item.refId === edge.refId) ? current : { ...current, dependencies: [...current.dependencies, edge] });
            }} />
            <DropdownField label="Part instance dependency" value={partDependencyId} onChange={setPartDependencyId}
              options={partInstances.map((part) => ({ id: part.id, name: `${partDefinitionsById[part.partDefinitionId]?.partNumber ?? part.id} · ${part.location.kind}` }))} />
            <DropdownField label="Required physical location" value="" placeholder="Select location state" options={["stock", "installed", "repair", "retired", "lost", "unlocated"].map((value) => ({ id: value, name: value }))} onChange={(value) => {
                if (!partDependencyId) return;
                const edge: TaskDependencyDraft = { kind: "part-instance", refId: partDependencyId, dependencyType: "hard", requiredCondition: { kind: "physical-location", value: value as "stock" | "installed" | "repair" | "retired" | "lost" | "unlocated" } };
                setTaskDraft((current) => current.dependencies.some((item) => item.kind === edge.kind && item.refId === edge.refId) ? current : { ...current, dependencies: [...current.dependencies, edge] });
              }} />
            <DropdownField label="Required derived readiness" value="" placeholder="Select readiness state" options={["not-ready", "blocked", "qa", "ready"].map((value) => ({ id: value, name: value }))} onChange={(value) => {
                if (!partDependencyId) return;
                const edge: TaskDependencyDraft = { kind: "part-instance", refId: partDependencyId, dependencyType: "hard", requiredCondition: { kind: "derived-readiness", value: value as "not-ready" | "blocked" | "qa" | "ready" } };
                setTaskDraft((current) => current.dependencies.some((item) => item.kind === edge.kind && item.refId === edge.refId) ? current : { ...current, dependencies: [...current.dependencies, edge] });
              }} />
            {taskDraft.dependencies.filter((edge) => edge.kind !== "task").map((edge) => <Text key={`${edge.kind}:${edge.refId}`} style={styles.queueMetaLine}>{edge.kind}: {edge.refId}{edge.kind === "part-instance" ? ` · ${edge.requiredCondition.kind}: ${edge.requiredCondition.value}` : ` · ${edge.requiredState}`}</Text>)}
            {workTypesById[taskDraft.workTypeId]?.code === "manufacturing" ? <>
              <DropdownField label="Process" onChange={(processId) => setTaskDraft((current) => ({ ...current, manufacturingDetails: { ...(current.manufacturingDetails ?? { part: { kind: "provisional", partNumber: "", revision: "" }, quantity: 1, processId, fulfillmentSource: "in-house", material: { kind: "specified-material", name: "" }, fileArtifactIds: [], tolerances: [], qaRequirements: [] }), processId } }))}
                options={manufacturingProcesses.map((item) => ({ id: item.id, name: item.name }))} value={taskDraft.manufacturingDetails?.processId ?? ""} />
              <DropdownField label="Fulfillment source" onChange={(value) => setTaskDraft((current) => ({ ...current, manufacturingDetails: current.manufacturingDetails ? { ...current.manufacturingDetails, fulfillmentSource: value as "in-house" | "outsourced" } : null }))}
                options={[{ id: "in-house", name: "In-house" }, { id: "outsourced", name: "Outsourced" }]} value={taskDraft.manufacturingDetails?.fulfillmentSource ?? "in-house"} />
              <DropdownField label="Material" onChange={(value) => setTaskDraft((current) => ({ ...current, manufacturingDetails: current.manufacturingDetails ? { ...current.manufacturingDetails, material: value ? { kind: "inventory-material", materialId: value } : { kind: "specified-material", name: "" } } : null }))}
                options={materials.map((item) => ({ id: item.id, name: item.name }))} value={taskDraft.manufacturingDetails?.material.kind === "inventory-material" ? taskDraft.manufacturingDetails.material.materialId : ""} />
              <ModalField label="Manufacturing quantity" keyboardType="number-pad" placeholder="1" value={String(taskDraft.manufacturingDetails?.quantity ?? 1)} onChangeText={(value) => setTaskDraft((current) => ({ ...current, manufacturingDetails: current.manufacturingDetails ? { ...current.manufacturingDetails, quantity: Math.max(1, Number(value) || 1) } : null }))} />
              <ModalField label="Tolerances (comma separated)" placeholder="±0.2 mm" value={taskDraft.manufacturingDetails?.tolerances.join(", ") ?? ""} onChangeText={(value) => setTaskDraft((current) => ({ ...current, manufacturingDetails: current.manufacturingDetails ? { ...current.manufacturingDetails, tolerances: value.split(",").map((item) => item.trim()).filter(Boolean) } : null }))} />
              <ModalField label="QA requirements (comma separated)" placeholder="Deburr, dimension check" value={taskDraft.manufacturingDetails?.qaRequirements.join(", ") ?? ""} onChangeText={(value) => setTaskDraft((current) => ({ ...current, manufacturingDetails: current.manufacturingDetails ? { ...current.manufacturingDetails, qaRequirements: value.split(",").map((item) => item.trim()).filter(Boolean) } : null }))} />
            </> : null}
          </AdvancedOptions>
        </View>
      </View>
    </EditorModal>
  );
}
