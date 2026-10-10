import { createElement, Fragment, type ReactElement } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import App from "../../../App";
import { isLocalDevAuthBypassEnabled } from "../../data/devAuthBypass";
import { ApiRequestError, requestJson } from "../../data/api";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import { LoginScreen } from "../components/LoginScreen";
import { WorkspaceShell } from "../components/WorkspaceShell";
import { loadPersistedAuthSession, savePersistedAuthSession } from "../../services/authSessionStorage";
import type { AppScreenProps } from "../../screens/types";
import type { TaskScreenProps } from "../../screens/tasks/taskScreenTypes";

jest.mock("../../data/api", () => ({ ...jest.requireActual("../../data/api"), requestJson: jest.fn() }));
jest.mock("../../data/devAuthBypass", () => ({ ...jest.requireActual("../../data/devAuthBypass"), isLocalDevAuthBypassEnabled: jest.fn(() => true) }));
jest.mock("../components/LoginScreen", () => ({ LoginScreen: jest.fn(() => null) }));
jest.mock("../components/WorkspaceShell", () => ({ WorkspaceShell: jest.fn(({ editorModals }) => editorModals) }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), getAllKeys: jest.fn(async () => []) }));
jest.mock("../../services/authSessionStorage", () => ({ getOrCreateAuthDeviceNumber: jest.fn(async () => "test"), loadPersistedAuthSession: jest.fn(async () => null), clearPersistedAuthSession: jest.fn(async () => undefined), savePersistedAuthSession: jest.fn(async () => undefined) }));
jest.mock("../../services/workLogTimerNotifications", () => ({ cancelWorkLogTimerReminders: jest.fn(async () => undefined), clearPersistedWorkLogTimerState: jest.fn(async () => undefined), restorePersistedWorkLogTimerReminder: jest.fn(async () => null), persistWorkLogTimerState: jest.fn(async () => undefined), schedulePersistedWorkLogTimerReminders: jest.fn(async () => []) }));

const task = { ...mecoSnapshot.tasks[0], status: "waiting-for-qa", isBlocked: false, isWaitingOnDependency: false };
let reports: object[];
let failSave: boolean;
let failRefresh: boolean;
const request = jest.mocked(requestJson);
function shell() { return jest.mocked(WorkspaceShell).mock.calls.at(-1)![0]; }
function screenProps() { return (shell().activeTabContent as ReturnType<typeof createElement<{ screenProps: AppScreenProps }>>).props.screenProps; }
function taskProps() { return (shell().activeTabContent as ReactElement<{ taskContent: ReactElement<TaskScreenProps> }>).props.taskContent.props; }

beforeEach(() => {
  jest.clearAllMocks(); jest.mocked(isLocalDevAuthBypassEnabled).mockReturnValue(true); reports = []; failSave = false; failRefresh = false; jest.mocked(loadPersistedAuthSession).mockResolvedValue(null);
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

test("accepted milestone creation closes its draft when bootstrap refresh fails", async () => {
  const view = render(createElement(App));
  await signIn();
  act(() => taskProps().openCreateMilestoneEditor());
  fireEvent.changeText(view.getByLabelText("Title"), "Inspection deadline");
  failRefresh = true;
  await act(async () => { fireEvent.press(view.getByRole("button", { name: "Create milestone" })); });
  expect(request.mock.calls.filter(([, path, init]) => path === "/api/milestones" && init?.method === "POST")).toHaveLength(1);
  expect(view.queryByRole("button", { name: "Create milestone" })).toBeNull();
  expect(shell().syncError).toContain("Saved. Workspace refresh failed:");
});

test("mixed deadline shift outcomes reconcile persisted dates after every request settles", async () => {
  const secondTask = { ...task, id: "second-task", dueDate: "2026-10-12" };
  let firstDueDate = "2026-10-10";
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation(async (base, path, init, ...rest) => {
    if (path === "/api/bootstrap") return { ...mecoSnapshot, tasks: [{ ...task, dueDate: firstDueDate }, secondTask], reports: [], taskDependencies: [] };
    if (path === `/api/tasks/${task.id}` && init?.method === "PATCH") { firstDueDate = JSON.parse(String(init.body)).dueDate; return {}; }
    if (path === "/api/tasks/second-task" && init?.method === "PATCH") throw new Error("Second task rejected");
    return originalRequest(base, path, init, ...rest);
  });
  render(createElement(App));
  await signIn();
  await act(async () => { await screenProps().shiftTaskDueDates(screenProps().tasks, 1); });
  expect(screenProps().tasks.map(({ dueDate }) => dueDate)).toEqual(["2026-10-11", "2026-10-12"]);
  expect(shell().syncError).toBe("Second task rejected");
});

test("a successful old-session bootstrap cannot overwrite the newly signed-in workspace", async () => {
  render(createElement(App));
  await signIn();
  let respond!: (payload: unknown) => void;
  const originalRequest = request.getMockImplementation()!;
  let delayNextBootstrap = true;
  request.mockImplementation((base, path, ...rest) => {
    if (path === "/api/bootstrap" && delayNextBootstrap) {
      delayNextBootstrap = false;
      return new Promise((resolve) => { respond = resolve; });
    }
    return originalRequest(base, path, ...rest);
  });
  let refreshing!: Promise<void>;
  act(() => { refreshing = shell().onRefresh() as unknown as Promise<void>; });
  await waitFor(() => expect(respond).toBeDefined());
  await act(async () => { await shell().onSignOut(); });
  await signIn();
  await act(async () => { respond({ ...mecoSnapshot, tasks: [{ ...task, id: "stale-task" }] }); await refreshing; });
  expect(screenProps().tasks).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "stale-task" })]));
});

