import { Pressable, View } from "react-native";
import { Text } from "../../i18n";
import { formatDate } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import { EmptyState, StatusPill, WorkspacePanel } from "../../ui/ui";
import type { AppScreenProps } from "../types";
import type { TaskScreenProps } from "./taskScreenTypes";

type Props = Pick<AppScreenProps, "appResponsiveStyles" | "manufacturingItems" | "openCreateManufacturingEditor" | "openEditManufacturingEditor" | "subsystemsById" | "tasks" | "themeColors" | "workItems"> & Pick<TaskScreenProps, "openCreateTaskEditor" | "openEditTaskEditor">;

export function WorkQueueScreen(props: Props) {
  const { appResponsiveStyles, manufacturingItems, openCreateManufacturingEditor, openCreateTaskEditor, openEditManufacturingEditor, openEditTaskEditor, subsystemsById, tasks, themeColors } = props;
  const rows = props.workItems ?? [];
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const manufacturingById = new Map(manufacturingItems.map((item) => [item.id, item]));
  return <WorkspacePanel title="Work" subtitle="Tasks and manufacturing in one queue, with manufacturing records and workflows kept intact."
    actions={<View style={styles.taskQueueHeaderActions}>
      <Pressable onPress={openCreateTaskEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}><Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add task</Text></Pressable>
      <Pressable onPress={openCreateManufacturingEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}><Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add manufacturing</Text></Pressable>
    </View>}>
    {rows.length === 0 ? <EmptyState text="Add a task or manufacturing item to get started." /> : rows.map((item) => {
      const isManufacturing = item.sourceType === "manufacturing";
      const onPress = () => {
        if (isManufacturing) { const source = manufacturingById.get(item.sourceId); if (source) openEditManufacturingEditor(source); }
        else { const source = taskById.get(item.sourceId); if (source) openEditTaskEditor(source); }
      };
      const metadata = [item.workType, item.responsibleGroup, item.manufacturingProcess, subsystemsById[item.subsystemId]?.name, formatDate(item.dueDate)].filter(Boolean).join(" · ");
      const manufacturingDetails = isManufacturing ? [item.quantity == null ? null : `Qty ${item.quantity}`, item.material, item.partDefinitionId ? `Part ${item.partDefinitionId}` : null, item.batchLabel, item.mentorReviewed ? "Mentor reviewed" : "Mentor review needed"].filter(Boolean).join(" · ") : null;
      return <Pressable key={item.id} onPress={onPress} style={[styles.queueRowCard, appResponsiveStyles.rowCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{item.title}</Text>
          <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>{metadata}</Text>
          {manufacturingDetails ? <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>{manufacturingDetails}</Text> : null}
        </View>
        <StatusPill label="Status" value={item.status} />
      </Pressable>;
    })}
  </WorkspacePanel>;
}
