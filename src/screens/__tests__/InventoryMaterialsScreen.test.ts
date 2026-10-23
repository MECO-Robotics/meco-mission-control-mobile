import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { createElement } from "react";
import type { Material, MaterialTransaction } from "../../types/domain";
import type { AppScreenProps } from "../types";
import { InventoryMaterialsScreen } from "../inventory/InventoryMaterialsScreen";

jest.mock("expo-crypto", () => ({ randomUUID: () => "operation-1" }));

const material: Material = {
  id: "steel", name: "Steel", category: "metal", unit: "sheet", onHandQuantity: 5,
  reorderPoint: 2, location: "Rack A", preferredVendorId: null, notes: "",
};
const transaction: MaterialTransaction = {
  id: "tx-1", operationId: "purchase-1", materialId: "steel", movementType: "receipt",
  quantityDelta: 5, reason: "Received order", recordedAt: "2026-10-20T12:00:00Z", actorMemberId: "member-1",
};

function screen(mutate = jest.fn(async () => true), materialTransactions: MaterialTransaction[] = [], seedMaterial = material) {
  const view = render(createElement(InventoryMaterialsScreen, ({
    materialsBrowse: {
      filters: { search: "", category: "all", stock: "all" }, updateFilters: jest.fn(),
      rows: [{ id: "steel", name: "Steel", category: "metal", onHand: seedMaterial.onHandQuantity, reorderPoint: seedMaterial.reorderPoint, openDemand: 0, openPurchaseCount: 0, openPurchaseQuantity: 0, suggestedOrderQuantity: seedMaterial.onHandQuantity === null || seedMaterial.reorderPoint === null ? null : 0, vendor: "Vendor", stock: seedMaterial.onHandQuantity === null || seedMaterial.reorderPoint === null ? "unknown" : "ok" }],
      summary: { lowStockCount: 0, suggestedRestockCount: 0 },
    },
    materialTransactions, materials: [seedMaterial], projects: [], tasks: [], membersById: {}, mutate,
    appResponsiveStyles: {}, openCreatePurchaseEditor: jest.fn(), openMaterialRestockEditor: jest.fn(),
  } as unknown) as AppScreenProps));
  return { view, mutate };
}

test("material screen exposes server transaction history in the material context", () => {
  const { view } = screen(jest.fn(async () => true), [transaction]);

  fireEvent.press(view.getByText("View stock history (1)"));
  expect(view.getByText("2026-10-20T12:00:00Z · receipt · +5 · Received order · member-1")).toBeTruthy();
});

test("material consumption posts a positive quantity with an idempotency key and reason", async () => {
  const { view, mutate } = screen();
  fireEvent.press(view.getByText("Record movement"));
  fireEvent.changeText(view.getByPlaceholderText("0"), "2");
  fireEvent.changeText(view.getByPlaceholderText("Why is stock changing?"), "Cutting practice pieces");

  await act(async () => {
    fireEvent.press(view.getAllByText("Record movement").at(-1)!);
  });

  await waitFor(() => expect(mutate).toHaveBeenCalledWith("/api/materials/steel/transactions", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ operationId: "operation-1", movementType: "consumption", quantity: 2, reason: "Cutting practice pieces" }),
  })));
});

test("unknown stock is labeled and consumption is unavailable", () => {
  const { view } = screen(jest.fn(async () => true), [], { ...material, onHandQuantity: null });

  expect(view.getByText("On hand Unknown | Reorder 2 | Open demand 0")).toBeTruthy();
  expect(view.getByText(/Suggested restock Unknown/u)).toBeTruthy();
  fireEvent.press(view.getByText("Record movement"));
  expect(view.getByLabelText("Movement: Receipt")).toBeTruthy();
  fireEvent.press(view.getByLabelText("Movement: Receipt"));
  expect(view.queryByText("Consumption")).toBeNull();
});

test("unset reorder point is displayed as not set", () => {
  const { view } = screen(jest.fn(async () => true), [], { ...material, reorderPoint: null });

  expect(view.getByText("On hand 5 | Reorder Not set | Open demand 0")).toBeTruthy();
  expect(view.getByText(/Suggested restock Unknown/u)).toBeTruthy();
});
