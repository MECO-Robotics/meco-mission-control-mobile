import { Pressable, View } from "react-native";

import { Text } from "../../i18n";
import { capitalize } from "../../ui/helpers";
import { styles } from "../../ui/styles";
import {
  EmptyState,
  StatusPill,
  SummaryRow,
  WorkspacePanel,
} from "../../ui/ui";

import type { AppScreenProps } from "../types";
import { AttendanceStatusMark } from "./AttendanceStatusMark";

export function HomeScreen(props: AppScreenProps) {
  const {
    appResponsiveStyles,
    attendancePreview,
    homeActionItems,
    homeTaskSummary,
    isSyncing,
    manufacturingItems,
    openEditTaskEditor,
    openEditManufacturingEditor,
    openEditPurchaseEditor,
    purchaseItems,
    setActiveTab,
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
          onPress={() => setActiveTab("work-tasks")}
          style={styles.homeSectionHeader}
        >
          <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
            Needs attention
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

      <SummaryRow chips={homeTaskSummary} />
      <View style={styles.quickActionRow}>
        {([
          ["work-tasks", "Open task queue"], ["work-schedule", "View schedule"],
          ["work-activity", "Activity"], ["resources-purchases", "Purchasing"],
        ] as const).map(([destination, label]) => <Pressable key={destination} accessibilityRole="button"
          onPress={() => setActiveTab(destination)} style={[styles.quickActionButton, appResponsiveStyles.quickActionButton, { minHeight: 44 }]}>
          <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>{label}</Text>
        </Pressable>)}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setActiveTab("team-attendance")}
        style={styles.homeSection}
      >
        <View style={styles.homeSectionHeader}>
          <Text style={[styles.subsectionLabel, appResponsiveStyles.subsectionLabel]}>
            Session attendance
          </Text>
          <Text style={[styles.queueMetaLine, appResponsiveStyles.metaLine]}>
            {attendancePreview.length} people in this local session preview — tap for everyone.
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