test("accepted creation followed by authentication rejection clears the create draft", async () => {
  const view = render(createElement(App));
  await signIn();
  act(() => taskProps().openCreateMilestoneEditor());
  fireEvent.changeText(view.getByLabelText("Title"), "Saved before expiry");
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation((base, path, ...rest) => {
    if (path === "/api/bootstrap") return Promise.reject(new ApiRequestError("expired", 401, null));
    return originalRequest(base, path, ...rest);
  });
  await act(async () => { fireEvent.press(view.getByRole("button", { name: "Create milestone" })); });
  expect(view.queryByRole("button", { name: "Create milestone" })).toBeNull();
  request.mockImplementation(originalRequest);
  await signIn();
  expect(view.queryByRole("button", { name: "Create milestone" })).toBeNull();
  expect(request.mock.calls.filter(([, path, init]) => path === "/api/milestones" && init?.method === "POST")).toHaveLength(1);
});

test("late email verification cannot supersede a newer sign-in", async () => {
  render(createElement(App));
  await waitFor(() => expect(LoginScreen).toHaveBeenCalled());
  act(() => { jest.mocked(LoginScreen).mock.calls.at(-1)![0].setAuthEmail("member@mecorobotics.org"); jest.mocked(LoginScreen).mock.calls.at(-1)![0].setHasRequestedEmailCode(true); jest.mocked(LoginScreen).mock.calls.at(-1)![0].setAuthCode("123456"); });
  let respond!: (session: unknown) => void;
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation((base, path, ...rest) => path === "/api/auth/mobile/email/verify"
    ? new Promise((resolve) => { respond = resolve; }) : originalRequest(base, path, ...rest));
  let verifying!: Promise<void>;
  act(() => { verifying = jest.mocked(LoginScreen).mock.calls.at(-1)![0].signInWithEmail() as unknown as Promise<void>; });
  await waitFor(() => expect(respond).toBeDefined());
  await signIn();
  await act(async () => { respond({ token: "old-email-token", user: { accountId: "old-account" } }); await verifying; });
  expect(request.mock.calls.filter(([, path]) => path === "/api/bootstrap")).toHaveLength(1);
});

test("task QA requests persist through refresh and remount using one atomic command", async () => {
  let persistedTask: typeof task = { ...task, status: "in-progress" };
  const qaRequests: object[] = [];
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation(async (base, path, init, ...rest) => {
    if (path === "/api/bootstrap") return { ...mecoSnapshot, tasks: [persistedTask], qaRequests, reports: [], taskDependencies: [] };
    if (path === "/api/qa-requests") {
      const item = { id: "persisted-qa-request", projectId: persistedTask.projectId, ...JSON.parse(String(init?.body)), requestedById: "ava", status: "requested", createdAt: "2026-10-10" };
      qaRequests.push(item);
      persistedTask = { ...persistedTask, status: "waiting-for-qa" };
      return { item, task: persistedTask };
    }
    return originalRequest(base, path, init, ...rest);
  });
  const view = render(createElement(App));
  await signIn();
  await act(async () => { await taskProps().requestTaskQa(screenProps().tasks[0]); });
  expect(screenProps().qaRequests).toEqual(expect.arrayContaining([expect.objectContaining({ id: "persisted-qa-request" })]));
  expect(screenProps().tasks[0].status).toBe("waiting-for-qa");
  expect(request.mock.calls.filter(([, , init]) => init?.method === "POST").map(([, path]) => path)).toEqual(["/api/qa-requests"]);
  expect(request.mock.calls.some(([, path, init]) => path.startsWith("/api/tasks/") && init?.method === "PATCH")).toBe(false);
  view.unmount();
  render(createElement(App));
  await signIn();
  expect(screenProps().qaRequests[0].id).toBe("persisted-qa-request");
});

