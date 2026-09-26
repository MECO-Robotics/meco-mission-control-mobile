import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { SUBVIEW_INTERACTION_GUIDANCE } from "../../ui/constants";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  SearchField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";

import type { AppScreenProps } from "../types";

export function SubsystemsScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    editTagStyle,
    subsystemBrowse,
    membersById,
    openCreateSubsystemEditor,
    openEditSubsystemEditor,
  } = props;

  const { filters, updateFilters, toggleExpanded, rows, visibleMechanismCount } = subsystemBrowse;

  return (
    <WorkspacePanel
      title="Subsystem manager"
      subtitle="Review ownership, risk, and mechanism coverage with expandable subsystem cards."
      actions={
        <Pressable onPress={openCreateSubsystemEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add subsystem</Text>
        </Pressable>
      }
    >
      <FilterToolbar>
        <SearchField
          onChangeText={(search) => updateFilters({ search })}
          placeholder="Search subsystems"
          value={filters.search}
        />
      </FilterToolbar>

      <SummaryRow
        chips={[
          { label: "Visible subsystems", value: String(rows.length) },
          { label: "Visible mechanisms", value: String(visibleMechanismCount) },
        ]}
      />

      {rows.map(({ subsystem, counts, mechanisms: subsystemMechanisms, isExpanded }) => {
        const mentorNames = subsystem.mentorIds
          .map((mentorId) => membersById[mentorId]?.name ?? "Unknown")
          .join(", ");

        return (
          <View key={subsystem.id} style={[styles.subsystemCard, appResponsiveStyles.rowCard]}>
            <Pressable
              onPress={() => toggleExpanded(subsystem.id)}
              onLongPress={() => openEditSubsystemEditor(subsystem)}
              style={styles.subsystemCardHeader}
            >
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{subsystem.name}</Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  Lead{" "}
                  {subsystem.responsibleEngineerId
                    ? (membersById[subsystem.responsibleEngineerId]?.name ?? "Unassigned")
                    : "Unassigned"}{" "}
                  - Mentors {mentorNames || "None"}
                </Text>
              </View>
              <Text style={editTagStyle}>{isExpanded ? "HIDE" : "OPEN"}</Text>
            </Pressable>

            <Text style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>{subsystem.description}</Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Mechanisms {subsystemMechanisms.length} | Open tasks {counts.openTasks}/{counts.tasks} | Risks {counts.risks}
            </Text>
            <View style={styles.queuePillRow}>
              <StatusPill
                label={
                  counts.health === "good"
                    ? "Healthy"
                    : counts.health === "watch"
                      ? "Watch"
                      : "At risk"
                }
                value={counts.health === "good" ? "complete" : counts.health === "watch" ? "waiting" : "critical"}
              />
              {counts.blockedTasks > 0 ? (
                <StatusPill label={`${counts.blockedTasks} blocked`} value="critical" />
              ) : null}
              {counts.overdueTasks > 0 ? (
                <StatusPill label={`${counts.overdueTasks} overdue`} value="critical" />
              ) : null}
              {counts.waitingQa > 0 ? (
                <StatusPill label={`${counts.waitingQa} QA`} value="waiting" />
              ) : null}
              {counts.qaFindings > 0 ? (
                <StatusPill label={`${counts.qaFindings} QA finding`} value="warning" />
              ) : null}
              {counts.openPurchases > 0 ? (
                <StatusPill label={`${counts.openPurchases} purchase`} value="requested" />
              ) : null}
            </View>

            {subsystem.risks.length > 0 ? (
              <View style={styles.queuePillRow}>
                {subsystem.risks.map((risk) => (
                  <StatusPill key={risk} label={risk} value="warning" />
                ))}
              </View>
            ) : null}

            {isExpanded ? (
              <View style={styles.subsystemExpansion}>
                {subsystemMechanisms.map((mechanism) => (
                  <View key={mechanism.id} style={[styles.mechanismCard, appResponsiveStyles.rowCard]}>
                    <View style={styles.queueRowHeader}>
                      <View style={styles.queueRowPrimaryText}>
                        <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{mechanism.name}</Text>
                        <Text style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>{mechanism.description}</Text>
                      </View>
                      <Text style={editTagStyle}>EDIT</Text>
                    </View>
                  </View>
                ))}

                {subsystemMechanisms.length === 0 ? (
                  <Text style={styles.emptyStateText}>No mechanisms yet.</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {rows.length === 0 ? (
        <EmptyState text="No subsystems match the current search." />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.subsystems} />
    </WorkspacePanel>
  );
}
