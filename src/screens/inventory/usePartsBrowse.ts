import { useMemo, useState } from "react";
import type { Mechanism, PartDefinition, PartInstance, Task } from "../../types/domain";
import { derivePartLifecycleStatus } from "../../ui/helpers";

type Filters = { search: string; subsystemId: string; status: string };
type Inputs = {
  partDefinitions: PartDefinition[];
  partInstances: PartInstance[];
  tasks: Task[];
  partDefinitionsById: Record<string, PartDefinition>;
  mechanismsById: Record<string, Mechanism>;
};

export function usePartsBrowse({ partDefinitions, partInstances, tasks, partDefinitionsById, mechanismsById }: Inputs) {
  const [filters, setFilters] = useState<Readonly<Filters>>({ search: "", subsystemId: "all", status: "all" });
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const partInstancesWithStatus = useMemo(() => {
    return partInstances.map((partInstance) => ({
      partInstance,
      status: derivePartLifecycleStatus(partInstance, tasks),
    }));
  }, [partInstances, tasks]);

  const definitions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return partDefinitions.filter((partDefinition) => {
      if (!search) {
        return true;
      }

      return `${partDefinition.name} ${partDefinition.partNumber} ${partDefinition.type} ${partDefinition.source}`
        .toLowerCase()
        .includes(search);
    });
  }, [filters.search, partDefinitions]);

  const instances = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return partInstancesWithStatus.filter(({ partInstance, status }) => {
      if (filters.subsystemId !== "all" && partInstance.subsystemId !== filters.subsystemId) {
        return false;
      }

      if (filters.status !== "all" && status !== filters.status) {
        return false;
      }

      if (!search) {
        return true;
      }

      const definition = partDefinitionsById[partInstance.partDefinitionId];
      const mechanismName = partInstance.mechanismId
        ? (mechanismsById[partInstance.mechanismId]?.name ?? "")
        : "";

      return `${partInstance.name} ${definition?.name ?? ""} ${definition?.partNumber ?? ""} ${mechanismName}`
        .toLowerCase()
        .includes(search);
    });
  }, [
    mechanismsById,
    partDefinitionsById,
    partInstancesWithStatus,
    filters.search,
    filters.status,
    filters.subsystemId,
  ]);

  const definitionStatsById = useMemo(() => partInstancesWithStatus.reduce<Record<string, { count: number; spares: number }>>(
    (statsById, { partInstance, status }) => {
      const stats = statsById[partInstance.partDefinitionId] ?? { count: 0, spares: 0 };
      statsById[partInstance.partDefinitionId] = {
        count: stats.count + partInstance.quantity,
        spares: stats.spares + (status === "available" ? partInstance.quantity : 0),
      };
      return statsById;
    },
    {},
  ), [partInstancesWithStatus]);
  const summary = useMemo(() => instances.reduce(
    (summary, { partInstance, status }) => ({
      instanceCount: summary.instanceCount + partInstance.quantity,
      spareCount: summary.spareCount + (status === "available" ? partInstance.quantity : 0),
    }),
    { instanceCount: 0, spareCount: 0 },
  ), [instances]);

  return { filters, updateFilters, definitions, instances, definitionStatsById, summary };
}