test("failed task start keeps the authoritative task status and leaves the work-log editor closed", async () => {
  const readyTask = { ...task, ownerId: "ava", status: "not-started" as const };
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation(async (base, path, init, ...rest) => {
    if (path === "/api/bootstrap") return { ...mecoSnapshot, tasks: [readyTask], reports: [], taskDependencies: [] };
    if (path.startsWith("/api/tasks/") && init?.method === "PATCH") throw new Error("Start rejected");
    return originalRequest(base, path, init, ...rest);
  });
  const view = render(createElement(App));
  await waitFor(() => expect(LoginScreen).toHaveBeenCalled());
  act(() => jest.mocked(LoginScreen).mock.calls.at(-1)![0].setAuthEmail("ava@team7667.org"));
  await signIn();
  await act(async () => { await taskProps().startTask(screenProps().tasks[0]); });
  expect(request.mock.calls.some(([, path, init]) => path === `/api/tasks/${task.id}` && init?.method === "PATCH")).toBe(true);
  expect(screenProps().tasks[0].status).toBe("not-started");
  expect(view.queryByRole("button", { name: "Save work log" })).toBeNull();
});

test("late remote dev sign-in cannot supersede a newer local sign-in", async () => {
  jest.mocked(isLocalDevAuthBypassEnabled).mockReturnValue(false);
  let respond!: (session: unknown) => void;
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation((base, path, ...rest) => {
    if (path === "/api/auth/config") return Promise.resolve({ enabled: false, devBypassAvailable: true, hostedDomain: "mecorobotics.org", emailEnabled: true });
    if (path === "/api/auth/dev-bypass") return new Promise((resolve) => { respond = resolve; });
    return originalRequest(base, path, ...rest);
  });
  render(createElement(App));
  await waitFor(() => expect(LoginScreen).toHaveBeenCalled());
  let signingIn!: Promise<void>;
  act(() => { signingIn = jest.mocked(LoginScreen).mock.calls.at(-1)![0].signInWithDevBypass() as unknown as Promise<void>; });
  await waitFor(() => expect(respond).toBeDefined());
  jest.mocked(isLocalDevAuthBypassEnabled).mockReturnValue(true);
  act(() => jest.mocked(LoginScreen).mock.calls.at(-1)![0].setAuthEmail("new@mecorobotics.org"));
  await signIn();
  await act(async () => { respond({ token: "old-dev-token", user: { accountId: "old-account" } }); await signingIn; });
  expect(request.mock.calls.filter(([, path]) => path === "/api/bootstrap")).toHaveLength(1);
});

test.each([false, true])("older bootstrap cannot overwrite a newer accepted mutation snapshot (failure=%s)", async (fails) => {
  render(createElement(App));
  await signIn();
  let respondOld!: (payload: unknown) => void;
  let rejectOld!: (error: Error) => void;
  let delayNextBootstrap = true;
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation((base, path, ...rest) => {
    if (path === "/api/bootstrap") {
      if (delayNextBootstrap) {
        delayNextBootstrap = false;
        return new Promise((resolve, reject) => { respondOld = resolve; rejectOld = reject; });
      }
      return Promise.resolve({ ...mecoSnapshot, tasks: [{ ...task, title: "Newly saved task" }], reports: [], taskDependencies: [] });
    }
    return originalRequest(base, path, ...rest);
  });
  let oldRefresh!: Promise<void>;
  act(() => { oldRefresh = shell().onRefresh() as unknown as Promise<void>; });
  await waitFor(() => expect(respondOld).toBeDefined());
  await act(async () => { await screenProps().mutate(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ title: "Newly saved task" }) }); });
  expect(screenProps().tasks[0].title).toBe("Newly saved task");
  await act(async () => {
    if (fails) rejectOld(new Error("Obsolete refresh failure"));
    else respondOld({ ...mecoSnapshot, tasks: [task], reports: [], taskDependencies: [] });
    await oldRefresh;
  });
  expect(screenProps().tasks[0].title).toBe("Newly saved task");
  expect(shell().syncError).toBeNull();
});

test("a captured old-session mutation callback cannot issue a request after a new sign-in", async () => {
  render(createElement(App));
  await signIn();
  const oldMutation = screenProps().mutate;
  await act(async () => { await shell().onSignOut(); });
  await signIn();
  const before = request.mock.calls.length;
  await act(async () => { expect(await oldMutation("/api/tasks/stale-task", { method: "PATCH", body: "{}" })).toBe(false); });
  expect(request.mock.calls).toHaveLength(before);
});

