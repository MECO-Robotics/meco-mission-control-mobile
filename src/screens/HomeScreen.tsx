import { Pressable, View } from "react-native";

import { Text } from "../i18n";
import { STATUS_LABELS } from "../ui/constants";
import { capitalize, formatDate } from "../ui/helpers";
import { styles } from "../ui/styles";
import {
  EmptyState,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../ui/ui";

import type { AppScreenProps } from "./types";
import { AttendanceStatusMark } from "./AttendanceStatusMark";

export function HomeScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    attendancePreview,
    homeActionItems,
    homeInventoryNeeds,
    homePriorityTasks,
    homeTaskSummary,
    isSyncing,
    manufacturingItems,
    membersById,
    openEditTaskEditor,
    openEditManufacturingEditor,
    openEditPurchaseEditor,
    openInventoryPurchases,
    purchaseItems,
    setActiveTab,
    subsystemsById,
    syncFromBackend,
    tasks,
  } = props;

const renderScreen = () => {
  const openHomeActionItem = (item: (typeof homeActionItems)[number]) => {
    if (item.source === "task") {
      const task = tasks.find((candidate) => candidate.id === item.onPressTargetId);
      if (task) {
        openEditTaskEditor(task);
      }
      return;
    }

    if (item.source === "purchase") {
      const purchase = purchaseItems.find((candidate) => candidate.id === item.onPressTargetId);
      if (purchase) {
        openEditPurchaseEditor(purchase);
      }
      return;
    }

    const manufacturingItem = manufacturingItems.find(
      (candidate) => candidate.id === item.onPressTargetId,
    );
    if (manufacturingItem) {
      openEditManufacturingEditor(manufacturingItem);
    }
  };

  return (
    <WorkspacePanel
      title="Home"
      subtitle="Priority tasks and workspace status for the next execution window."
      actions={
        <Pressable onPress={syncFromBackend} style={[styles.primaryAction, appResponsiveStyles.primaryAction]}>
          <Text style={[styles.primaryActionLabel, appResponsiveStyles.primaryActionLabel]}>
            {isSyncing ? "Refreshing" : "Refresh"}
          </Text>
        </Pressable>
      }
    >
      <View style={styles.homeSection}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveTab("tasks")}
          style={styles.homeSectionHeader}
        >
          <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
            Tasks
          </Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            The highest-risk work across tasks, manufacturing, and purchases.
          </Text>
        </Pressable>
        {homeActionItems.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.id}
            onPress={() => openHomeActionItem(item)}
            style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                  {item.title}
                </Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {item.detail}
                </Text>
              </View>
              <StatusPill label={item.label} value={item.priority} />
            </View>
          </Pressable>
        ))}
        {homeActionItems.length === 0 ? (
          <EmptyState text="No urgent work is visible right now." />
        ) : null}
      </View>

      <View style={styles.homeSection}>
        <Pressable
          accessibilityRole="button"
          onPress={openInventoryPurchases}
          style={styles.homeSectionHeader}
        >
          <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
            Inventory to buy
          </Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            Top {homeInventoryNeeds.length} purchase items still waiting.
          </Text>
        </Pressable>
        {homeInventoryNeeds.map((item) => {
          const requesterName = item.requestedById
            ? (membersById[item.requestedById]?.name ?? "Unassigned")
            : "Unassigned";

          return (
            <Pressable
              key={item.id}
              onPress={() => openEditPurchaseEditor(item)}
              style={[styles.inventoryAlertRow, appResponsiveStyles.rowCard]}
            >
              <View style={styles.queueRowHeader}>
                <View style={styles.queueRowPrimaryText}>
                  <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                    {item.vendor} - Qty {item.quantity} - requester {requesterName}
                  </Text>
                </View>
                <StatusPill label={item.status} value={item.status} />
              </View>
              <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
                Estimated ${item.estimatedCost.toFixed(0)}
              </Text>
            </Pressable>
          );
        })}
        {homeInventoryNeeds.length === 0 ? (
          <EmptyState text="No purchase items need buying right now." />
        ) : null}
      </View>

      <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
        <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
          Tasks for this meeting
        </Text>
        <SummaryRow chips={homeTaskSummary} />
      </View>

      {homePriorityTasks.map((task) => {
        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "Unknown";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";

        return (
          <Pressable
            key={task.id}
            onPress={() => openEditTaskEditor(task)}
            style={[styles.queueRowCard, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowHeader}>
              <View style={styles.queueRowPrimaryText}>
                <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                  {task.title}
                </Text>
                <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                  {subsystemName} - {ownerName} - due {formatDate(task.dueDate)}
                </Text>
              </View>
              <StatusPill label={task.priority} value={task.priority} />
            </View>
            <Text numberOfLines={2} style={[styles.queueRowBody, appResponsiveStyles.rowBody]}>
              {task.summary}
            </Text>
            <View style={styles.queuePillRow}>
              <StatusPill label={STATUS_LABELS[task.status]} value={task.status} />
              {task.blockers.length > 0 ? (
                <StatusPill label="Blocked" value="critical" />
              ) : null}
            </View>
          </Pressable>
        );
      })}

      {homePriorityTasks.length === 0 ? (
        <EmptyState text="No open tasks need attention right now." />
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setActiveTab("attendance")}
        style={styles.homeSection}
      >
        <View style={styles.homeSectionHeader}>
          <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
            Meeting attendance
          </Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            Top {attendancePreview.length} coming to the meeting - tap for everyone.
          </Text>
        </View>
        {attendancePreview.map(({ member, status }) => (
          <View
            key={member.id}
            style={[styles.attendanceRow, appResponsiveStyles.rowCard]}
          >
            <View style={styles.queueRowPrimaryText}>
              <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                {member.name}
              </Text>
              <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                {capitalize(member.role)}
              </Text>
            </View>
            {<AttendanceStatusMark status={status} />}
          </View>
        ))}
        {attendancePreview.length === 0 ? (
          <EmptyState text="No one is marked as coming yet." />
        ) : null}
      </Pressable>
    </WorkspacePanel>
  );
};

  return renderScreen();
}
