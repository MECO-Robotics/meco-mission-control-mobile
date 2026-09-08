import type { useTaskEditor } from "./useTaskEditor";
import { View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "../../ui/constants";
import { isoToday } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import type { Option } from "../../ui/types";
import { AdvancedOptions, DropdownField, EditorModal, ModalField } from "../../ui/ui";
import type {
  Discipline,
  Event,
  Mechanism,
  PartInstance,
  Subsystem,
  TaskPriority,
  TaskStatus,
} from "../../types/domain";
import { EditorCallout } from "../../app/editorModals/EditorCallout";
import { TaskDependenciesField } from "./TaskDependenciesField";

type TaskEditorModalProps = {
  editor: ReturnType<typeof useTaskEditor>;
  appResponsiveStyles: { calloutBody: StyleProp<TextStyle>; calloutBox: StyleProp<ViewStyle>; calloutTitle: StyleProp<TextStyle> };
  disciplineOptions: Option[];
  disciplinesById: Record<string, Discipline | undefined>;
  eventOptions: Option[];
  eventsById: Record<string, Event | undefined>;
  isLandscapeCardLayout: boolean;
  mechanismAndTaskPartOptions: Option[];
  mechanismOptions: Option[];
  mechanisms: Mechanism[];
  mechanismsById: Record<string, Mechanism | undefined>;
  memberOptions: Option[];
  partInstances: PartInstance[];
  partInstancesById: Record<string, PartInstance | undefined>;
  subsystemsById: Record<string, Subsystem | undefined>;
  taskSubsystemOptions: Option[];
  themeColors: AppThemeColors;
};

export function TaskEditorModal({
  editor,
  appResponsiveStyles,
  disciplineOptions,
  disciplinesById,
  eventOptions,
  eventsById,
  isLandscapeCardLayout,
  mechanismAndTaskPartOptions,
  mechanismOptions,
  mechanisms,
  mechanismsById,
  memberOptions,
  partInstances,
  partInstancesById,
  subsystemsById,
  taskSubsystemOptions,
  themeColors,
}: TaskEditorModalProps) {
  const { addTaskDependency, availableTaskDependencyOptions, deleteTaskDraft, downstreamTaskDependencies, removeTaskDependency, selectedTaskDependencies, setTaskDependencySearch, setTaskDraft, taskDependencyReadinessMessage, taskDependencySearch, taskDraft, taskEditorError, taskEditorMode, closeTaskEditor: onCancel, saveTaskDraft: onSave } = editor;

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
        <EditorCallout
          body={taskEditorError}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Task could not be saved"
          titleStyle={appResponsiveStyles.calloutTitle}
        />
      ) : null}
      {taskDependencyReadinessMessage ? (
        <EditorCallout
          body={taskDependencyReadinessMessage}
          bodyStyle={appResponsiveStyles.calloutBody}
          boxStyle={appResponsiveStyles.calloutBox}
          title="Waiting on dependencies"
          titleStyle={appResponsiveStyles.calloutTitle}
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
            onChange={(value) =>
              setTaskDraft((current) => {
                const subsystemId = value;
                const nextMechanisms = mechanisms.filter(
                  (mechanism) => mechanism.subsystemId === subsystemId,
                );
                const mechanismId = nextMechanisms[0]?.id ?? null;
                const partInstanceId = mechanismId
                  ? partInstances.find((partInstance) => partInstance.mechanismId === mechanismId)
                      ?.id ?? null
                  : null;

                return { ...current, subsystemId, mechanismId, partInstanceId };
              })
            }
            options={taskSubsystemOptions}
            placeholder="Select subsystem"
            value={taskDraft.subsystemId}
          />
          <DropdownField
            clearLabel="No discipline"
            label="Discipline"
            onChange={(value) =>
              setTaskDraft((current) => ({ ...current, disciplineId: value }))
            }
            options={disciplineOptions}
            placeholder="Select discipline"
            value={taskDraft.disciplineId}
          />
        </View>

        <View style={[styles.taskEditorStack, isLandscapeCardLayout && styles.taskEditorLandscapeColumn]}>
          <DropdownField
            clearLabel="No mechanism"
            label="Mechanism"
            onChange={(value) =>
              setTaskDraft((current) => {
                const mechanismId = value || null;
                const partInstanceId = mechanismId
                  ? partInstances.find((partInstance) => partInstance.mechanismId === mechanismId)
                      ?.id ?? null
                  : null;

                return { ...current, mechanismId, partInstanceId };
              })
            }
            options={mechanismOptions}
            placeholder="Select mechanism"
            value={taskDraft.mechanismId || ""}
          />
          <DropdownField
            clearLabel="No part instance"
            label="Part instance"
            onChange={(value) =>
              setTaskDraft((current) => ({ ...current, partInstanceId: value || null }))
            }
            options={mechanismAndTaskPartOptions}
            placeholder="Select part instance"
            value={taskDraft.partInstanceId || ""}
          />
          <DropdownField
            clearLabel="No target event"
            label="Target event"
            onChange={(value) =>
              setTaskDraft((current) => ({ ...current, targetEventId: value || null }))
            }
            options={eventOptions}
            placeholder="Select target event"
            value={taskDraft.targetEventId || ""}
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
                {`${subsystemsById[taskDraft.subsystemId]?.name ?? "No subsystem"} / `}
                {`${disciplinesById[taskDraft.disciplineId]?.name ?? "No discipline"} / `}
                {`${taskDraft.mechanismId ? mechanismsById[taskDraft.mechanismId]?.name : "No mechanism"} / `}
                {`${taskDraft.partInstanceId ? partInstancesById[taskDraft.partInstanceId]?.name : "No part instance"} / `}
                {`${taskDraft.targetEventId ? eventsById[taskDraft.targetEventId]?.title : "No event"}`}
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
            <ModalField
              label="Blockers (comma separated)"
              onChangeText={(value) =>
                setTaskDraft((current) => ({ ...current, blockersText: value }))
              }
              placeholder="Waiting on batch, cable routing"
              value={taskDraft.blockersText}
            />
          </AdvancedOptions>
        </View>
      </View>
    </EditorModal>
  );
}