test("successful mobile email sign-in durably saves its session and loads theme and bootstrap with its new token", async () => {
  const mobileSession = {
    token: "new-mobile-token", refreshToken: "new-refresh-token", accessTokenExpiresAt: "2999-01-01T00:00:00Z", sessionExpiresAt: "2999-01-02T00:00:00Z",
    user: { accountId: "ava", authProvider: "email", email: "ava@team7667.org", name: "Ava Chen", picture: null, hostedDomain: "team7667.org", role: "student" },
    session: { id: "new-mobile-session", createdAt: "2026-10-10T00:00:00Z", lastUsedAt: "2026-10-10T00:00:00Z" },
  };
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation((base, path, ...rest) => {
    if (path === "/api/auth/mobile/email/verify") return Promise.resolve(mobileSession);
    if (path === "/api/users/me/preferences") return Promise.resolve({ themeMode: "dark" });
    return originalRequest(base, path, ...rest);
  });
  render(createElement(App));
  await waitFor(() => expect(LoginScreen).toHaveBeenCalled());
  act(() => { jest.mocked(LoginScreen).mock.calls.at(-1)![0].setAuthEmail("member@mecorobotics.org"); jest.mocked(LoginScreen).mock.calls.at(-1)![0].setHasRequestedEmailCode(true); jest.mocked(LoginScreen).mock.calls.at(-1)![0].setAuthCode("123456"); });
  await act(async () => { await jest.mocked(LoginScreen).mock.calls.at(-1)![0].signInWithEmail(); });
  await waitFor(() => expect(WorkspaceShell).toHaveBeenCalled());
  expect(savePersistedAuthSession).toHaveBeenCalledWith(expect.objectContaining({ token: "new-mobile-token", deviceNumber: "test" }));
  expect(request.mock.calls.find(([, path]) => path === "/api/users/me/preferences")?.[3]).toBe("new-mobile-token");
  expect(request.mock.calls.find(([, path]) => path === "/api/bootstrap")?.[3]).toBe("new-mobile-token");
  expect(taskProps().signedInMember?.id).toBe("ava");
});

test.each(["maya", "inactive-mentor", null, "preferred-mentor"])("QA selection skips admins and inactive assigned mentors (%s)", async (assignedMentor) => {
  const admin = mecoSnapshot.members.find((member) => member.role === "admin")!;
  const mentor = mecoSnapshot.members.find((member) => member.role === "mentor")!;
  const preferred = { ...mentor, id: "preferred-mentor" };
  const inactive = { ...mentor, id: "inactive-mentor", seasonId: "past-season", activeSeasonIds: ["past-season"] };
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation((base, path, ...rest) => path === "/api/bootstrap"
    ? Promise.resolve({ ...mecoSnapshot, members: [admin, inactive, mentor, preferred], tasks: [{ ...task, status: "in-progress", mentorId: assignedMentor }], reports: [], taskDependencies: [] })
    : originalRequest(base, path, ...rest));
  render(createElement(App));
  await signIn();
  await act(async () => { await taskProps().requestTaskQa(screenProps().tasks[0]); });
  const create = request.mock.calls.find(([, path, init]) => path === "/api/qa-requests" && init?.method === "POST");
  expect(JSON.parse(String(create?.[2]?.body)).mentorId).toBe(assignedMentor === preferred.id ? preferred.id : mentor.id);
});

test("QA selection reports missing eligible mentors without issuing a write", async () => {
  const admin = mecoSnapshot.members.find((member) => member.role === "admin")!;
  const mentor = mecoSnapshot.members.find((member) => member.role === "mentor")!;
  const inactive = { ...mentor, seasonId: "past-season", activeSeasonIds: ["past-season"] };
  const originalRequest = request.getMockImplementation()!;
  request.mockImplementation((base, path, ...rest) => path === "/api/bootstrap"
    ? Promise.resolve({ ...mecoSnapshot, members: [admin, inactive], tasks: [{ ...task, status: "in-progress", mentorId: inactive.id }], reports: [], taskDependencies: [] })
    : originalRequest(base, path, ...rest));
  render(createElement(App));
  await signIn();
  await act(async () => { await taskProps().requestTaskQa(screenProps().tasks[0]); });
  expect(request.mock.calls.some(([, path, init]) => path === "/api/qa-requests" && init?.method === "POST")).toBe(false);
  expect(shell().syncError).toBe("Assign an active mentor in this task's season before requesting QA.");
  expect(screenProps().tasks[0].status).toBe("in-progress");
});
