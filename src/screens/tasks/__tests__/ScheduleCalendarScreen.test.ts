import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { appThemes } from "../../../theme";
import { AppThemeProvider } from "../../../ui/themeContext";
import { ScheduleCalendarScreen } from "../ScheduleCalendarScreen";
import type { ResponsiveScreenStyles } from "../../types";
import type { ScheduleEntry } from "../../../app/appModel";

const date = "2026-04-23T18:30:00Z";
const entries: ScheduleEntry[] = [
  { id: "shared-id", recordType: "meeting", title: "Design meeting", type: "review", startDateTime: date, endAt: null, description: "", projectIds: [] },
  { id: "shared-id", recordType: "event", title: "Drive practice", type: "practice", startDateTime: date, endAt: null, description: "", projectIds: [] },
  { id: "review-1", recordType: "milestone", title: "Design review", type: "internal-review", startDateTime: date, endAt: null, description: "", projectIds: [] },
];

function renderCalendar() {
  return render(createElement(AppThemeProvider, { value: { colors: appThemes.light, mode: "light" } },
    createElement(ScheduleCalendarScreen, {
      appResponsiveStyles: {} as ResponsiveScreenStyles, events: entries, openCreateMilestoneEditor: jest.fn(),
      openEditMilestoneEditor: jest.fn(),
    })));
}

test("calendar keeps meeting, event and milestone identities distinct on the same date", () => {
  const view = renderCalendar();
  expect(view.getAllByText("Design meeting").length).toBeGreaterThan(0);
  expect(view.getAllByText("Drive practice").length).toBeGreaterThan(0);
  expect(view.getAllByText("Design review").length).toBeGreaterThan(0);
  expect(view.getByText("meeting · review · Apr 23, 6:30 PM")).toBeTruthy();
  expect(view.getByText("event · practice · Apr 23, 6:30 PM")).toBeTruthy();
  expect(view.getByText("milestone · internal-review · Apr 23, 6:30 PM")).toBeTruthy();
});

test("calendar month controls change the visible month and clear the selected day", () => {
  const view = renderCalendar();
  fireEvent.press(view.getByText("Next"));
  expect(view.getByText("May 2026")).toBeTruthy();
  expect(view.getByText("No meetings, events, or milestones on this day.")).toBeTruthy();
});
