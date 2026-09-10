import { useState } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { AttendanceScreen } from "../../screens/dashboard/AttendanceScreen";
import { HomeScreen } from "../../screens/dashboard/HomeScreen";
import { InventoryMaterialsScreen } from "../../screens/inventory/InventoryMaterialsScreen";
import { InventoryPartsScreen } from "../../screens/inventory/InventoryPartsScreen";
import { InventoryPurchasesScreen } from "../../screens/inventory/InventoryPurchasesScreen";
import { ManufacturingScreen } from "../../screens/manufacturing/ManufacturingScreen";
import { QaActivity } from "../../screens/reports/QaActivity";
import { RisksScreen } from "../../screens/robot/RisksScreen";
import { SubsystemsScreen } from "../../screens/robot/SubsystemsScreen";
import { RosterScreen } from "../../screens/roster/RosterScreen";
import { WorkLogsScreen } from "../../screens/worklogs/WorkLogsScreen";
import type { AppScreenProps } from "../../screens/types";
import type { ManufacturingViewTab, ViewTab } from "../../ui/types";
import { DropdownField, SectionTabs } from "../../ui/ui";
import { MANUFACTURING_VIEW_OPTIONS } from "../../ui/constants";

type Props = {
  activeTab: ViewTab;
  screenProps: AppScreenProps;
  taskContent: ReactNode;
  scheduleView: "milestones" | "timeline";
  onScheduleViewChange: (view: "milestones" | "timeline") => void;
  manufacturingView: ManufacturingViewTab;
  onManufacturingViewChange: (view: ManufacturingViewTab) => void;
};

export function ActiveTabContent(props: Props) {
  const { activeTab, screenProps, taskContent } = props;
  const [taskPreset, setTaskPreset] = useState<"queue" | "qa">("queue");
  const [activityKind, setActivityKind] = useState<"logs" | "qa">("logs");
  switch (activeTab) {
    case "home": return <HomeScreen {...screenProps} />;
    case "team-attendance": return <AttendanceScreen {...screenProps} />;
    case "work-tasks": return <>
      <View style={{ paddingHorizontal: 20 }}><DropdownField label="Show" value={taskPreset}
        options={[{ id: "queue", name: "Task queue" }, { id: "qa", name: "Pending QA" }]}
        onChange={(value) => setTaskPreset(value === "qa" ? "qa" : "queue")} /></View>
      {taskPreset === "qa" ? <QaActivity {...screenProps} mode="pending" /> : taskContent}
    </>;
    case "work-schedule": return <>
      <SectionTabs activeValue={props.scheduleView} onChange={props.onScheduleViewChange}
        options={[{ value: "milestones", label: "Agenda" }, { value: "timeline", label: "Timeline" }]} />
      {taskContent}
    </>;
    case "work-activity": return <>
      <View style={{ paddingHorizontal: 20 }}><DropdownField label="Activity type" value={activityKind}
        options={[{ id: "logs", name: "Work logs" }, { id: "qa", name: "QA results" }]}
        onChange={(value) => setActivityKind(value === "qa" ? "qa" : "logs")} /></View>
      {activityKind === "logs" ? <WorkLogsScreen {...screenProps} /> : <QaActivity {...screenProps} mode="history" />}
    </>;
    case "resources-materials": return <InventoryMaterialsScreen {...screenProps} />;
    case "resources-parts": return <InventoryPartsScreen {...screenProps} />;
    case "resources-purchases": return <InventoryPurchasesScreen {...screenProps} />;
    case "resources-manufacturing": return <>
      <View style={{ paddingHorizontal: 20 }}><DropdownField label="Process" value={props.manufacturingView}
        options={MANUFACTURING_VIEW_OPTIONS.map(({ value, label }) => ({ id: value, name: label }))}
        onChange={(value) => props.onManufacturingViewChange(value as ManufacturingViewTab)} /></View>
      <ManufacturingScreen {...screenProps} />
    </>;
    case "resources-structure": return <SubsystemsScreen {...screenProps} />;
    case "work-risks": return <><RisksScreen {...screenProps} /><QaActivity {...screenProps} mode="help" /></>;
    case "team-people": return <RosterScreen {...screenProps} />;
  }
}
