import { createElement, Fragment } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import App from "../../../App";
import { requestJson } from "../../data/api";
import { mecoSnapshot } from "../../data/mockData";
import { LoginScreen } from "../components/LoginScreen";
import { WorkspaceShell } from "../components/WorkspaceShell";
import type { AppScreenProps } from "../../screens/types";

jest.mock("../../data/api", () => ({ ...jest.requireActual("../../data/api"), requestJson: jest.fn() }));
jest.mock("../../data/devAuthBypass", () => ({ ...jest.requireActual("../../data/devAuthBypass"), isLocalDevAuthBypassEnabled: () => true }));
jest.mock("../components/LoginScreen", () => ({ LoginScreen: jest.fn(() => null) }));
jest.mock("../components/WorkspaceShell", () => ({ WorkspaceShell: jest.fn(({ editorModals }) => editorModals) }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), getAllKeys: jest.fn(async () => []) }));
jest.mock("../../services/authSessionStorage", () => ({ getOrCreateAuthDeviceNumber: jest.fn(async () => "test"), loadPersistedAuthSession: jest.fn(async () => null), clearPersistedAuthSession: jest.fn(async () => undefined) }));
jest.mock("../../services/workLogTimerNotifications", () => ({ cancelWorkLogTimerReminders: jest.fn(async () => undefined), clearPersistedWorkLogTimerState: jest.fn(async () => undefined), restorePersistedWorkLogTimerReminder: jest.fn(async () => null) }));

const task = { ...mecoSnapshot.tasks[0], status: "waiting-for-qa", blockers: [], isBlocked: false, isWaitingOnDependency: false };
let reports: object[];
let failSave: boolean;
let failRefresh: boolean;
const request = jest.mocked(requestJson);
function shell() { return jest.mocked(WorkspaceShell).mock.calls.at(-1)![0]; }
function screenProps() { return (shell().activeTabContent as ReturnType<typeof createElement<{ screenProps: AppScreenProps }>>).props.screenProps; }

beforeEach(() => {
  jest.clearAllMocks(); reports = []; failSave = false; failRefresh = false;
  request.mockImplementation(async (_base, path, init) => {
    if (path === "/api/auth/config") return { enabled: false, hostedDomain: "mecorobotics.org", emailEnabled: true };
    if (path === "/api/bootstrap") {
      if (failRefresh) throw new Error("Refresh unavailable");
      return { ...mecoSnapshot, tasks: [task], qaReports: reports, qaRequests: [], taskDependencies: [], taskBlockers: [] };
    }
    if (path === "/api/qa-reports/submit") {
      if (failSave) throw new Error("Report write failed");
      const item = { ...JSON.parse(String(init?.body)), id: "persisted-report" };
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
  expect(screenProps().qaReviews).toEqual(expect.arrayContaining([expect.objectContaining({ id: "persisted-report", notes: "Bearing inspection passed" })]));
  expect(request.mock.calls.filter(([, , init]) => init?.method === "POST").map(([, path]) => path)).toEqual(["/api/qa-reports/submit", "/api/qa-reports/submit"]);
  view.unmount();
  failRefresh = false;
  render(createElement(App));
  await signIn();
  expect(screenProps().qaReviews[0].id).toBe("persisted-report");
});
