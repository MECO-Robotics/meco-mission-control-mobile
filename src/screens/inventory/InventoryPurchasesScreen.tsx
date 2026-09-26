import { ActionButton } from "../../ui/ActionButton";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Text } from "../../i18n";
import {
  PURCHASE_APPROVAL_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
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
  WorkspacePanel,
} from "../../ui/ui";

import type { AppScreenProps } from "../types";

export function InventoryPurchasesScreen(props: AppScreenProps) {
  const {
    purchaseBrowse,
    appResponsiveStyles,
    approvePurchaseItem,
    canMentorApprove,
    editTagStyle,
    membersById,
    openCreatePurchaseEditor,
    openEditPurchaseEditor,
    subsystemsById,
    themeColors,
    transitionPurchaseItem,
  } = props;
  const { filters, updateFilters, rows, vendorOptions } = purchaseBrowse;
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  return (
    <WorkspacePanel
      title="Purchase list"
      subtitle="Review request status, approval state, purchase state, and cost deltas in one queue."
      actions={
        <View style={styles.taskQueueHeaderActions}>
          <ActionButton
            onPress={() => setIsFiltersVisible(true)}
            variant="primary"
            responsiveStyles={appResponsiveStyles}
          >
            Filters
          </ActionButton>
          <ActionButton
            onPress={openCreatePurchaseEditor}
            variant="primary"
            responsiveStyles={appResponsiveStyles}
          >
            Add
          </ActionButton>
        </View>
      }
    >
      {rows.map((item) => {
        const subsystemName = subsystemsById[item.subsystemId]?.name ?? "Unknown";
        const requesterName = item.requestedById
          ? (membersById[item.requestedById]?.name ?? "Unassigned")
          : "Unassigned";
        const shouldShowMentorApproved =
          item.approvedByMentor || item.status === "approved";
        const shouldShowStatus = item.status !== "approved";
        const shouldShowNotPurchased = item.status === "approved";
        const canEditItem = item.status === "requested" || canMentorApprove;
        const nextStatus =
          item.status === "approved"
            ? "purchased"
            : item.status === "purchased"
              ? "shipped"
              : item.status === "shipped"
                ? "delivered"
                : null;

        return (
          <Pressable
            key={item.id}
            onPress={() => {
              if (canEditItem) {
                openEditPurchaseEditor(item);
              }
            }}
            style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{item.title}</Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {subsystemName} - requester {requesterName}
                </Text>
              </View>
              <Text style={editTagStyle}>{canEditItem ? "EDIT" : "VIEW"}</Text>
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

            {canMentorApprove && item.status === "requested" ? (
              <View style={styles.quickActionRow}>
                <Pressable
                  onPress={() => approvePurchaseItem(item, true)}
                  style={[styles.quickActionButton, styles.quickActionButtonPrimary]}
                >
                  <Text style={styles.quickActionButtonPrimaryLabel}>Approve</Text>
                </Pressable>
              </View>
            ) : null}
            {canMentorApprove && nextStatus ? (
              <View style={styles.quickActionRow}>
                <ActionButton
                  onPress={() => transitionPurchaseItem(item, nextStatus)}
                  variant="quick"
                  responsiveStyles={appResponsiveStyles}
                >
                  Mark {nextStatus}
                </ActionButton>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {rows.length === 0 ? (
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
                onChangeText={(value) => updateFilters({ search: value })}
                placeholder="Search purchases"
                value={filters.search}
              />

              <OptionChipRow
                allLabel="All statuses"
                onChange={(value) => updateFilters({ status: value })}
                options={PURCHASE_STATUS_OPTIONS}
                value={filters.status}
              />

              <OptionChipRow
                allLabel="All vendors"
                onChange={(value) => updateFilters({ vendor: value })}
                options={vendorOptions}
                value={filters.vendor}
              />

              <OptionChipRow
                allLabel="All approvals"
                onChange={(value) => updateFilters({ approval: value })}
                options={PURCHASE_APPROVAL_OPTIONS}
                value={filters.approval}
              />
            </FilterToolbar>
          </Pressable>
        </Pressable>
      </Modal>
    </WorkspacePanel>
  );
}
