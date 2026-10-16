import { createElement, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";

import type { QaReport } from "../../../types/domain";
import { makeMember } from "../../../data/__tests__/fixtures/factories";
import { mecoSnapshot } from "../../../data/__tests__/fixtures/mockData";
import { QaReviewDetail } from "../QaReviewDetail";

jest.mock("../../../i18n", () => ({ Text: jest.requireActual("react-native").Text }));
jest.mock("../../../ui/ui", () => {
  const ReactModule = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text: NativeText, View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    EditorModal: ({ title, visible, onCancel, onSave, children }: {
      title: string;
      visible: boolean;
      onCancel: () => void;
      onSave: () => void;
      children: ReactNode;
    }) => visible ? ReactModule.createElement(View, null,
      ReactModule.createElement(NativeText, null, title),
      children,
      ReactModule.createElement(Pressable, { accessibilityRole: "button", onPress: onCancel }, ReactModule.createElement(NativeText, null, "Cancel")),
      ReactModule.createElement(Pressable, { accessibilityRole: "button", onPress: onSave }, ReactModule.createElement(NativeText, null, "Done")),
    ) : null,
  };
});

test("QA detail keeps reviewer, notes, evidence, and close actions in one modal", () => {
  const onClose = jest.fn();
  const review: QaReport = {
    id: "qa-1",
    projectId: "robot-project",
    targetRefs: [{ kind: "task", id: "task-1" }],
    createdByMemberId: "student-1",
    participantIds: ["student-1"],
    requestedById: "student-1",
    mentorId: "mentor-1",
    result: "iteration-worthy",
    reviewedById: "reviewer-1",
    reviewedAt: "2026-09-01",
    notes: "Review the mounting plate.",
    evidenceNotes: "Photo attached.",
    summary: "Drive test",
    createdAt: "2026-09-01",
    status: "reviewed",
    reportType: "qa",
  };
  const view = render(createElement(QaReviewDetail, {
    review,
    partDefinitionsById: {},
    membersById: {
      "student-1": makeMember({ id: "student-1", name: "Student", role: "student" }),
      "mentor-1": makeMember({ id: "mentor-1", name: "Mentor", role: "mentor" }),
      "reviewer-1": makeMember({ id: "reviewer-1", name: "QA Approver", role: "admin" }),
    },
    onClose,
  }));

  expect(view.getAllByText("Drive test")).toHaveLength(2);
  expect(view.getByText("Student")).toBeTruthy();
  expect(view.getByText("QA Approver")).toBeTruthy();
  expect(view.getByText("Mentor")).toBeTruthy();
  expect(view.getByText("reviewed")).toBeTruthy();
  expect(view.getByText("Review the mounting plate.")).toBeTruthy();
  expect(view.getByText("Photo attached.")).toBeTruthy();
  expect(view.getByText("This finding should create or anchor a design iteration.")).toBeTruthy();

  fireEvent.press(view.getByRole("button", { name: "Done" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test.each([
  ["stale", "Stale: one or more part definitions have changed since this review.", "revision-2"],
  ["current", "Current for the recorded part definitions.", "revision-1"],
])("QA detail explains %s recorded revision evidence", (_case, expected, currentRevision) => {
  const review: QaReport = {
    id: "qa-revision", projectId: "robot-project", targetRefs: [{ kind: "part-definition", id: "part-1" }],
    createdByMemberId: null, participantIds: [], mentorId: null, requestedById: null, summary: "Part review", notes: "",
    createdAt: "2026-10-01", status: "reviewed", reportType: "qa", result: "pass", reviewedById: "mentor-1",
    reviewedAt: "2026-10-01", targetRevisions: { "part-1": "revision-1" },
  };
  const view = render(createElement(QaReviewDetail, {
    review, membersById: {}, partDefinitionsById: { "part-1": { ...mecoSnapshot.partDefinitions[0], id: "part-1", revision: currentRevision } }, onClose: jest.fn(),
  }));
  expect(view.getByText(expected)).toBeTruthy();
});

test("legacy part QA detail reports revision freshness as unknown", () => {
  const review: QaReport = {
    id: "qa-legacy", projectId: "robot-project", targetRefs: [{ kind: "part-instance", id: "instance-1" }],
    createdByMemberId: null, participantIds: [], mentorId: null, requestedById: null, summary: "Legacy review", notes: "",
    createdAt: "2026-10-01", status: "reviewed", reportType: "qa", result: "pass", reviewedById: "mentor-1", reviewedAt: "2026-10-01",
  };
  const view = render(createElement(QaReviewDetail, { review, membersById: {}, partDefinitionsById: {}, onClose: jest.fn() }));
  expect(view.getByText("Unknown: this report has no recorded target revisions.")).toBeTruthy();
});

test("submitted evidence that needs reverification is never labeled current or approved", () => {
  const review: QaReport = {
    id: "qa-submitted", projectId: "robot-project", targetRefs: [{ kind: "part-definition", id: "part-1" }],
    createdByMemberId: null, participantIds: [], mentorId: null, requestedById: null, summary: "Submitted review", notes: "",
    createdAt: "2026-10-01", status: "submitted", reportType: "qa", result: "pass", reviewedById: null, reviewedAt: null,
    targetRevisions: { "part-1": "revision-1" }, needsReverification: true,
  };
  const view = render(createElement(QaReviewDetail, {
    review, membersById: {}, partDefinitionsById: { "part-1": { ...mecoSnapshot.partDefinitions[0], id: "part-1", revision: "revision-1" } }, onClose: jest.fn(),
  }));
  expect(view.getByText("Needs re-verification: this historical evidence does not verify the target.")).toBeTruthy();
  expect(view.queryByText("Current for the recorded part definitions.")).toBeNull();
  expect(view.queryByText(/approved/i)).toBeNull();
});

test("submitted QA names no reviewer and keeps its assigned mentor separate", () => {
  const review: QaReport = {
    id: "qa-submitted-mentor", projectId: "robot-project", targetRefs: [{ kind: "task", id: "task-1" }],
    createdByMemberId: "student-1", participantIds: [], mentorId: "mentor-1", requestedById: "student-1",
    summary: "Submitted report", notes: "Waiting for review", createdAt: "2026-10-01", status: "submitted",
    reportType: "qa", result: "pass", reviewedById: null, reviewedAt: null,
  };
  const view = render(createElement(QaReviewDetail, {
    review,
    membersById: {
      "mentor-1": makeMember({ id: "mentor-1", name: "Assigned Mentor", role: "mentor" }),
    },
    partDefinitionsById: {},
    onClose: jest.fn(),
  }));

  expect(view.getByText("Not reviewed")).toBeTruthy();
  expect(view.getByText("Assigned Mentor")).toBeTruthy();
  expect(view.queryByText("Unknown reviewer")).toBeNull();
});

test("reviewed QA identifies the actual reviewing actor rather than the assigned mentor", () => {
  const review: QaReport = {
    id: "qa-reviewed-actor", projectId: "robot-project", targetRefs: [{ kind: "task", id: "task-1" }],
    createdByMemberId: "student-1", participantIds: [], mentorId: "mentor-1", requestedById: null,
    summary: "Reviewed report", notes: "", createdAt: "2026-10-01", status: "reviewed", reportType: "qa", result: "pass",
    reviewedById: "admin-1", reviewedAt: "2026-10-02",
  };
  const view = render(createElement(QaReviewDetail, {
    review,
    membersById: {
      "mentor-1": makeMember({ id: "mentor-1", name: "Assigned Mentor", role: "mentor" }),
      "admin-1": makeMember({ id: "admin-1", name: "Actual Reviewer", role: "admin" }),
    },
    partDefinitionsById: {},
    onClose: jest.fn(),
  }));

  expect(view.getByText("Actual Reviewer")).toBeTruthy();
  expect(view.getByText("Assigned Mentor")).toBeTruthy();
});
