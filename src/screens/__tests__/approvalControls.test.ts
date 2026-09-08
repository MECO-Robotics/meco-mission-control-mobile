import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ManufacturingScreen } from "../manufacturing/ManufacturingScreen";
import { InventoryPurchasesScreen } from "../inventory/InventoryPurchasesScreen";
import { WorkLogsScreen } from "../worklogs/WorkLogsScreen";
import { getSessionPermissions } from "../../data/sessionPermissions";
import type { AppScreenProps } from "../types";
import type { MemberRole } from "../../types/domain";

// Screens use the real native controls and UI components. Supply only their inputs.
function props(role: MemberRole, overrides: Partial<AppScreenProps> = {}) {
  return {
    ...getSessionPermissions({ accountId: "account", name: "User", email: "user@example.com",
      authProvider: "email", picture: null, hostedDomain: "example.com", role }, []),
    appResponsiveStyles: {}, themeColors: {}, members: [], membersById: {},
    subsystems: [], subsystemsById: {}, taskById: {}, manufacturingMaterialOptions: [],
    manufacturingSummary: [], workLogSummary: [], purchaseVendorOptions: [],
    manufacturingSearch: "", purchaseSearch: "", workLogSearch: "",
    patchManufacturingItem: jest.fn(), approvePurchaseItem: jest.fn(),
    transitionPurchaseItem: jest.fn(), openEditPurchaseEditor: jest.fn(),
    openEditWorkLogEditor: jest.fn(), ...overrides,
  } as unknown as AppScreenProps;
}

const manufacturing = {
  id: "manufacturing", title: "Bracket", subsystemId: "drive", material: "Steel",
  quantity: 1, dueDate: "2026-09-08", status: "requested", process: "cnc", mentorReviewed: false,
} as AppScreenProps["filteredManufacturing"][number];
const purchase = {
  id: "purchase", title: "Bolts", subsystemId: "drive", quantity: 1,
  estimatedCost: 10, vendor: "Vendor", status: "requested", approvedByMentor: false,
} as AppScreenProps["filteredPurchases"][number];
const workLog = {
  id: "log", taskId: "task", date: "2026-09-08", hours: 1,
  participantIds: [], notes: "Wired controls",
} as AppScreenProps["filteredWorkLogs"][number];

test.each(["student", "lead", "mentor", "admin"] as const)("%s manufacturing approval controls execute only permitted review", (role) => {
  const input = props(role, { filteredManufacturing: [manufacturing] });
  const screen = render(createElement(ManufacturingScreen, input));
  if (role === "mentor" || role === "admin") {
    fireEvent.press(screen.getByText("Approve"));
    expect(input.patchManufacturingItem).toHaveBeenCalledWith(manufacturing, { mentorReviewed: true });
  } else {
    expect(screen.queryByText("Approve")).toBeNull();
    expect(input.patchManufacturingItem).not.toHaveBeenCalled();
  }
  screen.rerender(createElement(ManufacturingScreen, { ...input,
    filteredManufacturing: [{ ...manufacturing, mentorReviewed: true, status: "qa" }] }));
  expect(screen.queryByText("Approve")).toBeNull();
});

test.each(["student", "lead", "mentor", "admin"] as const)("%s purchasing approval and transition controls", (role) => {
  const input = props(role, { filteredPurchases: [purchase] });
  const screen = render(createElement(InventoryPurchasesScreen, input));
  const privileged = role === "mentor" || role === "admin";
  if (privileged) {
    fireEvent.press(screen.getByText("Approve"));
    expect(input.approvePurchaseItem).toHaveBeenCalledWith(purchase, true);
  } else expect(screen.queryByText("Approve")).toBeNull();
  const approved = { ...purchase, status: "approved" as const };
  screen.rerender(createElement(InventoryPurchasesScreen, { ...input, filteredPurchases: [approved] }));
  fireEvent.press(screen.getByText("Bolts"));
  if (privileged) {
    fireEvent.press(screen.getByText("Mark purchased"));
    expect(input.transitionPurchaseItem).toHaveBeenCalledWith(approved, "purchased");
    expect(input.openEditPurchaseEditor).toHaveBeenCalledWith(approved);
  } else {
    expect(screen.queryByText("Mark purchased")).toBeNull();
    expect(input.openEditPurchaseEditor).not.toHaveBeenCalled();
  }
});

test.each(["student", "lead", "mentor", "admin"] as const)("%s synced work log editing and local draft exception", (role) => {
  const input = props(role, { filteredWorkLogs: [workLog] });
  const screen = render(createElement(WorkLogsScreen, input));
  fireEvent.press(screen.getByText(workLog.notes));
  expect(input.openEditWorkLogEditor).toHaveBeenCalledTimes(role === "mentor" || role === "admin" ? 1 : 0);
  jest.mocked(input.openEditWorkLogEditor).mockClear();
  const pending = { ...workLog, syncStatus: "pending" as const };
  screen.rerender(createElement(WorkLogsScreen, { ...input, filteredWorkLogs: [pending] }));
  fireEvent.press(screen.getByText(workLog.notes));
  expect(input.openEditWorkLogEditor).toHaveBeenCalledWith(pending);
  jest.mocked(input.openEditWorkLogEditor).mockClear();
  screen.rerender(createElement(WorkLogsScreen, { ...input,
    filteredWorkLogs: [{ ...workLog, syncStatus: "syncing" }] }));
  fireEvent.press(screen.getByText(workLog.notes));
  expect(input.openEditWorkLogEditor).not.toHaveBeenCalled();
});
