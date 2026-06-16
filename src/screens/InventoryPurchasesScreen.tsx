import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

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
    purchaseVendorFilter,
    purchaseVendorOptions,
    setPurchaseApprovalFilter,
    setPurchaseSearch,
    setPurchaseStatusFilter,
    setPurchaseVendorFilter,
    subsystemsById,
    themeColors,
  } = props;
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  return (
    <WorkspacePanel
      title="Purchase list"
      subtitle="Review request status, approval state, purchase state, and cost deltas in one queue."
      actions={
        <View style={styles.taskQueueHeaderActions}>
          <Pressable onPress={() => setIsFiltersVisible(true)} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
            <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Filters</Text>
          </Pressable>
          <Pressable onPress={openCreatePurchaseEditor} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
            <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>Add</Text>
          </Pressable>
        </View>
      }
    >
      {filteredPurchases.map((item) => {
        const subsystemName = subsystemsById[item.subsystemId]?.name ?? "Unknown";
        const requesterName = item.requestedById
          ? (membersById[item.requestedById]?.name ?? "Unassigned")
          : "Unassigned";
        const shouldShowMentorApproved =
          item.approvedByMentor || item.status === "approved";
        const shouldShowStatus = item.status !== "approved";
        const shouldShowNotPurchased = item.status === "approved";

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
              Qty {item.quantity} | Estimated ${item.estimatedCost.toFixed(0)}
            </Text>
            <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
              Requested from {item.vendor}
            </Text>

            <View style={styles.queuePillRow}>
              {shouldShowStatus ? <StatusPill label={item.status} value={item.status} /> : null}
              {shouldShowMentorApproved ? <StatusPill label="Mentor Approved" value="approved" /> : null}
              {shouldShowNotPurchased ? <StatusPill label="Not purchased" value="waiting" /> : null}
            </View>
          </Pressable>
        );
      })}

      {filteredPurchases.length === 0 ? (
        <EmptyState text="No purchase items match the current filters." />
      ) : null}

      <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.purchases} />
      <Modal
        animationType="fade"
        onRequestClose={() => setIsFiltersVisible(false)}
        transparent
        visible={isFiltersVisible}
      >
        <Pressable style={styles.modalScrim} onPress={() => setIsFiltersVisible(false)}>
          <Pressable
            style={[
              styles.workLogAddMenu,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.ink }]}>Filters</Text>
            <FilterToolbar>
              <SearchField
                onChangeText={setPurchaseSearch}
                placeholder="Search purchases"
                value={purchaseSearch}
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
          </Pressable>
        </Pressable>
      </Modal>
    </WorkspacePanel>
  );
}
