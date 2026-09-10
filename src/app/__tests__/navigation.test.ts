import { createElement, useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { WorkspaceShell } from "../components/WorkspaceShell";
import { appThemes } from "../../theme";
import type { ViewTab } from "../../ui/types";
import { NAVIGATION } from "../navigation";

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("../components/DeviceSessionsModal", () => ({ DeviceSessionsModal: () => null }));

function Workspace() {
  const [activeTab, setActiveTab] = useState<ViewTab>("home");
  const [isPersonMenuVisible, setPersonMenu] = useState(false);
  return createElement(WorkspaceShell, {
    activeTab, onSelectTab: setActiveTab, activeTabContent: createElement(Text, null, `Current: ${activeTab}`),
    editorModals: null, deviceSessions: [], deviceSessionsError: null, isDeviceSessionsVisible: false,
    isLoadingDeviceSessions: false, isPersonMenuVisible, onCloseDeviceSessions: jest.fn(),
    onClosePersonMenu: () => setPersonMenu(false), onOpenDeviceSessions: jest.fn(),
    onOpenPersonMenu: () => setPersonMenu(true), onRefresh: jest.fn(), onRevokeAllDeviceSessions: jest.fn(),
    onRevokeDeviceSession: jest.fn(), onSignOut: jest.fn(), onToggleTheme: jest.fn(),
    personInitial: "A", syncError: null, syncStatusLabel: "Connected", themeColors: appThemes.light, themeMode: "light",
  });
}

test("all supported destinations are reachable using labeled controls without gestures", () => {
  const view = render(createElement(Workspace));
  expect(view.getAllByRole("tab")).toHaveLength(4);
  for (const section of NAVIGATION) {
    fireEvent.press(view.getByRole("tab", { name: section.label }));
    for (const child of section.views) {
      if (section.views.length > 1) fireEvent.press(view.getByRole("tab", { name: child.label }));
      expect(view.getByText(`Current: ${child.value}`)).toBeTruthy();
    }
  }
});

test("switching domains returns to the last view and new Work starts on Tasks", () => {
  const view = render(createElement(Workspace));
  fireEvent.press(view.getByRole("tab", { name: "Work" }));
  expect(view.getByText("Current: work-tasks")).toBeTruthy();
  fireEvent.press(view.getByRole("tab", { name: "Schedule" }));
  fireEvent.press(view.getByRole("tab", { name: "Team" }));
  fireEvent.press(view.getByRole("tab", { name: "Work" }));
  expect(view.getByRole("tab", { name: "Schedule" }).props.accessibilityState.selected).toBe(true);
  expect(view.getByText("Current: work-schedule")).toBeTruthy();
});

test("account utilities have an explicit close action and no local season reset", () => {
  const view = render(createElement(Workspace));
  fireEvent.press(view.getByRole("button", { name: "Open account menu" }));
  expect(view.getByRole("button", { name: "Signed-in devices" })).toBeTruthy();
  expect(view.queryByText("Season")).toBeNull();
  expect(view.queryByLabelText("Add new season")).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Close" }));
  expect(view.queryByRole("button", { name: "Signed-in devices" })).toBeNull();
});
