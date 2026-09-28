import { createElement, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react-native";

import type { QaReview } from "../../../types/domain";
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
  const review: QaReview = {
    id: "qa-1",
    subjectTitle: "Drive test",
    participantIds: ["student-1"],
    requestedById: "student-1",
    mentorId: "mentor-1",
    result: "iteration-worthy",
    mentorApproved: true,
    notes: "Review the mounting plate.",
    evidenceNotes: "Photo attached.",
  };
  const view = render(createElement(QaReviewDetail, {
    review,
    membersById: {
      "student-1": { id: "student-1", name: "Student", role: "student" },
      "mentor-1": { id: "mentor-1", name: "Mentor", role: "mentor" },
    } as QaReviewDetailProps["membersById"],
    onClose,
  }));

  expect(view.getAllByText("Drive test")).toHaveLength(2);
  expect(view.getByText("Student")).toBeTruthy();
  expect(view.getByText("Mentor")).toBeTruthy();
  expect(view.getByText("Approved")).toBeTruthy();
  expect(view.getByText("Review the mounting plate.")).toBeTruthy();
  expect(view.getByText("Photo attached.")).toBeTruthy();
  expect(view.getByText("This finding should create or anchor a design iteration.")).toBeTruthy();

  fireEvent.press(view.getByRole("button", { name: "Done" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

type QaReviewDetailProps = Parameters<typeof QaReviewDetail>[0];
