import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import {
  PURCHASE_APPROVAL_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  SUBVIEW_INTERACTION_GUIDANCE,
} from "../ui/constants";
import { styles } from "../ui/styles";
import {
  EmptyState,
  FilterToolbar,
  InteractionNote,
  OptionChipRow,
  SearchField,
  StatusPill,
  WorkspacePanel,
} from "../ui/ui";

import type { AppScreenProps } from "./types";

export function InventoryPurchasesScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    editTagStyle,
    filteredPurchases,
    membersById,
    openCreatePurchaseEditor,
    openEditPurchaseEditor,
    purchaseApprovalFilter,
    purchaseSearch,
    purchaseStatusFilter,
    purchaseSubsystemFilter,
    purchaseVendorFilter,
    purchaseVendorOptions,
    setPurchaseApprovalFilter,
    setPurchaseSearch,
    setPurchaseStatusFilter,
    setPurchaseSubsystemFilter,
    setPurchaseVendorFilter,
    subsystems,
    subsystemsById,
  } = props;

  return (
    <WorkspacePanel
      title="Purchase list"
      subtitle="Review request status, vendor, mentor approval, and cost deltas in one queue."
      actions={
        <Pressable onPress={openCreatePurchaseEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add</Text>
        </Pressable>
      }
    >
      <FilterToolbar>
        <SearchField
          onChangeText={setPurchaseSearch}
          placeholder="Search purchases"
          value={purchaseSearch}
        />

        <OptionChipRow
          allLabel="All subsystems"
          onChange={setPurchaseSubsystemFilter}
          options={subsystems.map((subsystem) => ({
            id: subsystem.id,
            name: subsystem.name,
          }))}
          value={purchaseSubsystemFilter}
        />

        <OptionChipRow
          allLabel="All statuses"
          onChange={setPurchaseStatusFilter}
          options={PURCHASE_STATUS_OPTIONS}
          value={purchaseStatusFilter}
        />

        <OptionChipRow
          allLabel="All vendors"
          onChange={setPurchaseVendorFilter}
          options={purchaseVendorOptions}
          value={purchaseVendorFilter}
        />

        <OptionChipRow
          allLabel="All approvals"
          onChange={setPurchaseApprovalFilter}
          options={PURCHASE_APPROVAL_OPTIONS}
          value={purchaseApprovalFilter}
        />
      </FilterToolbar>

      {filteredPurchases.map((item) => {
        const subsystemName = subsystemsById[item.subsystemId]?.name ?? "Unknown";
        const requesterName = item.requestedById
          ? (membersById[item.requestedById]?.name ?? "Unassigned")
          : "Unassigned";

        return (
          <Pressable
            key={item.id}
            onPress={() => openEditPurchaseEditor(item)}
            style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{item.title}</Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {subsystemName} - requester {requesterName}
                </Text>
              </View>
              <Text style={editTagStyle}>EDIT</Text>
            </View>

            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Vendor {item.vendor} | Qty {item.quantity}
            </Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Est ${item.estimatedCost.toFixed(0)} | Final {item.finalCost ? `$${item.finalCost.toFixed(0)}` : "pending"}
            </Text>

            <View style={styles.queuePillRow}>
              <StatusPill label={item.status} value={item.status} />
              <StatusPill
                label={item.approvedByMentor ? "Mentor approved" : "Mentor waiting"}
                value={item.approvedByMentor ? "approved" : "waiting"}
              />
            </View>
          </Pressable>
        );
      })}

      {filteredPurchases.length === 0 ? (
        <EmptyState text="No purchase items match the current filters." />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.purchases} />
    </WorkspacePanel>
  );
}
