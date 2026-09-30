import { createElement, Fragment } from "react";
import { Button } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { PartDefinitionEditorModal } from "../editorModals/PartDefinitionEditorModal";
import { usePartDefinitionEditor } from "../editorModals/usePartDefinitionEditor";
import type { PartDefinition } from "../../types/domain";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";

function Editor({ allowed, mutate, seed }: { allowed: boolean; mutate: (path: string, init: RequestInit) => Promise<boolean>; seed?: PartDefinition }) {
  const editor = usePartDefinitionEditor({ partDefinitions: seed ? [seed] : mecoSnapshot.partDefinitions, canCreateParts: allowed, mutate });
  return createElement(Fragment, null,
    createElement(Button, { title: "Open part", onPress: () => seed ? editor.edit(seed.id) : editor.open() }),
    createElement(PartDefinitionEditorModal, { editor, appResponsiveStyles: { calloutBody: {}, calloutBox: {}, calloutTitle: {} } }),
  );
}

test("part-definition defaults are catalog metadata with no procurement-work fields", async () => {
  const mutate = jest.fn(async (_path: string, _init: RequestInit) => false);
  const view = render(createElement(Editor, { allowed: true, mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  expect(view.getByRole("button", { name: "Default acquisition: Stock" })).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Default acquisition: Stock" }));
  fireEvent.press(view.getByRole("button", { name: "Manufacture" }));
  fireEvent.changeText(view.getByLabelText("Name"), "Bracket");
  fireEvent.changeText(view.getByLabelText("Part number"), "BR-1");
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(view.getByText(/Could not confirm the part definition was saved/)).toBeTruthy();
  const payload = JSON.parse(mutate.mock.calls[0][1].body as string);
  expect(payload).toMatchObject({ defaultAcquisitionMethod: "manufacture", name: "Bracket", partNumber: "BR-1" });
  expect(payload).not.toHaveProperty("taskId");
});

test("saving an uncertain creation does not submit a duplicate request", async () => {
  const mutate = jest.fn(async (_path: string, _init: RequestInit) => false);
  const view = render(createElement(Editor, { allowed: true, mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  fireEvent.changeText(view.getByLabelText("Name"), "Bracket");
  fireEvent.changeText(view.getByLabelText("Part number"), "BR-1");
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Create part definition" })));
  expect(mutate).toHaveBeenCalledTimes(1);
});

test("editing preserves CAD source and keeps acquisition preference in the definition", () => {
  const seed = { ...mecoSnapshot.partDefinitions[0], cadSource: "onshape" as const, defaultAcquisitionMethod: "purchase-cots" as const };
  const view = render(createElement(Editor, { allowed: true, mutate: jest.fn(async (_path: string, _init: RequestInit) => true), seed }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  expect(view.getByRole("button", { name: "CAD source: Onshape" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Default acquisition: Purchase COTS" })).toBeTruthy();
});

test("sessions without create permission see the permission notice", () => {
  const view = render(createElement(Editor, { allowed: false, mutate: jest.fn(async (_path: string, _init: RequestInit) => true) }));
  fireEvent.press(view.getByRole("button", { name: "Open part" }));
  expect(view.getByText("Team permission required")).toBeTruthy();
  expect(view.getByRole("button", { name: "Default acquisition: Stock" })).toBeTruthy();
});
