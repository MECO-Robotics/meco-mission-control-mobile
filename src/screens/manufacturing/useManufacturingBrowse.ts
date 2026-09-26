import { useMemo, useState } from "react";
import type { ManufacturingItem, Member, Subsystem } from "../../types/domain";
import type { ArchiveFilterMode, ManufacturingViewTab, SummaryChipData } from "../../ui/types";

type Filters = {
  search: string;
  subsystemId: string;
  requesterId: string;
  status: string;
  material: string;
  archive: ArchiveFilterMode;
  view: ManufacturingViewTab;
};

type Inputs = {
  items: ManufacturingItem[];
  activePersonFilter: string;
  membersById: Record<string, Member>;
  subsystemsById: Record<string, Subsystem>;
};

export function useManufacturingBrowse({ items, activePersonFilter, membersById, subsystemsById }: Inputs) {
  const [filters, setFilters] = useState<Filters>({
    search: "", subsystemId: "all", requesterId: "all", status: "all",
    material: "all", archive: "active", view: "all",
  });
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const materialOptions = useMemo(() => Array.from(new Set(items.map((item) => item.material)))
    .sort((left, right) => left.localeCompare(right))
    .map((material) => ({ id: material, name: material })), [items]);
  const rows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const process = filters.view === "all" ? null : filters.view === "prints" ? "3d-print" : filters.view;
    return items.filter((item) => {
      if (
        (process && item.process !== process) ||
        (activePersonFilter !== "all" && item.requestedById !== activePersonFilter) ||
        (filters.subsystemId !== "all" && item.subsystemId !== filters.subsystemId) ||
        (filters.requesterId !== "all" && item.requestedById !== filters.requesterId) ||
        (filters.status !== "all" && item.status !== filters.status) ||
        (filters.material !== "all" && item.material !== filters.material) ||
        (filters.archive === "active" && item.status === "complete") ||
        (filters.archive === "archived" && item.status !== "complete")
      ) return false;
      if (!search) return true;
      const subsystemName = subsystemsById[item.subsystemId]?.name ?? "";
      const requesterName = item.requestedById ? (membersById[item.requestedById]?.name ?? "") : "";
      return `${item.title} ${item.material} ${subsystemName} ${requesterName}`.toLowerCase().includes(search);
    }).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [items, filters, activePersonFilter, membersById, subsystemsById]);
  const summary = useMemo(() => [
    { label: "Queue", value: String(rows.length) },
    { label: "In QA", value: String(rows.filter((item) => item.status === "qa").length) },
    { label: "Mentor reviewed", value: String(rows.filter((item) => item.mentorReviewed).length) },
    { label: "Complete", value: String(rows.filter((item) => item.status === "complete").length) },
  ] satisfies SummaryChipData[], [rows]);
  return { filters, updateFilters, rows, materialOptions, summary };
}
