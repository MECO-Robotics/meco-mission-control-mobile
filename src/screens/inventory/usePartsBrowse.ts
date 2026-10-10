import { useMemo, useState } from "react";
import type { Mechanism, PartDefinition, PartInstance, Task } from "../../types/domain";

type Filters = { search: string; subsystemId: string; status: string };
type Inputs = { partDefinitions: PartDefinition[]; partInstances: PartInstance[]; tasks: Task[]; partDefinitionsById: Record<string, PartDefinition>; mechanismsById: Record<string, Mechanism> };
export function usePartsBrowse({ partDefinitions, partInstances, partDefinitionsById, mechanismsById }: Inputs) {
  const [filters, setFilters] = useState<Readonly<Filters>>({ search: "", subsystemId: "all", status: "all" });
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const instancesWithLocation = useMemo(() => partInstances.map((partInstance) => ({ partInstance, locationLabel: partInstance.location.kind === "installed" ? `Installed: ${partInstance.location.subsystemId}${partInstance.location.mechanismId ? ` / ${mechanismsById[partInstance.location.mechanismId]?.name ?? "mechanism"}` : ""}` : partInstance.location.kind === "stock" || partInstance.location.kind === "repair" ? `${partInstance.location.kind}: ${partInstance.location.location}` : partInstance.location.kind })), [partInstances, mechanismsById]);
  const definitions = useMemo(() => { const search = filters.search.trim().toLowerCase(); return partDefinitions.filter((part) => !search || `${part.name} ${part.partNumber} ${part.type} ${part.revision}`.toLowerCase().includes(search)); }, [filters.search, partDefinitions]);
  const instances = useMemo(() => { const search = filters.search.trim().toLowerCase(); return instancesWithLocation.filter(({ partInstance, locationLabel }) => {
    if (filters.subsystemId !== "all" && !(partInstance.location.kind === "installed" && partInstance.location.subsystemId === filters.subsystemId)) return false;
    if (filters.status !== "all" && partInstance.location.kind !== filters.status && partInstance.readinessStatus !== filters.status) return false;
    if (!search) return true;
    const definition = partDefinitionsById[partInstance.partDefinitionId];
    return `${definition?.name ?? ""} ${definition?.partNumber ?? ""} ${partInstance.intendedSubsystemId ?? ""} ${locationLabel}`.toLowerCase().includes(search);
  }); }, [instancesWithLocation, filters, partDefinitionsById]);
  const definitionStatsById = useMemo(() => partInstances.reduce<Record<string, { count: number; spares: number }>>((stats, part) => { const row = stats[part.partDefinitionId] ?? { count: 0, spares: 0 }; row.count += 1; if (part.location.kind === "stock") row.spares += 1; stats[part.partDefinitionId] = row; return stats; }, {}), [partInstances]);
  const summary = useMemo(() => instances.reduce((acc, { partInstance }) => ({ instanceCount: acc.instanceCount + 1, spareCount: acc.spareCount + Number(partInstance.location.kind === "stock") }), { instanceCount: 0, spareCount: 0 }), [instances]);
  return { filters, updateFilters, definitions, instances, definitionStatsById, summary };
}
