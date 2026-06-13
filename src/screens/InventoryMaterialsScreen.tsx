import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import {
  MATERIAL_CATEGORY_OPTIONS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../ui/constants";
import { capitalize } from "../ui/helpers";
import { styles } from "../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";

import type { AppScreenProps } from "./types";

export function InventoryMaterialsScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    filteredMaterialRollups,
    openCreatePurchaseEditor,
    materialsCategoryFilter,
    materialsSearch,
    materialsStockFilter,
    openMaterialRestockEditor,
    setMaterialsCategoryFilter,
    setMaterialsSearch,
    setMaterialsStockFilter,
  } = props;

  const materialSummary = filteredMaterialRollups.reduce(
    (summary, row) => ({
      lowStockCount: summary.lowStockCount + (row.stock === "low" ? 1 : 0),
      suggestedRestockCount:
        summary.suggestedRestockCount + (row.suggestedOrderQuantity > 0 ? 1 : 0),
    }),
    { lowStockCount: 0, suggestedRestockCount: 0 },
  );

  return (
    <WorkspacePanel
      title="Materials manager"
      subtitle="Rollup view for material demand, inferred on-hand stock, and reorder signals."
      actions={
        <Pressable onPress={openCreatePurchaseEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Restock</Text>
        </Pressable>
      }
    >
      <FilterToolbar>
        <SearchField
          onChangeText={setMaterialsSearch}
          placeholder="Search materials"
          value={materialsSearch}
        />

        <OptionChipRow
          allLabel="All categories"
          onChange={setMaterialsCategoryFilter}
          options={MATERIAL_CATEGORY_OPTIONS}
          value={materialsCategoryFilter}
        />

        <OptionChipRow
          allLabel="All stock"
          onChange={setMaterialsStockFilter}
          options={[
            { id: "ok", name: "Stock OK" },
            { id: "low", name: "Low stock" },
          ]}
          value={materialsStockFilter}
        />
      </FilterToolbar>

      <SummaryRow
        chips={[
          { label: "Visible materials", value: String(filteredMaterialRollups.length) },
          { label: "Low stock", value: String(materialSummary.lowStockCount) },
          { label: "Restock suggested", value: String(materialSummary.suggestedRestockCount) },
        ]}
      />

      {filteredMaterialRollups.map((row) => (
        <View key={row.id} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
          <View style={styles.queueRowHeader}>
            <View style={styles.queueRowPrimaryText}>
              <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{row.name}</Text>
              <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                {capitalize(row.category)} - vendor {row.vendor}
              </Text>
            </View>
            <Pressable
              onPress={() => openMaterialRestockEditor(row)}
              style={[
                styles.quickActionButton,
                appResponsiveStyles.quickActionButton,
                styles.quickActionButtonPrimary,
              ]}
            >
              <Text style={styles.quickActionButtonPrimaryLabel}>Restock</Text>
            </Pressable>
          </View>

          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            On hand {row.onHand} | Reorder {row.reorderPoint} | Open demand {row.openDemand}
          </Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            Open purchases {row.openPurchaseQuantity} across {row.openPurchaseCount} request{row.openPurchaseCount === 1 ? "" : "s"} | Suggested restock {row.suggestedOrderQuantity}
          </Text>

          <View style={styles.queuePillRow}>
            <StatusPill
              label={row.stock === "low" ? "Low stock" : "Stock OK"}
              value={row.stock === "low" ? "critical" : "complete"}
            />
            {row.suggestedOrderQuantity > 0 ? (
              <StatusPill label={`Order ${row.suggestedOrderQuantity}`} value="requested" />
            ) : null}
          </View>
        </View>
      ))}

      {filteredMaterialRollups.length === 0 ? (
        <EmptyState text="No materials match the current filters." />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.materials} />
    </WorkspacePanel>
  );
}
