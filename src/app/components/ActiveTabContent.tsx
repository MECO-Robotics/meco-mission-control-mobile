import { useState } from "react";
import type { ReactNode } from "react";
import { HomeScreen } from "../../screens/dashboard/HomeScreen";
import { DocumentsScreen } from "../../screens/documents/DocumentsScreen";
import { InventoryMaterialsScreen } from "../../screens/inventory/InventoryMaterialsScreen";
import { InventoryPartsScreen } from "../../screens/inventory/InventoryPartsScreen";
import { InventoryPurchasesScreen } from "../../screens/inventory/InventoryPurchasesScreen";
import { QaActivity } from "../../screens/reports/QaActivity";
import { RisksScreen } from "../../screens/robot/RisksScreen";
import { SubsystemsScreen } from "../../screens/robot/SubsystemsScreen";
import { RosterScreen } from "../../screens/roster/RosterScreen";
import { WorkLogsScreen } from "../../screens/worklogs/WorkLogsScreen";
import type { AppScreenProps } from "../../screens/types";
import type { TaskViewTab, ViewTab } from "../../ui/types";
import { SectionTabs } from "../../ui/ui";

type Props = {
  activeTab: ViewTab;
  screenProps: AppScreenProps;
  taskContent: ReactNode;
  scheduleView: Exclude<TaskViewTab, "queue">;
  onScheduleViewChange: (view: Exclude<TaskViewTab, "queue">) => void;
};

export function ActiveTabContent(props: Props) {
  const { activeTab, screenProps, taskContent } = props;
  const [reportView, setReportView] = useState<"pending" | "history" | "help">("history");
  switch (activeTab) {
    case "home": return <HomeScreen {...screenProps} />;
    case "work-tasks": return taskContent;
    case "work-schedule": return <>
      <SectionTabs activeValue={props.scheduleView} onChange={props.onScheduleViewChange}
        options={[{ value: "milestones", label: "Agenda" }, { value: "calendar", label: "Calendar" }, { value: "timeline", label: "Timeline" }]} />
      {taskContent}
    </>;
    case "work-activity": return <WorkLogsScreen {...screenProps} />;
    case "work-documents": return <DocumentsScreen {...screenProps} />;
    case "work-reports": return <>
      <SectionTabs activeValue={reportView} onChange={(value) => setReportView(value as typeof reportView)} options={[
        { value: "pending", label: "Pending QA" },
        { value: "history", label: "Reports" },
        { value: "help", label: "Mentor help" },
      ]} />
      <QaActivity {...screenProps} mode={reportView} />
    </>;
    case "resources-materials": return <InventoryMaterialsScreen {...screenProps} />;
    case "resources-parts": return <InventoryPartsScreen {...screenProps} />;
    case "resources-purchases": return <InventoryPurchasesScreen {...screenProps} />;
    case "resources-structure": return <SubsystemsScreen {...screenProps} />;
    case "work-risks": return <RisksScreen {...screenProps} />;
    case "team-people": return <RosterScreen {...screenProps} />;
  }
}
