import { act, renderHook } from "@testing-library/react-native";
import { usePurchaseEditor } from "../editorModals/usePurchaseEditor";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";

const purchase = mecoSnapshot.purchaseItems[0];
function setup(canMentorApprove = false, succeeds = true) {
  const mutate = jest.fn(async (_path: string, _init: RequestInit) => succeeds);
  return { mutate, ...renderHook(() => usePurchaseEditor({ tasks: mecoSnapshot.tasks, materials: [], vendors: mecoSnapshot.vendors, purchaseItems: mecoSnapshot.purchaseItems, canMentorApprove, mutate })) };
}

test("purchase creation links commercial state to one procurement Task", async () => {
  const { result, mutate } = setup();
  act(() => result.current.open());
  act(() => result.current.updateDraft({ taskId: mecoSnapshot.tasks[0].id, title: "Order motor", vendorId: mecoSnapshot.vendors[0].id, quantity: "2", amount: "45" }));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][0]).toBe("/api/purchases");
  const body = JSON.parse(mutate.mock.calls[0][1].body as string);
  expect(body).toMatchObject({ taskId: mecoSnapshot.tasks[0].id, title: "Order motor", approvalStatus: "pending", orderStatus: "not-ordered" });
  expect(body.quotes[0]).toMatchObject({ vendorId: mecoSnapshot.vendors[0].id, amount: { amount: 45, currency: "USD" } });
  expect(body).not.toHaveProperty("requestedById");
});

test("editing and deleting retain record identity and permission", async () => {
  const { result, mutate } = setup(true);
  act(() => result.current.open(purchase));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][0]).toBe(`/api/purchases/${purchase.id}`);
  expect(mutate.mock.calls[0][1].method).toBe("PATCH");
  act(() => result.current.open(purchase));
  await act(async () => { await result.current.deletePurchase(); });
  expect(mutate.mock.calls[1][1].method).toBe("DELETE");
});

test("restock creates a commercial draft that still requires a procurement Task", () => {
  const { result } = setup();
  act(() => result.current.restock({ id: "steel", name: "Steel", category: "metal", onHand: 1, reorderPoint: 6, openDemand: 0, openPurchaseCount: 0, openPurchaseQuantity: 0, suggestedOrderQuantity: 4, vendor: "See purchasing records", stock: "low" }));
  expect(result.current).toMatchObject({ id: null, visible: true, draft: { title: "Restock Steel", taskId: "", quantity: "4", materialId: "steel" } });
});

test("invalid drafts are retained until required procurement ownership is supplied", async () => {
  const { result, mutate } = setup(true, false);
  act(() => result.current.open());
  act(() => result.current.updateDraft({ title: "Order hardware", quantity: "0" }));
  await act(async () => { await result.current.save(); });
  expect(mutate).not.toHaveBeenCalled();
  expect(result.current.error).toContain("procurement task");
  expect(result.current.visible).toBe(true);
});
