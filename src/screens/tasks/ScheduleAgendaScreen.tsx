import { ActionButton } from "../../ui/ActionButton";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import {
  EVENT_TYPE_STYLES,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../../ui/constants";
import { formatDateTime } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";
import type { MilestoneSortField } from "../../ui/types";

import type { TaskScreenProps } from "./taskScreenTypes";

type ScheduleAgendaScreenProps = Pick<TaskScreenProps,
  | "appResponsiveStyles" | "filteredMilestones" | "isCompactLayout"
  | "milestoneSearch" | "milestoneSortField" | "milestoneSortOrder"
  | "milestoneSummary" | "milestoneTypeFilter" | "openCreateMilestoneEditor"
  | "openEditMilestoneEditor" | "setMilestoneSearch" | "setMilestoneSortField"
  | "setMilestoneSortOrder" | "setMilestoneTypeFilter" | "projects" | "tasks" | "membersById" | "openEditTaskEditor"
>;

export function ScheduleAgendaScreen(props: ScheduleAgendaScreenProps) {
  const {
    appResponsiveStyles,
    filteredMilestones,
    isCompactLayout,
    milestoneSearch,
    milestoneSortField,
    milestoneSortOrder,
    milestoneSummary,
    milestoneTypeFilter,
    openCreateMilestoneEditor,
    openEditMilestoneEditor,
    setMilestoneSearch,
    setMilestoneSortField,
    setMilestoneSortOrder,
    setMilestoneTypeFilter,
    projects,
    tasks,
    membersById,
  } = props;

  const milestoneTypeOptions = [...new Set(filteredMilestones.map((item) => item.type))].map((type) => ({ id: type, name: type.replaceAll("-", " ") }));
  const today = new Date().toISOString().slice(0, 10);
  const agendaItems = [
    ...filteredMilestones.filter((entry) => entry.startDateTime.slice(0, 10) >= today).map((entry) => ({ kind: "schedule" as const, date: entry.startDateTime, entry })),
    ...tasks.filter((task) => task.dueDate >= today).map((task) => ({ kind: "task-deadline" as const, date: task.dueDate, task })),
  ].sort((left, right) => left.date.localeCompare(right.date));

  const getMilestoneSortIcon = (field: MilestoneSortField) => {
    if (milestoneSortField !== field) {
      return "";
    }

    return milestoneSortOrder === "asc" ? " ^" : " v";
  };

  const toggleMilestoneSort = (field: MilestoneSortField) => {
    if (milestoneSortField === field) {
      setMilestoneSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setMilestoneSortField(field);
    setMilestoneSortOrder("asc");
  };

  return (
    <WorkspacePanel
      title="Schedule agenda"
      subtitle="Upcoming meetings, events, milestones, and Task deadlines across projects."
      actions={
        <ActionButton
          onPress={openCreateMilestoneEditor}
          variant="primary"
          responsiveStyles={appResponsiveStyles}
        >
          Add
        </ActionButton>
      }
    >
      <FilterToolbar>
        <SearchField
          onChangeText={setMilestoneSearch}
          placeholder="Search schedule"
          value={milestoneSearch}
        />

        <OptionChipRow
          allLabel="All types"
          onChange={setMilestoneTypeFilter}
          options={milestoneTypeOptions}
          value={milestoneTypeFilter}
        />

      </FilterToolbar>

      <SummaryRow chips={milestoneSummary} />

      {!isCompactLayout ? (
        <View style={styles.tableHeaderRow}>
          <Pressable
            onPress={() => toggleMilestoneSort("title")}
            style={styles.tableHeaderButtonPrimary}
          >
            <Text
              style={[
                styles.tableHeaderText,
                styles.tableHeaderPrimary,
                appResponsiveStyles.tableHeaderText,
              ]}
            >
              Schedule item{getMilestoneSortIcon("title")}
            </Text>
          </Pressable>
          <Pressable onPress={() => toggleMilestoneSort("type")} style={styles.tableHeaderButton}>
            <Text style={[styles.tableHeaderText, appResponsiveStyles.tableHeaderText]}>Type{getMilestoneSortIcon("type")}</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleMilestoneSort("startDateTime")}
            style={styles.tableHeaderButton}
          >
            <Text style={[styles.tableHeaderText, appResponsiveStyles.tableHeaderText]}>
              Start{getMilestoneSortIcon("startDateTime")}
            </Text>
          </Pressable>
          <Text style={[styles.tableHeaderText, appResponsiveStyles.tableHeaderText]}>End</Text>
          <Text style={[styles.tableHeaderText, appResponsiveStyles.tableHeaderText]}>Projects</Text>
        </View>
      ) : null}

      {agendaItems.map((item) => item.kind === "schedule" ? (() => {
        const entry = item.entry;
        const eventStyle = EVENT_TYPE_STYLES[entry.type] ?? EVENT_TYPE_STYLES["internal-review"];
        const projectNames = entry.projectIds.map((projectId) => projects.find((project) => project.id === projectId)?.name ?? "Unknown project").join(", ");
        const content = <View style={[styles.queueRowCard, { backgroundColor: eventStyle.rowBackground, borderColor: eventStyle.borderColor }, appResponsiveStyles.rowCard]}>
          <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{entry.title}</Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>{entry.recordType} · {entry.type} · {formatDateTime(entry.startDateTime)}{entry.endAt ? ` – ${formatDateTime(entry.endAt)}` : ""}</Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>{projectNames || "All projects"}</Text>
        </View>;
        return entry.recordType === "milestone"
          ? <Pressable key={`${entry.recordType}:${entry.id}`} onPress={() => openEditMilestoneEditor(entry)}>{content}</Pressable>
          : <View key={`${entry.recordType}:${entry.id}`}>{content}</View>;
      })() : (() => {
        const task = item.task;
        const projectName = projects.find((project) => project.id === task.projectId)?.name ?? "Unknown project";
        const ownerName = membersById[task.ownerId ?? ""]?.name ?? "Unassigned";
        return <Pressable key={`task-deadline:${task.id}`} onPress={() => props.openEditTaskEditor(task)} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
          <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{task.title}</Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>Task deadline · {task.dueDate} · {projectName} · {ownerName} · {task.status}{task.isWaitingOnDependency ? " · readiness: waiting on dependency" : task.isBlocked ? " · readiness: blocked" : ""}</Text>
        </Pressable>;
      })())}

      {agendaItems.length === 0 ? <EmptyState text="No upcoming meetings, events, milestones, or Task deadlines match these filters." /> : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.milestones} />
    </WorkspacePanel>
  );
}
