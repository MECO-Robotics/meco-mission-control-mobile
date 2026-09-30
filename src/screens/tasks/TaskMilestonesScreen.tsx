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

type TaskMilestonesScreenProps = Pick<TaskScreenProps,
  | "appResponsiveStyles" | "filteredMilestones" | "isCompactLayout"
  | "milestoneSearch" | "milestoneSortField" | "milestoneSortOrder"
  | "milestoneSummary" | "milestoneTypeFilter" | "openCreateMilestoneEditor"
  | "openEditMilestoneEditor" | "setMilestoneSearch" | "setMilestoneSortField"
  | "setMilestoneSortOrder" | "setMilestoneTypeFilter" | "projects"
>;

export function TaskMilestonesScreen(props: TaskMilestonesScreenProps) {
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
  } = props;

  const milestoneTypeOptions = [...new Set(filteredMilestones.map((item) => item.type))].map((type) => ({ id: type, name: type.replaceAll("-", " ") }));

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
      title="Schedule"
      subtitle="Meetings, competitions, practices, deadlines, milestones, and reviews across all projects."
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

      {filteredMilestones.map((milestone) => {
        const eventStyle = EVENT_TYPE_STYLES[milestone.type] ?? EVENT_TYPE_STYLES["internal-review"];
        const projectNames = milestone.projectIds
          .map((projectId) => projects.find((project) => project.id === projectId)?.name ?? "Unknown project")
          .join(", ");

        return (
          <Pressable
            key={milestone.id}
            onPress={() => openEditMilestoneEditor(milestone)}
            style={[
              styles.queueRowCard,
              { backgroundColor: eventStyle.rowBackground, borderColor: eventStyle.borderColor },
              appResponsiveStyles.rowCard,
            ]}
          >
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{milestone.title}</Text>
                <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                  {milestone.description || "No description provided."}
                </Text>
              </View>
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: eventStyle.borderColor,
                  backgroundColor: eventStyle.chipBackground,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: eventStyle.chipText, fontSize: 11, fontWeight: "700" }}>
                  {eventStyle.label}
                </Text>
              </View>
            </View>

            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Start {formatDateTime(milestone.startDateTime)} | End{" "}
              {milestone.endAt ? formatDateTime(milestone.endAt) : "No end"}
            </Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              {milestone.recordType} | Projects {projectNames || "All projects"}
            </Text>
          </Pressable>
        );
      })}

      {filteredMilestones.length === 0 ? (
        <EmptyState text="No schedule items match the current filters." />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.milestones} />
    </WorkspacePanel>
  );
}
