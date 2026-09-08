import { createElement } from "react";
import { act, render } from "@testing-library/react-native";
import { WorkLogTimerDisplay } from "../WorkLogTimerDisplay";

jest.mock("../../../i18n", () => ({ Text: jest.requireActual("react-native").Text }));

test("timer ticks only its display and clears its interval on pause and unmount", () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-09-08T12:00:00Z"));
  let parentRenders = 0;
  const timer = { id: "timer", startedAt: Date.now(), elapsedMs: 0, isPaused: false, reminderNotificationIds: [] };
  function Parent() { parentRenders += 1; return createElement(WorkLogTimerDisplay, { timer }); }
  const view = render(createElement(Parent));
  expect(view.getByText("0:00")).toBeTruthy();
  act(() => jest.advanceTimersByTime(3000));
  expect(view.getByText("0:03")).toBeTruthy();
  expect(parentRenders).toBe(1);
  view.rerender(createElement(WorkLogTimerDisplay, { timer: { ...timer, isPaused: true, elapsedMs: 3000, startedAt: null } }));
  expect(jest.getTimerCount()).toBe(0);
  view.rerender(createElement(WorkLogTimerDisplay, { timer }));
  view.unmount();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});
