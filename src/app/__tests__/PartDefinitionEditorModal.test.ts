import { createElement, Fragment } from "react";
import { Button } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { PartDefinitionEditorModal } from "../editorModals/PartDefinitionEditorModal";
import { usePartDefinitionEditor } from "../editorModals/usePartDefinitionEditor";
import type { PartDefinition } from "../../types/domain";
import { mecoSnapshot } from "../../data/mockData";

function Editor({ allowed, mutate, seed }: { allowed: boolean; mutate: () => Promise<boolean>; seed?: PartDefinition }) {
  const editor = usePartDefinitionEditor({ ...mecoSnapshot, partDefinitions: seed ? [seed] : mecoSnapshot.partDefinitions, canCreateParts: allowed, mutate });
  return createElement(Fragment, null,
    createElement(Button, { title: "Open part", onPress: () => seed ? editor.edit(seed.id) : editor.open() }),
    createElement(PartDefinitionEditorModal, {
      editor, appResponsiveStyles: { calloutBody: {}, calloutBox: {}, calloutTitle: {} },
    }),
  );
}

test("acquisition fields appear only for authorized nonstock choices and require explicit selection", async () => {
  const mutate = jest.fn(async () => false);
  const view = render(createElement(Editor, { allowed: true, mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  expect(view.queryByRole("button", { name: "Subsystem: Select an option" })).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Acquisition method: Already stocked" }));
  fireEvent.press(view.getByRole("button", { name: "Manufacture" }));
  expect(view.getByRole("button", { name: "Subsystem: Select an option" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Discipline: Select an option" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Task owner: Select an option" })).toBeTruthy();
  expect(view.getByRole("button", { name: "QA mentor: Select an option" })).toBeTruthy();
  fireEvent.changeText(view.getByLabelText("Name"), "Bracket");
  fireEvent.changeText(view.getByLabelText("Part number"), "BR-1");
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(view.getByText(/Add subsystem, discipline, task owner, QA mentor/)).toBeTruthy();
  expect(mutate).not.toHaveBeenCalled();
});

test("stocked creation reports uncertainty locally without duplicating requests", async () => {
  const mutate = jest.fn(async () => false);
  const view = render(createElement(Editor, { allowed: true, mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  fireEvent.changeText(view.getByLabelText("Name"), "Bracket");
  fireEvent.changeText(view.getByLabelText("Part number"), "BR-1");
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(view.getByText(/Could not confirm the part definition was saved/)).toBeTruthy();
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(view.getByText(/Creation was already submitted/)).toBeTruthy();
});

test("editing shows a nonstandard saved source instead of replacing it", () => {
  const seed = { ...mecoSnapshot.partDefinitions[0], source: "Local machine shop" };
  const view = render(createElement(Editor, { allowed: true, mutate: jest.fn(async () => true), seed }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  expect(view.getByRole("button", { name: "Source: Local machine shop" })).toBeTruthy();
  expect(view.queryByRole("button", { name: /Acquisition method:/ })).toBeNull();
});

test("sessions without create permission see an accurate notice and cannot submit stocked parts", async () => {
  const mutate = jest.fn(async () => true);
  const view = render(createElement(Editor, { allowed: false, mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  expect(view.getByText("Team permission required")).toBeTruthy();
  expect(view.queryByRole("button", { name: /Acquisition method:/ })).toBeNull();
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(mutate).not.toHaveBeenCalled();
});
