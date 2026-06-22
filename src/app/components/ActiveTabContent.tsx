import { AttendanceScreen } from "../../screens/dashboard/AttendanceScreen";
import { HomeScreen } from "../../screens/dashboard/HomeScreen";
import { InventoryScreen } from "../../screens/inventory/InventoryScreen";
import { ManufacturingScreen } from "../../screens/manufacturing/ManufacturingScreen";
import { ReportsScreen } from "../../screens/reports/ReportsScreen";
import { RisksScreen } from "../../screens/robot/RisksScreen";
import { SubsystemsScreen } from "../../screens/robot/SubsystemsScreen";
import { RosterScreen } from "../../screens/roster/RosterScreen";
import { TasksScreen } from "../../screens/tasks/TasksScreen";
import { WorkLogsScreen } from "../../screens/worklogs/WorkLogsScreen";
import type { AppScreenProps } from "../../screens/types";
import type { ViewTab } from "../../ui/types";

type ActiveTabContentProps = {
  activeTab: ViewTab;
  screenProps: AppScreenProps;
};

export function ActiveTabContent({ activeTab, screenProps }: ActiveTabContentProps) {
  switch (activeTab) {
    case "home":
      return <HomeScreen {...screenProps} />;
    case "attendance":
      return <AttendanceScreen {...screenProps} />;
    case "tasks":
      return <TasksScreen {...screenProps} />;
    case "worklogs":
      return <WorkLogsScreen {...screenProps} />;
    case "manufacturing":
      return <ManufacturingScreen {...screenProps} />;
    case "inventory":
      return <InventoryScreen {...screenProps} />;
    case "subsystems":
      return <SubsystemsScreen {...screenProps} />;
    case "reports":
      return <ReportsScreen {...screenProps} />;
    case "risks":
      return <RisksScreen {...screenProps} />;
    default:
      return <RosterScreen {...screenProps} />;
  }
}
