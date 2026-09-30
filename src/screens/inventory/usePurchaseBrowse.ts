import { useMemo, useState } from "react";
import type { PurchaseItem, Task, Vendor } from "../../types/domain";
import type { ArchiveFilterMode } from "../../ui/types";

type Filters = { search: string; taskId: string; orderStatus: string; vendorId: string; approval: string; archive: ArchiveFilterMode };
type Inputs = { items: PurchaseItem[]; tasksById: Record<string, Task>; vendorsById: Record<string, Vendor> };

export function usePurchaseBrowse({ items, tasksById, vendorsById }: Inputs) {
  const [filters, setFilters] = useState<Readonly<Filters>>({ search: "", taskId: "all", orderStatus: "all", vendorId: "all", approval: "all", archive: "active" });
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const vendorOptions = useMemo(() => {
    const ids = new Set(items.flatMap((item) => item.quotes.map((quote) => quote.vendorId)));
    return [...ids].map((id) => ({ id, name: vendorsById[id]?.name ?? "Unknown vendor" })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, vendorsById]);
  const rows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return items.filter((item) => {
      const vendorIds = item.quotes.map((quote) => quote.vendorId);
      const isClosed = item.orderStatus === "delivered" || item.orderStatus === "cancelled";
      if ((filters.taskId !== "all" && item.taskId !== filters.taskId) ||
          (filters.orderStatus !== "all" && item.orderStatus !== filters.orderStatus) ||
          (filters.vendorId !== "all" && !vendorIds.includes(filters.vendorId)) ||
          (filters.approval !== "all" && item.approvalStatus !== filters.approval) ||
          (filters.archive === "active" && isClosed) || (filters.archive === "archived" && !isClosed)) return false;
      if (!search) return true;
      const task = tasksById[item.taskId];
      const vendors = vendorIds.map((id) => vendorsById[id]?.name ?? "").join(" ");
      return `${item.title} ${task?.title ?? ""} ${vendors} ${item.purchaseOrderNumber ?? ""}`.toLowerCase().includes(search);
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [items, filters, tasksById, vendorsById]);
  return { filters, updateFilters, rows, vendorOptions };
}
