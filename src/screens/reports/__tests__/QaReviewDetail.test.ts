import { createElement, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";

import type { QaReport } from "../../../types/domain";
import { makeMember } from "../../../data/__tests__/fixtures/factories";
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
    reviewedById: "mentor-1",
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
    membersById: {
      "student-1": makeMember({ id: "student-1", name: "Student", role: "student" }),
      "mentor-1": makeMember({ id: "mentor-1", name: "Mentor", role: "mentor" }),
    },
    onClose,
  }));

  expect(view.getAllByText("Drive test")).toHaveLength(2);
  expect(view.getByText("Student")).toBeTruthy();
  expect(view.getByText("Mentor")).toBeTruthy();
  expect(view.getByText("reviewed")).toBeTruthy();
  expect(view.getByText("Review the mounting plate.")).toBeTruthy();
  expect(view.getByText("Photo attached.")).toBeTruthy();
  expect(view.getByText("This finding should create or anchor a design iteration.")).toBeTruthy();

  fireEvent.press(view.getByRole("button", { name: "Done" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
