import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { STATUS_LABELS } from "../../ui/constants";
import { formatDate } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import { SearchField } from "../../ui/selectionWidgets";
import type { Subsystem, Task } from "../../types/domain";

type TaskDependenciesFieldProps = {
  addTaskDependency: (dependencyId: string) => void;
  availableTaskDependencyOptions: Task[];
  downstreamTaskDependencies: Task[];
  removeTaskDependency: (dependencyId: string) => void;
  selectedTaskDependencies: Task[];
  setTaskDependencySearch: (value: string) => void;
  subsystemsById: Record<string, Subsystem | undefined>;
  taskDependencySearch: string;
  themeColors: AppThemeColors;
};

function DependencyMeta({
  showRemove,
  subsystemsById,
  task,
  themeColors,
}: {
  showRemove?: boolean;
  subsystemsById: Record<string, Subsystem | undefined>;
  task: Task;
  themeColors: AppThemeColors;
}) {
  return (
    <Text
      numberOfLines={2}
      style={{ color: themeColors.subtleText, fontSize: 11, fontWeight: "700" }}
    >
      {`${STATUS_LABELS[task.status]} | due ${formatDate(task.dueDate)} | ${subsystemsById[task.subsystemId]?.name ?? "No subsystem"}${showRemove ? " | remove" : ""}`}
    </Text>
  );
}

function DependencyChip({
  onPress,
  subsystemsById,
  task,
  themeColors,
  variant,
}: {
  onPress?: () => void;
  subsystemsById: Record<string, Subsystem | undefined>;
  task: Task;
  themeColors: AppThemeColors;
  variant: "selected" | "available" | "downstream";
}) {
  const Chip = onPress ? Pressable : View;
  const selected = variant === "selected";
  const downstream = variant === "downstream";
  return (
    <Chip
      {...(onPress ? { onPress } : {})}
      style={[styles.quickActionButton, {
        alignItems: "flex-start",
        backgroundColor: selected || downstream ? (selected ? themeColors.navySurface : themeColors.canvas) : themeColors.surface,
        borderColor: selected ? themeColors.navySurface : themeColors.border,
        gap: 2,
        maxWidth: "100%",
      }]}
    >
      <Text numberOfLines={2} style={[styles.quickActionButtonLabel, { color: selected ? themeColors.navyInk : themeColors.ink }]}>
        {task.title}
      </Text>
      <DependencyMeta showRemove={selected} subsystemsById={subsystemsById} task={task} themeColors={themeColors} />
    </Chip>
  );
}

export function TaskDependenciesField({
  addTaskDependency,
  availableTaskDependencyOptions,
  downstreamTaskDependencies,
  removeTaskDependency,
  selectedTaskDependencies,
  setTaskDependencySearch,
  subsystemsById,
  taskDependencySearch,
  themeColors,
}: TaskDependenciesFieldProps) {
  return (
    <View style={styles.modalField}>
      <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>
        Dependencies
      </Text>
      <View
        style={[
          styles.modalFieldInput,
          { backgroundColor: themeColors.canvas, borderColor: themeColors.border },
        ]}
      >
        {selectedTaskDependencies.length > 0 ? (
          <View style={styles.quickActionRow}>
            {selectedTaskDependencies.map((dependency) => (
              <DependencyChip
                key={dependency.id}
                onPress={() => removeTaskDependency(dependency.id)}
                subsystemsById={subsystemsById}
                task={dependency}
                themeColors={themeColors}
                variant="selected"
              />
            ))}
          </View>
        ) : (
          <Text style={{ color: themeColors.subtleText }}>No dependencies selected</Text>
        )}
      </View>
      {downstreamTaskDependencies.length > 0 ? (
        <View
          style={[
            styles.modalFieldInput,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
        >
          <Text
            style={[
              styles.quickActionButtonLabel,
              { color: themeColors.ink, marginBottom: 6 },
            ]}
          >
            Waiting on this task
          </Text>
          <View style={styles.quickActionRow}>
            {downstreamTaskDependencies.map((dependentTask) => (
              <DependencyChip key={dependentTask.id} subsystemsById={subsystemsById} task={dependentTask} themeColors={themeColors} variant="downstream" />
            ))}
          </View>
        </View>
      ) : null}
      <SearchField
        onChangeText={setTaskDependencySearch}
        placeholder="Search dependency tasks"
        value={taskDependencySearch}
      />
      {availableTaskDependencyOptions.length > 0 ? (
        <View style={styles.quickActionRow}>
            {availableTaskDependencyOptions.map((dependency) => (
              <DependencyChip key={dependency.id} onPress={() => addTaskDependency(dependency.id)} subsystemsById={subsystemsById} task={dependency} themeColors={themeColors} variant="available" />
            ))}
        </View>
      ) : null}
    </View>
  );
}
