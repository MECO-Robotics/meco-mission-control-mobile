import { createElement, Fragment } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import App from "../../../App";
import { requestJson } from "../../data/api";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import { LoginScreen } from "../components/LoginScreen";
import { WorkspaceShell } from "../components/WorkspaceShell";
import { loadPersistedAuthSession } from "../../services/authSessionStorage";
import type { AppScreenProps } from "../../screens/types";

jest.mock("../../data/api", () => ({ ...jest.requireActual("../../data/api"), requestJson: jest.fn() }));
jest.mock("../../data/devAuthBypass", () => ({ ...jest.requireActual("../../data/devAuthBypass"), isLocalDevAuthBypassEnabled: () => true }));
jest.mock("../components/LoginScreen", () => ({ LoginScreen: jest.fn(() => null) }));
jest.mock("../components/WorkspaceShell", () => ({ WorkspaceShell: jest.fn(({ editorModals }) => editorModals) }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), getAllKeys: jest.fn(async () => []) }));
jest.mock("../../services/authSessionStorage", () => ({ getOrCreateAuthDeviceNumber: jest.fn(async () => "test"), loadPersistedAuthSession: jest.fn(async () => null), clearPersistedAuthSession: jest.fn(async () => undefined) }));
jest.mock("../../services/workLogTimerNotifications", () => ({ cancelWorkLogTimerReminders: jest.fn(async () => undefined), clearPersistedWorkLogTimerState: jest.fn(async () => undefined), restorePersistedWorkLogTimerReminder: jest.fn(async () => null), persistWorkLogTimerState: jest.fn(async () => undefined), schedulePersistedWorkLogTimerReminders: jest.fn(async () => []) }));

const task = { ...mecoSnapshot.tasks[0], status: "waiting-for-qa", blockers: [], isBlocked: false, isWaitingOnDependency: false };
let reports: object[];
let failSave: boolean;
let failRefresh: boolean;
const request = jest.mocked(requestJson);
function shell() { return jest.mocked(WorkspaceShell).mock.calls.at(-1)![0]; }
function screenProps() { return (shell().activeTabContent as ReturnType<typeof createElement<{ screenProps: AppScreenProps }>>).props.screenProps; }

beforeEach(() => {
  jest.clearAllMocks(); reports = []; failSave = false; failRefresh = false; jest.mocked(loadPersistedAuthSession).mockResolvedValue(null);
  request.mockImplementation(async (_base, path, init) => {
    if (path === "/api/auth/config") return { enabled: false, hostedDomain: "mecorobotics.org", emailEnabled: true };
    if (path === "/api/bootstrap") {
      if (failRefresh) throw new Error("Refresh unavailable");
      return { ...mecoSnapshot, tasks: [task], reports, qaRequests: [], taskDependencies: [] };
    }
    if (path === "/api/qa-reports/submit") {
      if (failSave) throw new Error("Report write failed");
      const item = { ...JSON.parse(String(init?.body)), id: "persisted-report", reportType: "qa" };
      reports.push(item); return { item };
    }
    return {};
  });
});

async function signIn() {
  await waitFor(() => expect(LoginScreen).toHaveBeenCalled());
  await act(async () => { await jest.mocked(LoginScreen).mock.calls.at(-1)![0].signInWithDevBypass(); });
  await waitFor(() => expect(WorkspaceShell).toHaveBeenCalled());
}

test("failed bootstrap keeps a fresh sign-in behind the auth gate until retry succeeds", async () => {
  const view = render(createElement(App));
  await waitFor(() => expect(LoginScreen).toHaveBeenCalled());
  expect(WorkspaceShell).not.toHaveBeenCalled();
  failRefresh = true;
  await act(async () => { await jest.mocked(LoginScreen).mock.calls.at(-1)![0].signInWithDevBypass(); });
  expect(WorkspaceShell).not.toHaveBeenCalled();
  expect(jest.mocked(LoginScreen).mock.calls.at(-1)![0].authError).toMatch(/workspace/i);
  failRefresh = false;
  await act(async () => { await jest.mocked(LoginScreen).mock.calls.at(-1)![0].signInWithDevBypass(); });
  await waitFor(() => expect(WorkspaceShell).toHaveBeenCalled());
  expect(screenProps().members).toEqual(mecoSnapshot.members);
  view.unmount();
});

