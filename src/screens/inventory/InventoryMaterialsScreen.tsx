import { useState } from "react";
import * as Crypto from "expo-crypto";
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
  DropdownField,
  EditorModal,
  FilterToolbar,
  InteractionNote,
  ModalField,
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
    materialTransactions,
    projects,
    tasks,
    mutate,
    openCreatePurchaseEditor,
    openMaterialRestockEditor,
  } = props;
  const inventoryKind = props.inventoryKind ?? "materials";
  const isToolsView = inventoryKind === "tools";
  const { filters, updateFilters, rows, summary } = materialsBrowse;
  const visibleRows = rows.filter((row) => (row.category === "tool") === isToolsView);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [historyMaterialId, setHistoryMaterialId] = useState<string | null>(null);
  const [operationId, setOperationId] = useState("");
  const [movementType, setMovementType] = useState<"receipt" | "consumption" | "adjustment">("consumption");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [taskId, setTaskId] = useState("");
  const [projectId, setProjectId] = useState("");
  const activeMaterial = props.materialsBrowse.rows.find((row) => row.id === activeMaterialId);
  const selectedMaterial = props.materials.find((material) => material.id === activeMaterialId);
  const openTransaction = (materialId: string) => {
    setActiveMaterialId(materialId);
    setOperationId(Crypto.randomUUID());
    const material = props.materials.find((entry) => entry.id === materialId);
    setMovementType(material?.category === "tool" ? "adjustment" : material?.onHandQuantity == null ? "receipt" : "consumption");
    setAdjustmentDirection("increase");
    setQuantity("");
    setReason("");
    setTaskId("");
    setProjectId("");
  };
  const saveTransaction = async () => {
    const parsedQuantity = Number(quantity);
    if (!activeMaterialId || !operationId || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !reason.trim()) {
      throw new Error("Enter a positive quantity and reason.");
    }
    const saved = await mutate(`/api/materials/${activeMaterialId}/transactions`, {
      method: "POST",
      body: JSON.stringify({
        operationId,
        movementType,
        quantity: parsedQuantity,
        ...(movementType === "adjustment" ? { adjustmentDirection } : {}),
        reason: reason.trim(),
        ...(taskId ? { taskId } : {}),
        ...(projectId ? { projectId } : {}),
      }),
    });
    if (!saved) throw new Error("Stock movement was not saved.");
    setActiveMaterialId(null);
  };

  return (
    <WorkspacePanel
      title={isToolsView ? "Tools manager" : "Materials manager"}
      subtitle={isToolsView ? "Reusable shop tools and equipment with auditable count adjustments." : "Rollup view for fabrication stock, purchases, and reorder signals."}
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
          placeholder={`Search ${isToolsView ? "tools" : "materials"}`}
          value={filters.search}
        />

        <OptionChipRow
          allLabel="All categories"
          onChange={(value) => updateFilters({ category: value })}
          options={MATERIAL_CATEGORY_OPTIONS.filter((option) => (option.id === "tool") === isToolsView)}
          value={filters.category}
        />

        <OptionChipRow
          allLabel="All stock"
          onChange={(value) => updateFilters({ stock: value })}
          options={[
          { id: "ok", name: "Stock OK" },
          { id: "low", name: "Low stock" },
          { id: "unknown", name: "Quantity unknown" },
          ]}
          value={filters.stock}
        />
      </FilterToolbar>

      <SummaryRow
        chips={[
          { label: `Visible ${isToolsView ? "tools" : "materials"}`, value: String(visibleRows.length) },
          { label: isToolsView ? "Count unknown" : "Low stock", value: String(isToolsView ? visibleRows.filter((row) => row.stock === "unknown").length : summary.lowStockCount) },
          { label: isToolsView ? "Movement history" : "Restock suggested", value: String(isToolsView ? materialTransactions.filter((entry) => props.materials.some((material) => material.category === "tool" && material.id === entry.materialId)).length : summary.suggestedRestockCount) },
        ]}
      />

      {visibleRows.map((row) => (
        <View key={row.id} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
          <View style={styles.queueRowHeader}>
            <View style={styles.queueRowPrimaryText}>
              <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{row.name}</Text>
              <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                {capitalize(row.category)} - vendor {row.vendor}
              </Text>
            </View>
            <View style={styles.quickActionRow}>
              <Pressable
                onPress={() => openTransaction(row.id)}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton, styles.quickActionButtonPrimary]}
              >
                <Text style={styles.quickActionButtonPrimaryLabel}>{isToolsView ? "Record adjustment" : "Record movement"}</Text>
              </Pressable>
              <Pressable onPress={() => openMaterialRestockEditor(row)} style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}>
                <Text style={styles.quickActionButtonLabel}>Create purchase</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            On hand {row.onHand ?? "Unknown"} | Reorder {row.reorderPoint ?? "Not set"} | Open demand {row.openDemand}
          </Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            Open purchases {row.openPurchaseQuantity} across {row.openPurchaseCount} request{row.openPurchaseCount === 1 ? "" : "s"} | Suggested restock {row.suggestedOrderQuantity ?? "Unknown"}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setHistoryMaterialId(historyMaterialId === row.id ? null : row.id)}>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              {historyMaterialId === row.id ? "Hide" : "View"} stock history ({materialTransactions.filter((entry) => entry.materialId === row.id).length})
            </Text>
          </Pressable>
          {historyMaterialId === row.id ? materialTransactions
            .filter((entry) => entry.materialId === row.id)
            .slice()
            .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
            .map((entry) => (
              <Text key={entry.id} style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                {entry.recordedAt} · {entry.movementType} · {entry.quantityDelta === null ? "Quantity unknown" : `${entry.quantityDelta > 0 ? "+" : ""}${entry.quantityDelta}`} · {entry.reason} · {entry.actorMemberId ? props.membersById[entry.actorMemberId]?.name ?? entry.actorMemberId : "Unknown actor"}
                {entry.taskId ? ` · Task ${props.taskById[entry.taskId]?.title ?? entry.taskId}` : ""}
                {entry.projectId ? ` · Project ${props.projectsById[entry.projectId]?.name ?? entry.projectId}` : ""}
                {entry.purchaseItemId ? ` · Purchase ${props.purchaseItems.find((item) => item.id === entry.purchaseItemId)?.title ?? entry.purchaseItemId}` : ""}
                {entry.purchaseReceiptId ? ` · Receipt ${entry.purchaseReceiptId}` : ""}
              </Text>
            )) : null}

          <View style={styles.queuePillRow}>
            <StatusPill
              label={row.stock === "unknown" ? "Quantity unknown" : row.stock === "low" ? "Low stock" : "Stock OK"}
              value={row.stock === "low" ? "critical" : "complete"}
            />
            {row.suggestedOrderQuantity !== null && row.suggestedOrderQuantity > 0 ? (
              <StatusPill label={`Order ${row.suggestedOrderQuantity}`} value="requested" />
            ) : null}
          </View>
        </View>
      ))}

      {visibleRows.length === 0 ? (
        <EmptyState text={`No ${isToolsView ? "tools" : "materials"} match the current filters.`} />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.materials} />
      <EditorModal
        onCancel={() => setActiveMaterialId(null)}
        onSave={saveTransaction}
        saveLabel={isToolsView ? "Record adjustment" : "Record movement"}
        title={`${isToolsView ? "Tool adjustment" : "Stock movement"}${selectedMaterial ? ` · ${selectedMaterial.name}` : ""}`}
        visible={Boolean(activeMaterial)}
      >
        <DropdownField label="Movement" onChange={(value) => setMovementType(value as typeof movementType)} options={[
          ...(!isToolsView ? [{ id: "receipt", name: "Receipt" }, { id: "consumption", name: "Consumption" }] : []),
          { id: "adjustment", name: "Adjustment" },
        ].filter((option) => option.id !== "consumption" || (selectedMaterial !== undefined && selectedMaterial.onHandQuantity !== null))} value={movementType} />
        {movementType === "adjustment" ? <DropdownField label="Adjustment direction" onChange={(value) => setAdjustmentDirection(value as typeof adjustmentDirection)} options={[
          { id: "increase", name: "Increase stock" },
          { id: "decrease", name: "Decrease stock" },
        ]} value={adjustmentDirection} /> : null}
        <ModalField keyboardType="decimal-pad" label={`Quantity (${selectedMaterial?.unit ?? "units"})`} onChangeText={setQuantity} placeholder="0" value={quantity} />
        <ModalField label="Reason" multiline onChangeText={setReason} placeholder="Why is stock changing?" value={reason} />
        <DropdownField clearLabel="No linked task" label="Task (optional)" onChange={setTaskId} options={tasks.map((task) => ({ id: task.id, name: task.title }))} value={taskId} />
        <DropdownField clearLabel="No linked project" label="Project (optional)" onChange={setProjectId} options={projects.map((project) => ({ id: project.id, name: project.name }))} value={projectId} />
      </EditorModal>
    </WorkspacePanel>
  );
}
