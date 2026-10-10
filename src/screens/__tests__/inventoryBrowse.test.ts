import { act, renderHook } from "@testing-library/react-native";
import type { Material, PartDefinition, PartInstance, PurchaseItem } from "../../types/domain";
import { useMaterialsBrowse } from "../inventory/useMaterialsBrowse";
import { usePartsBrowse } from "../inventory/usePartsBrowse";

const definition = (id: string, name: string): PartDefinition => ({
  id, seasonId: "season-2026", activeSeasonIds: ["season-2026"], name, partNumber: id.toUpperCase(), revision: "A", iteration: 1, isArchived: false,
  type: "custom", defaultAcquisitionMethod: "manufacture", materialId: null, description: "", cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false,
});

const purchase = (id: string, materialId: string, orderStatus: PurchaseItem["orderStatus"], quantity: number): PurchaseItem => ({
  id, taskId: `task-${id}`, kind: "cots-goods", partDefinitionId: null, materialId, title: id, quantity, quotes: [], selectedQuoteId: null,
  approvalStatus: "approved", approvedById: null, approvedAt: null, purchaseOrderNumber: null, orderStatus, finalCost: null,
  expectedDeliveryDate: null, trackingNumber: null, trackingUrl: null, orderedAt: null, deliveredAt: null,
});

test("materials calculate commercial open orders from PurchaseItems and keep raw stock ownership separate", () => {
  const materials: Material[] = [
    { id: "steel", name: "Steel", category: "metal", unit: "sheet", onHandQuantity: 1, reorderPoint: 5, location: "Rack A", preferredVendorId: null, notes: "" },
    { id: "pla", name: "PLA", category: "filament", unit: "spool", onHandQuantity: 10, reorderPoint: 2, location: "Cabinet", preferredVendorId: null, notes: "" },
  ];
  const purchases = [purchase("open-steel", "steel", "ordered", 2), purchase("received-steel", "steel", "delivered", 1)];
  const { result } = renderHook(() => useMaterialsBrowse({ materials, purchaseItems: purchases }));
  expect(result.current.rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "Steel", onHand: 1, openPurchaseCount: 1, openPurchaseQuantity: 2, suggestedOrderQuantity: 2 }),
    expect.objectContaining({ name: "PLA", onHand: 10, openPurchaseCount: 0, suggestedOrderQuantity: 0 }),
  ]));
  act(() => result.current.updateFilters({ search: "steel", category: "metal", stock: "low" }));
  expect(result.current.rows).toHaveLength(1);
});

test("part inventory counts physical instances and keeps location distinct from readiness", () => {
  const definitions = [definition("plate", "Plate"), definition("bolt", "Bolt")];
  const instances: PartInstance[] = [
    { id: "spare", partDefinitionId: "plate", intendedSubsystemId: "drive", intendedMechanismId: null, location: { kind: "stock", location: "Bin A" }, readinessStatus: "ready", cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false },
    { id: "installed", partDefinitionId: "plate", intendedSubsystemId: "arm", intendedMechanismId: null, location: { kind: "installed", subsystemId: "arm", mechanismId: null }, readinessStatus: "qa", cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false },
    { id: "unknown", partDefinitionId: "missing", intendedSubsystemId: null, intendedMechanismId: null, location: { kind: "unlocated" }, cadSource: "manual", cadImportSource: "MANUAL", cadEditedAfterImport: false },
  ];
  const { result } = renderHook(() => usePartsBrowse({
    partDefinitions: definitions, partInstances: instances, tasks: [],
    partDefinitionsById: Object.fromEntries(definitions.map((item) => [item.id, item])), mechanismsById: {},
  }));
  expect(result.current.summary).toEqual({ instanceCount: 3, spareCount: 1 });
  expect(result.current.instances.map(({ partInstance }) => [partInstance.location.kind, partInstance.readinessStatus])).toEqual([["stock", "ready"], ["installed", "qa"], ["unlocated", undefined]]);
  act(() => result.current.updateFilters({ subsystemId: "arm" }));
  expect(result.current.instances.map(({ partInstance }) => partInstance.id)).toEqual(["installed"]);
});
