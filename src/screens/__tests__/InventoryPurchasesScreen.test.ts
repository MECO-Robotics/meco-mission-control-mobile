import { render } from "@testing-library/react-native";
import { createElement } from "react";
import type { PurchaseItem } from "../../types/domain";
import type { AppScreenProps } from "../types";
import { InventoryPurchasesScreen } from "../inventory/InventoryPurchasesScreen";

const basePurchase: PurchaseItem = {
  id: "purchase-1", taskId: "task-1", kind: "cots-goods", partDefinitionId: null, materialId: null,
  title: "Drive motors", quantity: 4, quotes: [], selectedQuoteId: null, approvalStatus: "approved",
  approvedById: "mentor-1", approvedAt: "2026-10-01", purchaseOrderNumber: "PO-42", orderStatus: "delivered",
  finalCost: { amount: 120, currency: "USD" }, expectedDeliveryDate: null, trackingNumber: null,
  trackingUrl: null, orderedAt: "2026-10-02", deliveredAt: "2026-10-10",
};

function screen(item: PurchaseItem, canMentorApprove: boolean) {
  return render(createElement(InventoryPurchasesScreen, ({
    purchaseBrowse: { filters: { search: "", orderStatus: "all", vendorId: "all", approval: "all" }, updateFilters: jest.fn(), rows: [item], vendorOptions: [] },
    appResponsiveStyles: {}, approvePurchaseItem: jest.fn(), canMentorApprove, editTagStyle: {}, taskById: {},
    openCreatePurchaseEditor: jest.fn(), openEditPurchaseEditor: jest.fn(), themeColors: { surface: "white", border: "gray", ink: "black" },
    transitionPurchaseItem: jest.fn(),
  } as unknown) as AppScreenProps));
}

test("purchase receipt history and existing commercial fields display to non-mentors", () => {
  const purchase = { ...basePurchase, receipts: [
    { id: "receipt-1", quantity: 2, location: "Receiving shelf A", receivedAt: "2026-10-11T12:30:00Z", partInstanceIds: ["part-1", "part-2"] },
    { id: "receipt-2", quantity: 1, location: "Cabinet B", receivedAt: "2026-10-12T09:00:00Z", partInstanceIds: ["part-3"] },
  ] };
  const view = screen(purchase, false);

  expect(view.getByText("Received 3 of 4 | 1 remaining")).toBeTruthy();
  expect(view.getByText("Receiving shelf A · 2 received · 2026-10-11T12:30:00Z")).toBeTruthy();
  expect(view.getByText("Cabinet B · 1 received · 2026-10-12T09:00:00Z")).toBeTruthy();
  expect(view.getByText("Qty 4 | Quote Not quoted")).toBeTruthy();
  expect(view.getByText("Vendor Not selected | PO PO-42")).toBeTruthy();
  expect(view.queryByText("Approve")).toBeNull();
});

test("complete and legacy purchases show correct received and remaining quantities", () => {
  const complete = screen({ ...basePurchase, receipts: [
    { id: "receipt-1", quantity: 4, location: "Stockroom", receivedAt: "2026-10-11T12:30:00Z", partInstanceIds: [] },
  ] }, true);
  expect(complete.getByText("Received 4 of 4 | 0 remaining")).toBeTruthy();

  const legacy = screen(basePurchase, false);
  expect(legacy.getByText("Received 0 of 4 | 4 remaining")).toBeTruthy();
});
