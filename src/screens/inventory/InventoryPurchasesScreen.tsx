import { ActionButton } from "../../ui/ActionButton";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "../../i18n";
import { PURCHASE_APPROVAL_OPTIONS, PURCHASE_STATUS_OPTIONS, SUBVIEW_INTERACTION_GUIDANCE } from "../../ui/constants";
import { styles } from "../../ui/styles";
import { EmptyState, FilterToolbar, InteractionNote, OptionChipRow, SearchField, StatusPill, WorkspacePanel } from "../../ui/ui";
import type { PurchaseOrderStatus } from "../../types/domain";
import type { AppScreenProps } from "../types";

const nextStatus: Partial<Record<PurchaseOrderStatus, PurchaseOrderStatus>> = { "not-ordered": "ordered", ordered: "shipped", shipped: "delivered" };
export function InventoryPurchasesScreen(props: AppScreenProps) {
  const { purchaseBrowse, appResponsiveStyles, approvePurchaseItem, canMentorApprove, editTagStyle, taskById, openCreatePurchaseEditor, openEditPurchaseEditor, themeColors, transitionPurchaseItem } = props;
  const { filters, updateFilters, rows, vendorOptions } = purchaseBrowse;
  const [filtersVisible, setFiltersVisible] = useState(false);
  return <WorkspacePanel title="Purchasing" subtitle="Commercial records are linked to procurement Tasks; quotes, approvals, orders, cost, and delivery live here." actions={<View style={styles.taskQueueHeaderActions}><ActionButton onPress={() => setFiltersVisible(true)} variant="primary" responsiveStyles={appResponsiveStyles}>Filters</ActionButton><ActionButton onPress={openCreatePurchaseEditor} variant="primary" responsiveStyles={appResponsiveStyles}>Add</ActionButton></View>}>
    {rows.map((item) => {
      const task = taskById[item.taskId];
      const vendorId = item.quotes.find((quote) => quote.id === item.selectedQuoteId)?.vendorId ?? item.quotes[0]?.vendorId;
      const quote = item.quotes.find((candidate) => candidate.id === item.selectedQuoteId);
      const action = nextStatus[item.orderStatus];
      return <Pressable key={item.id} onPress={() => openEditPurchaseEditor(item)} style={[styles.queueRowCard, appResponsiveStyles.rowCard]}>
        <View style={styles.queueRowHeader}><View style={styles.queueRowPrimaryText}><Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>{item.title}</Text><Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>Task: {task?.title ?? "Missing linked Task"}</Text></View><Text style={editTagStyle}>VIEW</Text></View>
        <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>Qty {item.quantity} | Quote {quote?.amount ? `${quote.amount.currency ?? ""} ${quote.amount.amount.toFixed(2)}` : "Not quoted"}</Text>
        <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>Vendor {vendorId ?? "Not selected"} | PO {item.purchaseOrderNumber ?? "Not ordered"}</Text>
        <View style={styles.queuePillRow}><StatusPill label={item.approvalStatus} value={item.approvalStatus} /><StatusPill label={item.orderStatus} value={item.orderStatus} /></View>
        {canMentorApprove && item.approvalStatus === "pending" ? <View style={styles.quickActionRow}><Pressable onPress={() => approvePurchaseItem(item, true)} style={[styles.quickActionButton, styles.quickActionButtonPrimary]}><Text style={styles.quickActionButtonPrimaryLabel}>Approve</Text></Pressable></View> : null}
        {canMentorApprove && action ? <View style={styles.quickActionRow}><ActionButton onPress={() => transitionPurchaseItem(item, action)} variant="quick" responsiveStyles={appResponsiveStyles}>Mark {action}</ActionButton></View> : null}
      </Pressable>;
    })}
    {rows.length === 0 ? <EmptyState text="No purchase items match the current filters." /> : null}
    <InteractionNote steps={SUBVIEW_INTERACTION_GUIDANCE.purchases} />
    <Modal animationType="fade" onRequestClose={() => setFiltersVisible(false)} transparent visible={filtersVisible}><Pressable style={styles.modalScrim} onPress={() => setFiltersVisible(false)}><Pressable style={[styles.workLogAddMenu, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}><Text style={[styles.modalTitle, { color: themeColors.ink }]}>Filters</Text><FilterToolbar><SearchField onChangeText={(search) => updateFilters({ search })} placeholder="Search purchasing" value={filters.search} /><OptionChipRow allLabel="All order states" onChange={(orderStatus) => updateFilters({ orderStatus })} options={PURCHASE_STATUS_OPTIONS} value={filters.orderStatus} /><OptionChipRow allLabel="All vendors" onChange={(vendorId) => updateFilters({ vendorId })} options={vendorOptions} value={filters.vendorId} /><OptionChipRow allLabel="All approvals" onChange={(approval) => updateFilters({ approval })} options={PURCHASE_APPROVAL_OPTIONS} value={filters.approval} /></FilterToolbar></Pressable></Pressable></Modal>
  </WorkspacePanel>;
}
