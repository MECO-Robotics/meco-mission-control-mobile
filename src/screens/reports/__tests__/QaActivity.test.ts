import { createElement, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { makeTask } from "../../../data/__tests__/fixtures/factories";
import type { QaRequest } from "../../../types/domain";
import { QaActivity } from "../QaActivity";

jest.mock("../../../i18n", () => ({ Text: jest.requireActual("react-native").Text }));
jest.mock("../../../ui/ActionButton", () => ({
  ActionButton: ({ children }: { children: ReactNode }) => jest.requireActual("react-native").createElement(jest.requireActual("react-native").Text, null, children),
}));
jest.mock("../../../ui/Callout", () => ({ Callout: () => null }));
jest.mock("../../../ui/ui", () => {
  const ReactModule = jest.requireActual<typeof import("react")>("react");
  const { Text, View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    DropdownField: () => null,
    EmptyState: ({ text }: { text: string }) => ReactModule.createElement(Text, null, text),
    EditorModal: ({ children, title, visible }: { children: ReactNode; title: string; visible: boolean }) =>
      visible ? ReactModule.createElement(View, null, ReactModule.createElement(Text, null, title), children) : null,
    ModalField: () => null,
    StatusPill: ({ label }: { label: string }) => ReactModule.createElement(Text, null, label),
    WorkspacePanel: ({ children }: { children: ReactNode }) => ReactModule.createElement(View, null, children),
  };
});

test("pending QA activity shows actions only for active requests and opens the active request context", () => {
  const task = makeTask({ id: "qa-task", title: "Inspect gearbox" });
  const makeRequest = (id: string, status: QaRequest["status"], requesterId: string, mentorId: string): QaRequest => ({
    id, projectId: task.projectId, targetRefs: [{ kind: "task", id: task.id }], subject: `${id} subject`,
    requestedById: requesterId, mentorId, createdAt: "2026-10-12", status,
  });
  const completed = makeRequest("completed-request", "complete", "old-requester", "old-mentor");
  const cancelled = makeRequest("cancelled-request", "cancelled", "cancelled-requester", "cancelled-mentor");
  const active = makeRequest("active-request", "in-review", "active-requester", "active-mentor");
  const openCreateQaReportEditor = jest.fn();
  const view = render(createElement(QaActivity, {
    mode: "pending", appResponsiveStyles: {}, canSubmitQa: true, createQaRequest: jest.fn(),
    helpRequests: [], membersById: {
      "old-requester": { id: "old-requester", name: "Old requester" },
      "old-mentor": { id: "old-mentor", name: "Old mentor" },
      "cancelled-requester": { id: "cancelled-requester", name: "Cancelled requester" },
      "cancelled-mentor": { id: "cancelled-mentor", name: "Cancelled mentor" },
      "active-requester": { id: "active-requester", name: "Active requester" },
      "active-mentor": { id: "active-mentor", name: "Active mentor" },
    },
    partDefinitionsById: {}, openCreateQaReportEditor, qaRequests: [completed, cancelled, active], qaReports: [],
    rosterMentors: [], taskById: { [task.id]: task }, taskDependencies: [], tasks: [task], workLogs: [],
  } as never));

  expect(view.getByText("active-request subject")).toBeTruthy();
  expect(view.getByText("Mentor assigned: Active mentor")).toBeTruthy();
  expect(view.getByText("Student requested: Active requester")).toBeTruthy();
  expect(view.getAllByText("Write report")).toHaveLength(1);
  expect(view.queryByText("completed-request subject")).toBeNull();
  expect(view.queryByText("cancelled-request subject")).toBeNull();
  fireEvent.press(view.getByText("Write report"));
  expect(openCreateQaReportEditor).toHaveBeenCalledWith(task.id, active.id);
});
