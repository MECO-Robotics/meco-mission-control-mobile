import { act, renderHook } from "@testing-library/react-native";
import type { PurchaseItem, Task, Vendor } from "../../types/domain";
import { usePurchaseBrowse } from "../inventory/usePurchaseBrowse";

const task: Task = {
  id: "procurement-task", projectId: "robot", workTypeId: "planning", responsibleGroupId: "robot-build", workstreamIds: [],
  title: "Source drive motors", summary: "Compare motor vendors", subsystemIds: [], mechanismIds: [], partInstanceIds: [], scheduleRefs: [],
  requestedById: "member", ownerId: null, assigneeIds: [], mentorId: null, startDate: "2026-09-01", dueDate: "2026-09-10",
  priority: "medium", status: "in-progress", checklistItems: [], estimatedHours: 2, actualHours: 0, requiresDocumentation: false, manufacturingDetails: null,
};
const item: PurchaseItem = {
  id: "motor-order", taskId: task.id, kind: "cots-goods", partDefinitionId: null, materialId: null, title: "FRC legal motor",
  quantity: 2, quotes: [{ id: "quote-1", vendorId: "vendor-1", reference: "Q-1", amount: { amount: 90, currency: "USD" }, quotedAt: "2026-09-01" }],
  selectedQuoteId: "quote-1", approvalStatus: "approved", approvedById: "mentor", approvedAt: "2026-09-02", purchaseOrderNumber: "PO-1",
  orderStatus: "ordered", finalCost: null, expectedDeliveryDate: "2026-09-12", trackingNumber: null, trackingUrl: null, orderedAt: "2026-09-03", deliveredAt: null,
};
const vendor: Vendor = { id: "vendor-1", name: "Robot Parts Co", website: null, isArchived: false };

test("Purchasing browses commercial records through their procurement Task and quoted vendor", () => {
  const { result } = renderHook(() => usePurchaseBrowse({ items: [item], tasksById: { [task.id]: task }, vendorsById: { [vendor.id]: vendor } }));
  expect(result.current.rows).toEqual([item]);
  expect(result.current.vendorOptions).toEqual([{ id: vendor.id, name: vendor.name }]);
  act(() => result.current.updateFilters({ search: "drive motors", taskId: task.id, vendorId: vendor.id, approval: "approved" }));
  expect(result.current.rows.map(({ taskId }) => taskId)).toEqual([task.id]);
  act(() => result.current.updateFilters({ orderStatus: "delivered" }));
  expect(result.current.rows).toEqual([]);
});
