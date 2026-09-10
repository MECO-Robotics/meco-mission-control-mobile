import { createElement } from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { EditorModal } from "../editorWidgets";
import { ModalField, ParticipantField, ToggleField } from "../editorFieldWidgets";
import { DropdownField } from "../selectionFieldWidgets";
import { OptionChipRow, SearchField } from "../selectionWidgets";
import { getResponsiveMetrics } from "../responsive";

test("editor ignores repeated save and competing delete until mutation settles", async () => {
  let finish!: () => void;
  const onSave = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const onDelete = jest.fn();
  const onCancel = jest.fn();
  const view = render(createElement(EditorModal, { visible: true, title: "Edit", saveLabel: "Save", onSave, onDelete, onCancel }));
  fireEvent.press(view.getByRole("button", { name: "Save" }));
  fireEvent.press(view.getByRole("button", { name: "Saving…" }));
  fireEvent.press(view.getByRole("button", { name: "Delete" }));
  fireEvent.press(view.getByRole("button", { name: "Cancel" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onDelete).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  expect(view.getByRole("button", { name: "Saving…" }).props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  await act(async () => finish());
  fireEvent.press(view.getByRole("button", { name: "Save" }));
  expect(onSave).toHaveBeenCalledTimes(2);
  await act(async () => finish());
});

test("labels persist after entry and custom selections expose state", () => {
  const view = render(createElement(ModalField, { label: "Notes", placeholder: "Write notes", value: "Already entered", onChangeText: jest.fn() }));
  expect(view.getByLabelText("Notes").props.value).toBe("Already entered");
  view.unmount();
  const toggle = render(createElement(ToggleField, { label: "Mentor approved", value: true, onToggle: jest.fn() }));
  expect(toggle.getByRole("switch", { checked: true })).toBeTruthy();
  toggle.unmount();
  const chips = render(createElement(OptionChipRow, { allLabel: "All", options: [{ id: "a", name: "Active" }], value: "a", onChange: jest.fn() }));
  expect(chips.getByRole("button", { name: "Active", selected: true })).toBeTruthy();
  chips.unmount();
  const dropdown = render(createElement(DropdownField, { label: "Status", options: [{ id: "a", name: "Active" }], value: "a", onChange: jest.fn() }));
  fireEvent.press(dropdown.getByRole("button"));
  expect(dropdown.getByRole("button", { selected: true })).toBeTruthy();
});

test("participants display roster names and preserve IDs through toggles", () => {
  const onChange = jest.fn();
  const view = render(createElement(ParticipantField, { options: [{ id: "internal-1", name: "Ada" }, { id: "internal-2", name: "Lin" }], value: "internal-1", onChange }));
  expect(view.queryByText("internal-1")).toBeNull();
  fireEvent.press(view.getByRole("checkbox", { name: "Lin" }));
  expect(onChange).toHaveBeenCalledWith("internal-1,internal-2");
  fireEvent.press(view.getByRole("checkbox", { name: "Ada" }));
  expect(onChange).toHaveBeenLastCalledWith("");
});

test.each([320, 375, 430, 768])("search target does not shrink at width %s", (width) => {
  expect(getResponsiveMetrics(width).controlHeight).toBeGreaterThanOrEqual(48);
  const view = render(createElement(SearchField, { placeholder: "Search tasks", value: "", onChangeText: jest.fn() }));
  expect(view.getByLabelText("Search tasks")).toBeTruthy();
});

test("editor retains draft after a rejected save and enables retry", async () => {
  const onSave = jest.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(undefined);
  const view = render(createElement(EditorModal, { visible: true, title: "Edit", saveLabel: "Save", onSave, onCancel: jest.fn() },
    createElement(ModalField, { label: "Notes", placeholder: "Notes", value: "Keep this draft", onChangeText: jest.fn() })));
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Save" })));
  expect(view.getByRole("alert")).toBeTruthy();
  expect(view.getByLabelText("Notes").props.value).toBe("Keep this draft");
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Save" })));
  expect(onSave).toHaveBeenCalledTimes(2);
  expect(view.queryByRole("alert")).toBeNull();
});

test("pending editors freeze field edits and reopening clears prior action errors", async () => {
  let reject!: (error: Error) => void;
  const onSave = () => new Promise<void>((_, rejectPromise) => { reject = rejectPromise; });
  const onChangeText = jest.fn();
  const input = createElement(ModalField, { label: "Notes", placeholder: "Notes", value: "Saved draft", onChangeText });
  const props = { visible: true, title: "Edit", saveLabel: "Save", onSave, onCancel: jest.fn() };
  const view = render(createElement(EditorModal, props, input));
  fireEvent.press(view.getByRole("button", { name: "Save" }));
  const field = view.getByLabelText("Notes", { includeHiddenElements: true });
  expect(field.props.editable).toBe(false);
  fireEvent.changeText(field, "Lost edit");
  expect(onChangeText).not.toHaveBeenCalled();
  await act(async () => reject(new Error("Failed")));
  expect(view.getByRole("alert")).toBeTruthy();
  view.rerender(createElement(EditorModal, { ...props, visible: false }, input));
  view.rerender(createElement(EditorModal, props, input));
  expect(view.queryByRole("alert")).toBeNull();
  expect(view.getByLabelText("Notes").props.editable).toBe(true);
});
