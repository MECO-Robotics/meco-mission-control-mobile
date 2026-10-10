import { createElement, Fragment } from "react";
import { Button } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { PurchaseEditorModal } from "../editorModals/PurchaseEditorModal";
import { usePurchaseEditor } from "../editorModals/usePurchaseEditor";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";

const purchase = mecoSnapshot.purchaseItems[0];
function Editor({ mutate }: { mutate: () => Promise<boolean> }) {
  const editor = usePurchaseEditor({ tasks: mecoSnapshot.tasks, materials: [], vendors: mecoSnapshot.vendors, purchaseItems: mecoSnapshot.purchaseItems, canMentorApprove: true, mutate });
  return createElement(Fragment, null,
    createElement(Button, { title: "Open purchase", onPress: () => editor.open(purchase) }),
    createElement(PurchaseEditorModal, { editor, appResponsiveStyles: { calloutBody: {}, calloutBox: {}, calloutTitle: {} } }),
  );
}

test("failed commercial record update explains the outcome and permits retry", async () => {
  const mutate = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const view = render(createElement(Editor, { mutate }));
  fireEvent.press(view.getByRole("button", { name: "Open purchase" }));
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Update commercial record" })));
  expect(view.getByText("Purchase needs attention")).toBeTruthy();
  expect(view.getByText(/Could not confirm the purchase item was saved/)).toBeTruthy();
  expect(view.getByLabelText("Item").props.value).toBe(purchase.title);
  await act(async () => fireEvent.press(view.getByRole("button", { name: "Update commercial record" })));
  expect(mutate).toHaveBeenCalledTimes(2);
  expect(view.queryByText("Edit purchase")).toBeNull();
});
