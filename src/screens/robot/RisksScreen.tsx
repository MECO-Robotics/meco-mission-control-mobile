import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { ActionButton } from "../../ui/ActionButton";
import { SUBVIEW_INTERACTION_GUIDANCE } from "../../ui/constants";
import { capitalize } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  InteractionNote,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";

import type { AppScreenProps } from "../types";
import type { Risk } from "../../types/domain";
import { RiskEditorModal } from "./RiskEditorModal";

const RISK_PRIORITY_COLUMNS = [
  { label: "High", priority: "high" },
  { label: "Medium", priority: "medium" },
  { label: "Low", priority: "low" },
];

export function RisksScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    isLandscapeCardLayout,
    riskRows,
    risks,
    riskSummary,
    projects,
    responsibleGroups,
    tasks,
    subsystems,
    saveRisk,
    deleteRisk,
    subsystemsById,
    themeColors,
  } = props;
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [creatingRisk, setCreatingRisk] = useState(false);
  const closeEditor = () => { setEditingRisk(null); setCreatingRisk(false); };

  const renderRiskCard = (risk: (typeof riskRows)[number]) => {
    const subsystemName = risk.subsystemId
      ? (subsystemsById[risk.subsystemId]?.name ?? "Unknown subsystem")
      : "Cross-system";
    const priorityLabel = capitalize(risk.priority);

    return (
      <Pressable
        key={risk.id}
        accessibilityRole="button"
        accessibilityLabel={`Edit risk: ${risk.title}`}
        onPress={() => setEditingRisk(risks.find((item) => item.id === risk.id) ?? null)}
        style={[
          styles.queueRowCard,
          appResponsiveStyles.rowCard,
          isLandscapeCardLayout && styles.riskLandscapeItem,
          risk.priority === "high"
            ? styles.riskSeverityHigh
            : risk.priority === "medium"
              ? styles.riskSeverityMedium
              : styles.riskSeverityLow,
        ]}
      >
        <View style={styles.queueRowHeader}>
          <View style={styles.queueRowPrimaryText}>
            <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{risk.title}</Text>
            <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
              {risk.source} - {subsystemName}
            </Text>
          </View>
          <StatusPill
            label={priorityLabel}
            value={
              risk.priority === "high"
                ? "critical"
                : risk.priority === "medium"
                  ? "high"
                  : "low"
            }
          />
        </View>
        <Text
          numberOfLines={isLandscapeCardLayout ? 4 : undefined}
          style={[styles.queueRowBody, appResponsiveStyles.rowBody]}
        >
          {risk.detail}
        </Text>
      </Pressable>
    );
  };

  const riskPriorityColumns = RISK_PRIORITY_COLUMNS.map((column) => ({
    ...column,
    risks: riskRows.filter((risk) => risk.priority === column.priority),
  }));

  return (
    <WorkspacePanel
      title="Risk management"
      subtitle="Track unresolved risks across projects and Robot structure. Readiness and dependency signals are derived from their owning domains."
      actions={<ActionButton onPress={() => setCreatingRisk(true)} variant="primary" responsiveStyles={appResponsiveStyles}>Add risk</ActionButton>}
    >
      <SummaryRow chips={riskSummary} />

      {isLandscapeCardLayout ? (
        <View style={styles.riskLandscapeBoard}>
          {riskPriorityColumns.map((column) => (
            <View
              key={column.priority}
              style={[
                styles.riskLandscapeColumn,
                {
                  backgroundColor: themeColors.canvas,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <View style={styles.riskLandscapeColumnHeader}>
                <View
                  style={[
                    styles.riskPriorityBadge,
                    column.priority === "high"
                      ? styles.riskPriorityBadgeHigh
                      : column.priority === "medium"
                        ? styles.riskPriorityBadgeMedium
                        : styles.riskPriorityBadgeLow,
                  ]}
                >
                  <Text
                    style={[
                      styles.riskPriorityBadgeText,
                      column.priority === "high"
                        ? styles.riskPriorityBadgeTextHigh
                        : column.priority === "medium"
                          ? styles.riskPriorityBadgeTextMedium
                          : styles.riskPriorityBadgeTextLow,
                    ]}
                  >
                    {column.label}
                  </Text>
                </View>
                <View style={[styles.riskColumnCount, { backgroundColor: themeColors.surface }]}>
                  <Text style={[styles.riskColumnCountText, { color: themeColors.navyInk }]}>
                    {column.risks.length}
                  </Text>
                </View>
              </View>

              {column.risks.map(renderRiskCard)}
            </View>
          ))}
        </View>
      ) : (
        riskRows.map(renderRiskCard)
      )}

      {riskRows.length === 0 ? <EmptyState text="No active risks are currently visible." /> : null}
      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.risks} />
      {creatingRisk || editingRisk ? <RiskEditorModal key={editingRisk?.id ?? "new-risk"}
        visible appResponsiveStyles={appResponsiveStyles} risk={editingRisk} projects={projects} groups={responsibleGroups} subsystems={subsystems}
        tasks={tasks} onCancel={closeEditor} onSave={saveRisk} onDelete={deleteRisk} /> : null}
    </WorkspacePanel>
  );
}
