import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import {
  PART_STATUS_OPTIONS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../../ui/constants";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";

import type { AppScreenProps } from "../types";

export function InventoryPartsScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    partsBrowse,
    editTagStyle,
    openCreatePartDefinitionEditor,
    openEditPartDefinitionEditor,
    partDefinitionsById,
    mechanismsById,
    subsystems,
    subsystemsById,
  } = props;
  const { filters, updateFilters, definitions, instances, definitionStatsById, summary } = partsBrowse;

  return (
    <WorkspacePanel
      title="Part manager"
      subtitle="Definition catalog on top with subsystem part instances and lifecycle state below."
      actions={
        <Pressable onPress={openCreatePartDefinitionEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add</Text>
        </Pressable>
      }
    >
      <FilterToolbar>
        <SearchField
          onChangeText={(value) => updateFilters({ search: value })}
          placeholder="Search parts"
          value={filters.search}
        />

        <OptionChipRow
          allLabel="All subsystems"
          onChange={(value) => updateFilters({ subsystemId: value })}
          options={subsystems.map((subsystem) => ({
            id: subsystem.id,
            name: subsystem.name,
          }))}
          value={filters.subsystemId}
        />

        <OptionChipRow
          allLabel="All statuses"
          onChange={(value) => updateFilters({ status: value })}
          options={PART_STATUS_OPTIONS}
          value={filters.status}
        />
      </FilterToolbar>

      <SummaryRow
        chips={[
          { label: "Definitions", value: String(definitions.length) },
          { label: "Instances", value: String(summary.instanceCount) },
          { label: "Spares", value: String(summary.spareCount) },
        ]}
      />

      <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>Part definitions</Text>
      {definitions.map((partDefinition) => {
        const stats = definitionStatsById[partDefinition.id] ?? {
          count: 0,
          spares: 0,
        };

        return (
          <Pressable
            key={partDefinition.id}
            onPress={() => openEditPartDefinitionEditor(partDefinition.id)}
            style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{partDefinition.name}</Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {partDefinition.partNumber} - rev {partDefinition.revision}
                </Text>
              </View>
              <Text style={editTagStyle}>EDIT</Text>
            </View>

            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Source {partDefinition.source} | Count {stats.count} | Spares {stats.spares}
            </Text>
          </Pressable>
        );
      })}

      <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>Part instances</Text>
      {instances.map(({ partInstance, status }) => {
        const definition = partDefinitionsById[partInstance.partDefinitionId];
        const mechanismName = partInstance.mechanismId
          ? (mechanismsById[partInstance.mechanismId]?.name ?? "Unknown mechanism")
          : "Unassigned";
        const subsystemName = subsystemsById[partInstance.subsystemId]?.name ?? "Unknown";

        return (
          <View key={partInstance.id} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{partInstance.name}</Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {definition?.name ?? "Unknown definition"} - {subsystemName}
                </Text>
              </View>
              <StatusPill label={status} value={status} />
            </View>

            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Mechanism {mechanismName} | Qty {partInstance.quantity}
            </Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Tracking {partInstance.trackIndividually ? "Individual" : "Bulk"}
            </Text>
          </View>
        );
      })}

      {definitions.length === 0 && instances.length === 0 ? (
        <EmptyState text="No parts match the current filters." />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.parts} />
    </WorkspacePanel>
  );
}
