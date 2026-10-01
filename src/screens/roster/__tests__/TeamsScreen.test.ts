import { createElement } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { appThemes } from "../../../theme";
import { AppThemeProvider } from "../../../ui/themeContext";
import type { AppScreenProps } from "../../types";
import { TeamsScreen } from "../TeamsScreen";

const group = { id: "group", seasonId: "season", name: "Build", projectIds: ["project"], memberIds: ["member"], isArchived: false };
function props(isArchived = false) {
  return {
    responsibleGroups: [{ ...group, isArchived }], members: [{ id: "member", name: "Student", role: "student", email: "", elevated: false, seasonId: "season", activeSeasonIds: ["season"] }],
    projects: [{ id: "project", teamId: "team", seasonId: "season", name: "Robot", projectType: "robot", description: "", status: "active" }],
    tasks: [], themeColors: appThemes.light, canMentorApprove: true, mutate: jest.fn(async () => true), syncFromBackend: jest.fn(async () => undefined),
    openTaskQueueFromTask: jest.fn(), setSelectedMemberId: jest.fn(), setActiveTab: jest.fn(),
  } as unknown as AppScreenProps;
}
function renderTeams(screenProps: AppScreenProps) {
  return render(createElement(AppThemeProvider, { value: { colors: appThemes.light, mode: "light" } }, createElement(TeamsScreen, screenProps)));
}

test("confirmed team edits and archive/restore mutations refresh bootstrap", async () => {
  const screenProps = props();
  const view = renderTeams(screenProps);

  fireEvent.press(view.getByText("Edit team"));
  fireEvent.press(view.getByText("Update team"));
  await waitFor(() => expect(screenProps.syncFromBackend).toHaveBeenCalledTimes(1));

  fireEvent.press(view.getByText("Archive"));
  await waitFor(() => expect(screenProps.syncFromBackend).toHaveBeenCalledTimes(2));

  const archivedProps = props(true);
  view.rerender(createElement(AppThemeProvider, { value: { colors: appThemes.light, mode: "light" } }, createElement(TeamsScreen, archivedProps)));
  fireEvent.press(view.getByRole("button", { name: "Show teams: Active" }));
  fireEvent.press(view.getByText("Archived"));
  fireEvent.press(view.getByText("Restore"));
  await waitFor(() => expect(archivedProps.syncFromBackend).toHaveBeenCalledTimes(1));
});
