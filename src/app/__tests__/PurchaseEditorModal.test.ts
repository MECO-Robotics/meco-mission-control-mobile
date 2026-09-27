import { createElement, Fragment } from "react";
import { Button } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { PurchaseEditorModal } from "../editorModals/PurchaseEditorModal";
import { usePurchaseEditor } from "../editorModals/usePurchaseEditor";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";

const purchase = mecoSnapshot.purchaseItems[0];

function Editor({ mutate }: { mutate: () => Promise<boolean> }) {
  const editor = usePurchaseEditor({
    ...mecoSnapshot,
    signedInMember: mecoSnapshot.members[1],
    canMentorApprove: true,
    mutate,
  });
  return createElement(Fragment, null,
    createElement(Button, { title: "Open purchase", onPress: () => editor.open(purchase) }),
    createElement(PurchaseEditorModal, {
      editor,
      appResponsiveStyles: { calloutBody: {}, calloutBox: {}, calloutTitle: {} },
      memberOptions: [],
      subsystemOptions: [],
    }),
  );
}

test.each([
  ["Update purchase", "saved"],
  ["Delete", "deleted"],
])("failed %s reports the outcome inside the editor and permits retry", async (action, verb) => {
  const mutate = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const view = render(createElement(Editor, { mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open purchase" }));
  await act(async () => fireEvent.press(view.getByRole("button", { name: action })));
  expect(view.getByText("Purchase needs attention")).toBeTruthy();
  expect(view.getByText(new RegExp(`Could not confirm the purchase was ${verb}`))).toBeTruthy();
  expect(view.getByLabelText("Title").props.value).toBe(purchase.title);
  await act(async () => fireEvent.press(view.getByRole("button", { name: action })));
  expect(mutate).toHaveBeenCalledTimes(2);
  expect(view.queryByText("Edit purchase")).toBeNull();
});
