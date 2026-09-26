import { act, renderHook } from "@testing-library/react-native";
import { usePurchaseEditor } from "../editorModals/usePurchaseEditor";
import { mecoSnapshot } from "../../data/mockData";
import type { MaterialRollup } from "../../ui/types";

const purchase = mecoSnapshot.purchaseItems[0];
function setup(canMentorApprove = false, succeeds = true) {
  const mutate = jest.fn(async (_path: string, _init: RequestInit) => succeeds);
  return { mutate, ...renderHook(() => usePurchaseEditor({ ...mecoSnapshot,
    signedInMember: mecoSnapshot.members[1], canMentorApprove, mutate })) };
}

test.each([false, true])("create/edit/delete retain protected-field policy (mentor=%s)", async (mentor) => {
  const { result, mutate } = setup(mentor);
  act(() => result.current.open());
  expect(result.current.draft.requestedById).toBe(mecoSnapshot.members[0].id);
  act(() => result.current.updateDraft({ title: " Order ", vendor: " Shop ", estimatedCost: "2", finalCost: "3" }));
  await act(async () => { await result.current.save(); });
  const [path, init] = mutate.mock.calls[0];
  expect(path).toBe("/api/purchases");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body as string)).toEqual(expect.objectContaining({ title: "Order", vendor: "Shop",
    approvedByMentor: false, status: "requested", linkLabel: "n/a" }));
  expect(JSON.parse(init.body as string).finalCost).toBe(mentor ? 3 : undefined);
  act(() => result.current.open(purchase));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[1][0]).toBe(`/api/purchases/${purchase.id}`);
  expect(mutate.mock.calls[1][1].method).toBe("PATCH");
  const edit = JSON.parse(mutate.mock.calls[1][1].body as string);
  expect(edit).not.toHaveProperty("approvedByMentor");
  expect(edit).not.toHaveProperty("status");
  act(() => result.current.open(purchase));
  await act(async () => { await result.current.deletePurchase(); });
  expect(mutate).toHaveBeenCalledTimes(mentor ? 3 : 2);
  expect(result.current.visible).toBe(!mentor);
});

test("restock prefers signed-in requester, demand quantity and the matching item's subsystem", () => {
  const { result } = setup();
  const item = mecoSnapshot.manufacturingItems.find((item) => item.status !== "complete")!;
  act(() => result.current.restock({ name: item.material, vendor: "Mixed", suggestedOrderQuantity: 4,
    reorderPoint: 6 } as MaterialRollup));
  expect(result.current).toMatchObject({ id: null, visible: true, draft: {
    title: `Restock ${item.material}`, vendor: "", quantity: "6", subsystemId: item.subsystemId,
    requestedById: mecoSnapshot.members[1].id,
  } });
});

test("validation and mutation failure retain the draft; editing clears the local error", async () => {
  const { result, mutate } = setup(true, false);
  act(() => result.current.open(purchase));
  act(() => result.current.updateDraft({ quantity: "0" }));
  await act(async () => { await result.current.save(); });
  expect(mutate).not.toHaveBeenCalled();
  expect(result.current.error).toContain("quantity");
  act(() => result.current.updateDraft({ quantity: "2" }));
  expect(result.current.error).toBeNull();
  await act(async () => { await result.current.save(); await result.current.deletePurchase(); });
  expect(result.current).toMatchObject({ visible: true, id: purchase.id, draft: { quantity: "2" } });
});
