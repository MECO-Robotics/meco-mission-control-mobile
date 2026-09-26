import { ActionButton } from "../../ui/ActionButton";
import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import {
  MATERIAL_CATEGORY_OPTIONS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../../ui/constants";
import { capitalize } from "../../ui/helpers";
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

export function InventoryMaterialsScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    materialsBrowse,
    openCreatePurchaseEditor,
    openMaterialRestockEditor,
  } = props;
  const { filters, updateFilters, rows, summary } = materialsBrowse;

  return (
    <WorkspacePanel
      title="Materials manager"
      subtitle="Rollup view for material demand, inferred on-hand stock, and reorder signals."
      actions={
        <ActionButton
          onPress={openCreatePurchaseEditor}
          variant="primary"
          responsiveStyles={appResponsiveStyles}
        >
          Restock
        </ActionButton>
      }
    >
      <FilterToolbar>
        <SearchField
          onChangeText={(value) => updateFilters({ search: value })}
          placeholder="Search materials"
          value={filters.search}
        />

        <OptionChipRow
          allLabel="All categories"
          onChange={(value) => updateFilters({ category: value })}
          options={MATERIAL_CATEGORY_OPTIONS}
          value={filters.category}
        />

        <OptionChipRow
          allLabel="All stock"
          onChange={(value) => updateFilters({ stock: value })}
          options={[
            { id: "ok", name: "Stock OK" },
            { id: "low", name: "Low stock" },
          ]}
          value={filters.stock}
        />
      </FilterToolbar>

      <SummaryRow
        chips={[
          { label: "Visible materials", value: String(rows.length) },
          { label: "Low stock", value: String(summary.lowStockCount) },
          { label: "Restock suggested", value: String(summary.suggestedRestockCount) },
        ]}
      />

      {rows.map((row) => (
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

      {rows.length === 0 ? (
        <EmptyState text="No materials match the current filters." />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.materials} />
    </WorkspacePanel>
  );
}
