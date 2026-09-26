import { useMemo, useState } from "react";
import type { Member, PurchaseItem, Subsystem } from "../../types/domain";
import type { ArchiveFilterMode } from "../../ui/types";

type Filters = {
  search: string;
  requesterId: string;
  status: string;
  vendor: string;
  approval: string;
  archive: ArchiveFilterMode;
};

type Inputs = {
  items: PurchaseItem[];
  activePersonFilter: string;
  membersById: Record<string, Member>;
  subsystemsById: Record<string, Subsystem>;
};

const statusRank = { requested: 0, approved: 1, purchased: 2, shipped: 3, delivered: 4 };

export function usePurchaseBrowse({ items, activePersonFilter, membersById, subsystemsById }: Inputs) {
  const [filters, setFilters] = useState<Filters>({
    search: "", requesterId: "all", status: "all", vendor: "all", approval: "all", archive: "active",
  });
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const vendorOptions = useMemo(() => Array.from(new Set(items.map((item) => item.vendor)))
    .sort((left, right) => left.localeCompare(right))
    .map((vendor) => ({ id: vendor, name: vendor })), [items]);
  const rows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return items.filter((item) => {
      if (
        (activePersonFilter !== "all" && item.requestedById !== activePersonFilter) ||
        (filters.requesterId !== "all" && item.requestedById !== filters.requesterId) ||
        (filters.status !== "all" && item.status !== filters.status) ||
        (filters.vendor !== "all" && item.vendor !== filters.vendor) ||
        (filters.archive === "active" && item.status === "delivered") ||
        (filters.archive === "archived" && item.status !== "delivered") ||
        (filters.approval !== "all" && (filters.approval === "approved" ? !item.approvedByMentor : item.approvedByMentor))
      ) return false;
      if (!search) return true;
      const requesterName = item.requestedById ? (membersById[item.requestedById]?.name ?? "") : "";
      const subsystemName = subsystemsById[item.subsystemId]?.name ?? "";
      return `${item.title} ${item.vendor} ${requesterName} ${subsystemName}`.toLowerCase().includes(search);
    }).sort((left, right) =>
      (right.createdAt ?? right.id).localeCompare(left.createdAt ?? left.id) ||
      statusRank[left.status] - statusRank[right.status] ||
      left.title.localeCompare(right.title));
  }, [items, filters, activePersonFilter, membersById, subsystemsById]);
  return { filters, updateFilters, rows, vendorOptions };
}
