import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react-native";

import type { AppThemeColors } from "../../../theme";
import { LandscapeTimelineMonthPicker } from "../LandscapeTimelineMonthPicker";

jest.mock("../../../i18n", () => ({ Text: jest.requireActual("react-native").Text }));

test("one accessible month control opens the menu and selects months across years", () => {
  const onSelectMonth = jest.fn();
  const colors = {
    blue: "blue",
    border: "border",
    ink: "ink",
    navyInk: "navyInk",
    navySurface: "navySurface",
    surface: "surface",
    subtleText: "subtleText",
  } as AppThemeColors;
  const view = render(createElement(LandscapeTimelineMonthPicker, {
    colors,
    locale: "en-US",
    onSelectMonth,
    timelineStart: new Date(2026, 9, 1),
    timelineYear: 2026,
  }));

  expect(view.queryByText("Month")).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Select month October 2026" }));
  fireEvent.press(view.getByRole("button", { name: "Next year" }));
  expect(onSelectMonth).toHaveBeenCalledWith(new Date(2027, 9, 1));

  view.rerender(createElement(LandscapeTimelineMonthPicker, {
    colors,
    locale: "en-US",
    onSelectMonth,
    timelineStart: new Date(2027, 9, 1),
    timelineYear: 2027,
  }));

  fireEvent.press(view.getByRole("button", { name: "June 2027" }));
  expect(onSelectMonth).toHaveBeenLastCalledWith(new Date(2027, 5, 1));
});
