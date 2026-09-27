import { act, renderHook } from "@testing-library/react-native";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import type { ManufacturingItem, PurchaseItem } from "../../types/domain";
import { useManufacturingBrowse } from "../manufacturing/useManufacturingBrowse";
import { usePurchaseBrowse } from "../inventory/usePurchaseBrowse";

const membersById = {
  alice: { ...mecoSnapshot.members[0], id: "alice", name: "Alice Engineer" },
  bob: { ...mecoSnapshot.members[1], id: "bob", name: "Bob Mentor" },
};
const subsystemsById = {
  drive: { ...mecoSnapshot.subsystems[0], id: "drive", name: "Drive train" },
  arm: { ...mecoSnapshot.subsystems[1], id: "arm", name: "Arm" },
};
const relations = { membersById, subsystemsById };
const manufacturingBase = { ...mecoSnapshot.manufacturingItems[0], subsystemId: "drive", requestedById: "alice", material: "Steel", process: "cnc" as const, mentorReviewed: false };
const manufacturingItems: ManufacturingItem[] = [
  { ...manufacturingBase, id: "late", title: "Late plate", dueDate: "2026-10-04", status: "requested" },
  { ...manufacturingBase, id: "qa", title: "Early plate", dueDate: "2026-10-02", status: "qa", mentorReviewed: true },
  { ...manufacturingBase, id: "done", title: "Done plate", dueDate: "2026-10-01", status: "complete", mentorReviewed: true },
  { ...manufacturingBase, id: "print", title: "Print", dueDate: "2026-10-03", status: "approved", process: "3d-print", material: "PLA", requestedById: "bob", subsystemId: "arm" },
  { ...manufacturingBase, id: "fab", title: "Weld", dueDate: "2026-10-05", status: "requested", process: "fabrication", requestedById: null, subsystemId: "arm" },
];

test("manufacturing combines filters, sorts due dates and counts only visible rows without narrowing material options", () => {
  const inputOrder = manufacturingItems.map(({ id }) => id);
  const { result, rerender } = renderHook(({ person }: { person: string }) => useManufacturingBrowse({ ...relations, items: manufacturingItems, activePersonFilter: person }), { initialProps: { person: "all" } });
  act(() => result.current.updateFilters({ view: "cnc", subsystemId: "drive", requesterId: "alice", material: "Steel", search: "  DRIVE  " }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["qa", "late"]);
  expect(result.current.summary.map(({ value }) => value)).toEqual(["2", "1", "1", "0"]);
  expect(result.current.materialOptions.map(({ id }) => id)).toEqual(["PLA", "Steel"]);
  act(() => result.current.updateFilters({ archive: "all" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["done", "qa", "late"]);
  expect(result.current.summary.map(({ value }) => value)).toEqual(["3", "1", "2", "1"]);
  act(() => result.current.updateFilters({ status: "qa" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["qa"]);
  rerender({ person: "bob" });
  expect(result.current.rows).toEqual([]);
  expect(result.current.filters.requesterId).toBe("alice");
  rerender({ person: "alice" });
  act(() => result.current.updateFilters({ archive: "archived", status: "all" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["done"]);
  expect(manufacturingItems.map(({ id }) => id)).toEqual(inputOrder);
});

test.each([
  ["all", ["qa", "print", "late", "fab"]], ["cnc", ["qa", "late"]],
  ["prints", ["print"]], ["fabrication", ["fab"]],
] as const)("manufacturing %s process retains its distinct queue", (view, expected) => {
  const { result } = renderHook(() => useManufacturingBrowse({ ...relations, items: manufacturingItems, activePersonFilter: "all" }));
  act(() => result.current.updateFilters({ view }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(expected);
});

const purchaseBase = { ...mecoSnapshot.purchaseItems[0], subsystemId: "drive", requestedById: "alice", vendor: "Shop", approvedByMentor: false };
const purchaseItems: PurchaseItem[] = [
  { ...purchaseBase, id: "approved", title: "Approved", createdAt: "2026-10-02", status: "approved", approvedByMentor: true },
  { ...purchaseBase, id: "zulu", title: "Zulu", createdAt: "2026-10-02", status: "requested" },
  { ...purchaseBase, id: "alpha", title: "Alpha", createdAt: "2026-10-02", status: "requested" },
  { ...purchaseBase, id: "new", title: "New", createdAt: "2026-10-03", status: "shipped", approvedByMentor: true },
  { ...purchaseBase, id: "delivered", title: "Done", createdAt: "2026-10-01", status: "delivered", requestedById: "bob", vendor: "Other" },
  { ...purchaseBase, id: "2026-09-30", title: "No date", createdAt: undefined, status: "purchased", requestedById: null },
];

test("purchases sort by creation then status then title, retaining ID fallback and canonical item order", () => {
  const inputOrder = purchaseItems.map(({ id }) => id);
  const { result } = renderHook(() => usePurchaseBrowse({ ...relations, items: purchaseItems, activePersonFilter: "all" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["new", "alpha", "zulu", "approved", "2026-09-30"]);
  expect(purchaseItems.map(({ id }) => id)).toEqual(inputOrder);
});

test("purchases intersect requester/person, approval and archive filters and search related names", () => {
  const { result, rerender } = renderHook(({ person }: { person: string }) => usePurchaseBrowse({ ...relations, items: purchaseItems, activePersonFilter: person }), { initialProps: { person: "all" } });
  act(() => result.current.updateFilters({ search: "  ALICE  ", requesterId: "alice", vendor: "Shop", approval: "approved" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["new", "approved"]);
  expect(result.current.vendorOptions.map(({ id }) => id)).toEqual(["Other", "Shop"]);
  act(() => result.current.updateFilters({ status: "approved" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["approved"]);
  rerender({ person: "bob" });
  expect(result.current.rows).toEqual([]);
  rerender({ person: "all" });
  act(() => result.current.updateFilters({ search: "drive", status: "all", approval: "pending" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["alpha", "zulu"]);
  act(() => result.current.updateFilters({ requesterId: "all", vendor: "all", archive: "archived" }));
  expect(result.current.rows.map(({ id }) => id)).toEqual(["delivered"]);
});

test("bootstrap replacements update rows/options while retaining each feature's filters", () => {
  const { result, rerender } = renderHook(({ manufacturing, purchases }: { manufacturing: ManufacturingItem[]; purchases: PurchaseItem[] }) => ({
    manufacturing: useManufacturingBrowse({ ...relations, items: manufacturing, activePersonFilter: "all" }),
    purchases: usePurchaseBrowse({ ...relations, items: purchases, activePersonFilter: "all" }),
  }), { initialProps: { manufacturing: manufacturingItems, purchases: purchaseItems } });
  act(() => { result.current.manufacturing.updateFilters({ search: "plate" }); result.current.purchases.updateFilters({ vendor: "Shop" }); });
  rerender({ manufacturing: [], purchases: [] });
  expect(result.current.manufacturing.filters.search).toBe("plate");
  expect(result.current.purchases.filters.vendor).toBe("Shop");
  expect(result.current.manufacturing.summary.map(({ value }) => value)).toEqual(["0", "0", "0", "0"]);
  expect(result.current.manufacturing.materialOptions).toEqual([]);
  expect(result.current.purchases.vendorOptions).toEqual([]);
});