test("restored sessions do not expose workspace state when bootstrap fails", async () => {
  jest.mocked(loadPersistedAuthSession).mockResolvedValue({
    token: "restored-token",
    refreshToken: "refresh-token",
    accessTokenExpiresAt: "2999-01-01T00:00:00.000Z",
    sessionExpiresAt: "2999-01-02T00:00:00.000Z",
    user: { accountId: "account", authProvider: "email", email: "member@mecorobotics.org", name: "Member", picture: null, hostedDomain: "mecorobotics.org" },
    session: { id: "session", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-01T00:00:00.000Z" },
    deviceNumber: "123456789012",
  });
  failRefresh = true;
  const view = render(createElement(App));
  await waitFor(() => expect(LoginScreen).toHaveBeenCalled());
  expect(WorkspaceShell).not.toHaveBeenCalled();
  failRefresh = false;
  view.unmount();
});

test("QA uses one atomic command, survives bootstrap and retains a failed draft", async () => {
  const view = render(createElement(Fragment, null, createElement(App)));
  await signIn();
  act(() => screenProps().openCreateQaReportEditor(task.id));
  fireEvent.changeText(view.getByLabelText("Notes"), "Bearing inspection passed");
  failSave = true;
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Save QA report" })));
  expect(view.getByLabelText("Notes").props.value).toBe("Bearing inspection passed");
  expect(reports).toHaveLength(0);
  failSave = false;
  failRefresh = true;
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Save QA report" })));
  expect(reports).toHaveLength(1);
  expect(view.queryByRole("button", { name: "Save QA report" })).toBeNull();
  expect(screenProps().qaReports).toEqual(expect.arrayContaining([expect.objectContaining({ id: "persisted-report", notes: "Bearing inspection passed" })]));
  expect(request.mock.calls.filter(([, , init]) => init?.method === "POST").map(([, path]) => path)).toEqual(["/api/qa-reports/submit", "/api/qa-reports/submit"]);
  view.unmount();
  failRefresh = false;
  render(createElement(App));
  await signIn();
  expect(screenProps().qaReports[0].id).toBe("persisted-report");
});

test("refreshing the workspace retains the active timer and open editor draft", async () => {
  const view = render(createElement(App));
  await signIn();
  await act(async () => { screenProps().startWorkLogTimer(); });
  const timerId = screenProps().workLogTimer?.id;
  expect(timerId).toBeTruthy();
  act(() => screenProps().openCreateQaReportEditor(task.id));
  fireEvent.changeText(view.getByLabelText("Notes"), "Inspection draft in progress");
  await act(async () => { shell().onRefresh(); });
  expect(screenProps().workLogTimer?.id).toBe(timerId);
  expect(view.getByLabelText("Notes").props.value).toBe("Inspection draft in progress");
});

test("Kanban and purchase filters survive real tab unmounts and workspace refresh", async () => {
  const workspace = jest.mocked(WorkspaceShell);
  workspace.mockImplementation(({ activeTabContent, editorModals }) => createElement(Fragment, null, activeTabContent, editorModals));
  try {
    const view = render(createElement(App));
    await signIn();
    act(() => screenProps().setActiveTab("work-tasks"));
    fireEvent.press(view.getByText("Filters"));
    fireEvent.changeText(view.getByPlaceholderText("Search tasks"), "Steel");
    act(() => screenProps().setActiveTab("resources-purchases"));
    fireEvent.press(view.getByText("Filters"));
    fireEvent.changeText(view.getByPlaceholderText("Search purchasing"), "Bolts");
    act(() => screenProps().setActiveTab("work-tasks"));
    fireEvent.press(view.getByText("Filters"));
    expect(view.getByPlaceholderText("Search tasks").props.value).toBe("Steel");
    await act(async () => { shell().onRefresh(); });
    expect(view.getByPlaceholderText("Search tasks").props.value).toBe("Steel");
    act(() => screenProps().setActiveTab("resources-purchases"));
    fireEvent.press(view.getByText("Filters"));
    expect(view.getByPlaceholderText("Search purchasing").props.value).toBe("Bolts");
  } finally {
    workspace.mockImplementation(({ editorModals }) => createElement(Fragment, null, editorModals));
  }
});

test("materials and parts filters survive screen unmounts and refreshed collections", async () => {
  const workspace = jest.mocked(WorkspaceShell);
  workspace.mockImplementation(({ activeTabContent, editorModals }) => createElement(Fragment, null, activeTabContent, editorModals));
  try {
    const view = render(createElement(App));
    await signIn();
    act(() => screenProps().setActiveTab("resources-materials"));
    fireEvent.changeText(view.getByLabelText("Search materials"), "Steel");
    act(() => screenProps().materialsBrowse.updateFilters({ category: "metal", stock: "low" }));
    act(() => screenProps().setActiveTab("resources-parts"));
    fireEvent.changeText(view.getByLabelText("Search parts"), "Plate");
    act(() => screenProps().partsBrowse.updateFilters({ subsystemId: "drive", status: "available" }));
    act(() => screenProps().setActiveTab("resources-materials"));
    expect(view.getByLabelText("Search materials").props.value).toBe("Steel");
    await act(async () => { shell().onRefresh(); });
    expect(screenProps().materialsBrowse.filters).toEqual({ search: "Steel", category: "metal", stock: "low" });
    act(() => screenProps().setActiveTab("resources-parts"));
    expect(view.getByLabelText("Search parts").props.value).toBe("Plate");
    expect(screenProps().partsBrowse.filters).toEqual({ search: "Plate", subsystemId: "drive", status: "available" });
  } finally {
    workspace.mockImplementation(({ editorModals }) => createElement(Fragment, null, editorModals));
  }
});

test("subsystem search and expansion survive rendered tab navigation and refresh", async () => {
  const workspace = jest.mocked(WorkspaceShell);
  workspace.mockImplementation(({ activeTabContent, editorModals }) => createElement(Fragment, null, activeTabContent, editorModals));
  try {
    const view = render(createElement(App));
    await signIn();
    act(() => screenProps().setActiveTab("resources-structure"));
    const selected = screenProps().subsystemBrowse.rows.find((row) => row.isExpanded)!.subsystem;
    fireEvent.changeText(view.getByLabelText("Search subsystems"), selected.name);
    expect(view.getByText("HIDE")).toBeTruthy();
    fireEvent.press(view.getByText(selected.name));
    expect(view.queryByText("HIDE")).toBeNull();
    act(() => screenProps().setActiveTab("resources-parts"));
    act(() => screenProps().setActiveTab("resources-structure"));
    expect(view.getByLabelText("Search subsystems").props.value).toBe(selected.name);
    await act(async () => { shell().onRefresh(); });
    expect(view.queryByText("HIDE")).toBeNull();
    fireEvent.press(view.getByText(selected.name));
    fireEvent.changeText(view.getByLabelText("Search subsystems"), "no matching subsystem");
    expect(view.getByText("No subsystems match the current search.")).toBeTruthy();
    fireEvent.changeText(view.getByLabelText("Search subsystems"), selected.name);
    expect(view.getByText("HIDE")).toBeTruthy();
    await act(async () => { shell().onRefresh(); });
    expect(view.getByText("HIDE")).toBeTruthy();
  } finally {
    workspace.mockImplementation(({ editorModals }) => createElement(Fragment, null, editorModals));
  }
});
