import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Linking } from "react-native";
import { appThemes } from "../../../theme";
import { AppThemeProvider } from "../../../ui/themeContext";
import { DocumentsScreen } from "../DocumentsScreen";
import type { AppScreenProps } from "../../types";

jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

test("lists project documents with typed evidence targets and opens their URI", () => {
  const props = {
    artifacts: [{
      id: "artifact-1", projectId: "robot", kind: "evidence", title: "Drive test video",
      summary: "Practice evidence", status: "published", uri: "https://example.test/drive-test",
      targetRefs: [{ kind: "task", id: "task-1" }], updatedAt: "2026-09-30T12:00:00Z",
    }],
    projectsById: { robot: { name: "Robot" } },
    appResponsiveStyles: { rowCard: {}, rowTitle: {}, rowSubtitle: {}, rowBody: {}, metaLine: {} },
  } as unknown as AppScreenProps;
  const view = render(createElement(AppThemeProvider, { value: { colors: appThemes.light, mode: "light" } },
    createElement(DocumentsScreen, props)));

  expect(view.getByText("Robot · evidence · published")).toBeTruthy();
  expect(view.getByText("task: task-1")).toBeTruthy();
  fireEvent.press(view.getByRole("link", { name: "Open Drive test video" }));
  expect(Linking.openURL).toHaveBeenCalledWith("https://example.test/drive-test");
});

test("shows an empty state when no artifacts exist", () => {
  const props = { artifacts: [], projectsById: {}, appResponsiveStyles: {} } as unknown as AppScreenProps;
  const view = render(createElement(AppThemeProvider, { value: { colors: appThemes.light, mode: "light" } },
    createElement(DocumentsScreen, props)));
  expect(view.getByText("No documents or evidence have been added yet.")).toBeTruthy();
});
