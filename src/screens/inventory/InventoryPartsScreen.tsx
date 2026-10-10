import { ActionButton } from "../../ui/ActionButton";
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
  DropdownField,
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
    subsystems,
    updatePartInstance,
  } = props;
  const { filters, updateFilters, definitions, instances, definitionStatsById, summary } = partsBrowse;

  return (
    <WorkspacePanel
      title="Part manager"
      subtitle="Part definitions describe designs; each PartInstance records one physical unit and its separate readiness."
      actions={
        <ActionButton
          onPress={openCreatePartDefinitionEditor}
          variant="primary"
          responsiveStyles={appResponsiveStyles}
        >
          Add
        </ActionButton>
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
              CAD {partDefinition.cadSource} | Default acquisition {partDefinition.defaultAcquisitionMethod} | Count {stats.count} | Stock {stats.spares}
            </Text>
          </Pressable>
        );
      })}

      <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>Part instances</Text>
      {instances.map(({ partInstance, locationLabel }) => {
        const definition = partDefinitionsById[partInstance.partDefinitionId];
        const locationKind = partInstance.location.kind;
        const nextLocation = (kind: string) => {
          const location = kind === "installed"
            ? { kind: "installed" as const, subsystemId: partInstance.intendedSubsystemId ?? subsystems[0]?.id ?? "", mechanismId: partInstance.intendedMechanismId }
            : kind === "stock" || kind === "repair"
              ? { kind: kind as "stock" | "repair", location: locationKind === kind && (partInstance.location.kind === "stock" || partInstance.location.kind === "repair") ? partInstance.location.location : "Unassigned" }
              : kind === "retired" ? { kind: "retired" as const, location: "Unassigned" }
                : kind === "lost" ? { kind: "lost" as const } : { kind: "unlocated" as const };
          void updatePartInstance(partInstance, { location });
        };

        return (
          <View key={partInstance.id} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{definition?.partNumber ?? partInstance.id}</Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {definition?.name ?? "Unknown definition"} - {locationLabel}
                </Text>
              </View>
              <StatusPill label={`Derived readiness: ${partInstance.readinessStatus ?? "not available"}`} value={partInstance.readinessStatus ?? "neutral"} />
            </View>

            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Physical location
            </Text>
            <DropdownField label="Location state" value={locationKind} options={[{id:"stock",name:"Stock"},{id:"installed",name:"Installed"},{id:"repair",name:"Repair"},{id:"retired",name:"Retired"},{id:"lost",name:"Lost"},{id:"unlocated",name:"Unlocated"}]} onChange={nextLocation} />
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
