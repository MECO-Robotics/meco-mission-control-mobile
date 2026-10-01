import { createElement } from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { appThemes } from "../../../theme";
import { AppThemeProvider } from "../../../ui/themeContext";
import type { Project, Risk, ResponsibleGroup, Subsystem, Task } from "../../../types/domain";
import { RiskEditorModal } from "../RiskEditorModal";
import type { ResponsiveScreenStyles } from "../../types";

const projects: Project[] = [{ id: "robot", teamId: "team", seasonId: "season", name: "Robot", projectType: "robot", description: "", status: "active" }];
const groups: ResponsibleGroup[] = [];
const subsystems: Subsystem[] = [{ id: "drive", projectId: "robot", name: "Drive", description: "", isCore: false, parentSubsystemId: null, responsibleEngineerId: null, mentorIds: [] }];
const tasks: Task[] = [];

function renderEditor(risk: Risk | null, onSave = jest.fn(async () => true)) {
  const view = render(createElement(AppThemeProvider, { value: { colors: appThemes.light, mode: "light" } },
    createElement(RiskEditorModal, { visible: true, risk, projects, groups, subsystems, tasks,
      appResponsiveStyles: {} as ResponsiveScreenStyles,
      onCancel: jest.fn(), onSave, onDelete: jest.fn(async () => true) })));
  return { view, onSave };
}

test("creates a manual risk through the canonical risk payload", async () => {
  const { view, onSave } = renderEditor(null);
  fireEvent.changeText(view.getByLabelText("Title"), "Sensor drift");
  fireEvent.changeText(view.getByLabelText("Detail"), "Encoder readings vary under load.");
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create risk" })));
  expect(onSave).toHaveBeenCalledWith(null, expect.objectContaining({
    projectId: "robot", title: "Sensor drift", category: "other", severity: "medium",
    status: "open", blocksWork: false, source: { kind: "manual" },
    relatedTargets: [], mitigationTaskId: null, ownerGroupId: null,
  }));
});

test("resolves an existing risk without changing its source or targets", async () => {
  const risk: Risk = {
    id: "risk-1", projectId: "robot", title: "Sensor drift", detail: "Encoder readings vary.",
    category: "design", severity: "high", status: "mitigating", blocksWork: true,
    source: { kind: "task", id: "task-1" }, relatedTargets: [{ kind: "subsystem", id: "drive" }],
    mitigationTaskId: "task-1", ownerGroupId: null, createdAt: "2026-04-20", updatedAt: "2026-04-20", resolvedAt: null,
  };
  const { view, onSave } = renderEditor(risk);
  fireEvent.press(view.getByRole("button", { name: "Status: mitigating" }));
  fireEvent.press(view.getByText("resolved"));
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Update risk" })));
  expect(onSave).toHaveBeenCalledWith("risk-1", expect.objectContaining({
    status: "resolved", source: { kind: "task", id: "task-1" },
    relatedTargets: [{ kind: "subsystem", id: "drive" }],
  }));
});
