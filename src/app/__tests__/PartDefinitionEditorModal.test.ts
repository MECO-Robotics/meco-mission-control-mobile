import { createElement, Fragment } from "react";
import { Button } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { PartDefinitionEditorModal } from "../editorModals/PartDefinitionEditorModal";
import { usePartDefinitionEditor } from "../editorModals/usePartDefinitionEditor";
import { mecoSnapshot } from "../../data/mockData";

function Editor({ allowed, mutate }: { allowed: boolean; mutate: () => Promise<boolean> }) {
  const editor = usePartDefinitionEditor({ ...mecoSnapshot, canCreateAcquisition: allowed, mutate });
  return createElement(Fragment, null,
    createElement(Button, { title: "Open part", onPress: editor.open }),
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

test("permission-limited stocked creation reports uncertainty locally without duplicating requests", async () => {
  const mutate = jest.fn(async () => false);
  const view = render(createElement(Editor, { allowed: false, mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  fireEvent.press(view.getByRole("button", { name: "Acquisition method: Already stocked" }));
  expect(view.queryByRole("button", { name: "Manufacture" })).toBeNull();
  expect(view.queryByRole("button", { name: "Purchase" })).toBeNull();
  fireEvent.press(view.getAllByRole("button", { name: "Already stocked" })[0]);
  fireEvent.changeText(view.getByLabelText("Name"), "Bracket");
  fireEvent.changeText(view.getByLabelText("Part number"), "BR-1");
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(view.getByText(/Could not confirm the part definition was saved/)).toBeTruthy();
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(view.getByText(/Creation was already submitted/)).toBeTruthy();
});
