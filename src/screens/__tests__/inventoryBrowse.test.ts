import { act, renderHook } from "@testing-library/react-native";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import type { ManufacturingItem, PartInstance, PurchaseItem, Task } from "../../types/domain";
import { useMaterialsBrowse } from "../inventory/useMaterialsBrowse";
import { usePartsBrowse } from "../inventory/usePartsBrowse";

test("materials combines filters while preserving supply, open-order and demand distinctions", () => {
  const manufacturingItems: ManufacturingItem[] = [
    { ...mecoSnapshot.manufacturingItems[0], material: "Steel", quantity: 10, status: "requested" },
    { ...mecoSnapshot.manufacturingItems[0], material: "Steel", quantity: 99, status: "complete" },
    { ...mecoSnapshot.manufacturingItems[0], material: "PLA", quantity: 2, status: "requested" },
  ];
  const purchaseItems: PurchaseItem[] = [
    { ...mecoSnapshot.purchaseItems[0], title: "Steel", vendor: "First shop", linkLabel: "", quantity: 3, status: "delivered" },
    { ...mecoSnapshot.purchaseItems[0], title: "Steel", vendor: "Second shop", linkLabel: "", quantity: 2, status: "purchased" },
    { ...mecoSnapshot.purchaseItems[0], title: "Steel", vendor: "Third shop", linkLabel: "", quantity: 4, status: "shipped" },
    { ...mecoSnapshot.purchaseItems[0], title: "PLA", vendor: "Plastic shop", linkLabel: "", quantity: 100, status: "delivered" },
  ];
  const { result, rerender } = renderHook(({ purchases }: { purchases: PurchaseItem[] }) => useMaterialsBrowse({ manufacturingItems, purchaseItems: purchases }), { initialProps: { purchases: purchaseItems } });
  expect(result.current.rows.map(({ name }) => name)).toEqual(["PLA", "Steel"]);
  expect(result.current.rows[0]).toMatchObject({ vendor: "Mixed", onHand: 0, openDemand: 2 });
  act(() => result.current.updateFilters({ search: "  FIRST  ", category: "metal", stock: "low" }));
  expect(result.current.rows).toEqual([expect.objectContaining({ name: "Steel", openDemand: 10, onHand: 1, reorderPoint: 5, openPurchaseCount: 2, openPurchaseQuantity: 6, suggestedOrderQuantity: 8 })]);
  expect(result.current.summary).toEqual({ lowStockCount: 1, suggestedRestockCount: 1 });
  rerender({ purchases: [...purchaseItems, { ...purchaseItems[0], quantity: 100 }] });
  expect(result.current.rows).toEqual([]);
  expect(result.current.summary).toEqual({ lowStockCount: 0, suggestedRestockCount: 0 });
  act(() => result.current.updateFilters({ stock: "ok" }));
  expect(result.current.rows[0].suggestedOrderQuantity).toBe(0);
});

test("parts preserves catalog order and whole-catalog quantities while filtering visible lifecycle rows", () => {
  const definitions = [
    { ...mecoSnapshot.partDefinitions[0], id: "plate", name: "Plate", partNumber: "P-1", source: "Custom CAD" },
    { ...mecoSnapshot.partDefinitions[0], id: "bolt", name: "Bolt", partNumber: "B-1", source: "Supplier" },
  ];
  const instances = [
    { ...mecoSnapshot.partInstances[0], id: "available", partDefinitionId: "plate", name: "Left", subsystemId: "drive", mechanismId: "wheel", quantity: 3 },
    { ...mecoSnapshot.partInstances[0], id: "installed", partDefinitionId: "plate", name: "Right", subsystemId: "arm", mechanismId: null, quantity: 7 },
    { ...mecoSnapshot.partInstances[0], id: "unknown", partDefinitionId: "missing", name: "Unknown", subsystemId: "drive", mechanismId: "missing", quantity: 2 },
  ];
  const tasks: Task[] = [
    { ...mecoSnapshot.tasks[0], partInstanceIds: ["available"], status: "waiting-for-qa" },
    { ...mecoSnapshot.tasks[0], partInstanceIds: ["available"], status: "in-progress" },
    { ...mecoSnapshot.tasks[0], partInstanceIds: ["installed"], status: "complete" },
  ];
  const input = { partDefinitions: definitions, partInstances: instances, tasks, partDefinitionsById: Object.fromEntries(definitions.map((definition) => [definition.id, definition])), mechanismsById: { wheel: { ...mecoSnapshot.mechanisms[0], name: "Wheel" } } };
  const { result, rerender } = renderHook(({ rows }: { rows: PartInstance[] }) => usePartsBrowse({ ...input, partInstances: rows }), { initialProps: { rows: instances } });
  expect(result.current.instances.map(({ status }) => status)).toEqual(["available", "installed", "planned"]);
  expect(result.current.summary).toEqual({ instanceCount: 12, spareCount: 3 });
  act(() => result.current.updateFilters({ subsystemId: "drive", status: "available" }));
  expect(result.current.definitions.map(({ id }) => id)).toEqual(["plate", "bolt"]);
  expect(result.current.definitionStatsById.plate).toEqual({ count: 10, spares: 3 });
  expect(result.current.summary).toEqual({ instanceCount: 3, spareCount: 3 });
  act(() => result.current.updateFilters({ search: "  WHEEL  " }));
  expect(result.current.definitions).toEqual([]);
  expect(result.current.instances.map(({ partInstance }) => partInstance.id)).toEqual(["available"]);
  act(() => result.current.updateFilters({ search: "custom cad" }));
  expect(result.current.definitions.map(({ id }) => id)).toEqual(["plate"]);
  expect(result.current.instances).toEqual([]);
  rerender({ rows: [] });
  expect(result.current.definitionStatsById).toEqual({});
  expect(result.current.filters.search).toBe("custom cad");
});
