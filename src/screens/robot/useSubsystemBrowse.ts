import { useEffect, useMemo, useRef, useState } from "react";
import type { Mechanism, Member, PurchaseItem, QaFinding, Risk, Subsystem, Task } from "../../types/domain";
import { localTodayDate } from "../../ui/helpers";

type Filters = { search: string };
type Inputs = {
  subsystems: Subsystem[];
  mechanisms: Mechanism[];
  tasks: Task[];
  purchaseItems: PurchaseItem[];
  qaFindings: QaFinding[];
  risks: Risk[];
  membersById: Record<string, Member>;
  taskById: Record<string, Task>;
};

type SubsystemCounts = {
  blockedTasks: number;
  health: "good" | "watch" | "risk";
  openTasks: number;
  openPurchases: number;
  overdueTasks: number;
  qaFindings: number;
  waitingQa: number;
  risks: number;
  tasks: number;
};

export function useSubsystemBrowse({ subsystems, mechanisms, tasks, purchaseItems, qaFindings, risks, membersById, taskById }: Inputs) {
  const [filters, setFilters] = useState<Readonly<Filters>>({ search: "" });
  const [expandedId, setExpandedId] = useState(subsystems[0]?.id ?? "");
  const hasInitializedExpansion = useRef(subsystems.length > 0);
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const toggleExpanded = (id: string) => setExpandedId((current) => current === id ? "" : id);

  useEffect(() => {
    if (!hasInitializedExpansion.current && subsystems.length > 0) {
      hasInitializedExpansion.current = true;
      setExpandedId(subsystems[0].id);
    } else if (expandedId && !subsystems.some((subsystem) => subsystem.id === expandedId)) {
      setExpandedId(subsystems[0]?.id ?? "");
    }
  }, [expandedId, subsystems]);

  const mechanismsBySubsystemId = useMemo(() => {
    const grouped: Record<string, Mechanism[]> = {};
    for (const mechanism of mechanisms) {
      (grouped[mechanism.subsystemId] ??= []).push(mechanism);
    }
    return grouped;
  }, [mechanisms]);

  const subsystemCountsById = useMemo(() => {
    const counts = Object.fromEntries(
      subsystems.map((subsystem) => [
        subsystem.id,
        {
          blockedTasks: 0,
          health: "good" as const,
          openPurchases: 0,
          openTasks: 0,
          overdueTasks: 0,
          qaFindings: 0,
          waitingQa: 0,
          risks: 0,
          tasks: 0,
        },
      ]),
    ) as Record<string, SubsystemCounts>;
    const today = localTodayDate();

    for (const task of tasks) {
      for (const subsystemId of new Set(task.subsystemIds)) {
        const bucket = counts[subsystemId];
        if (!bucket) {
          continue;
        }

        bucket.tasks += 1;
        if (task.status !== "complete") {
          bucket.openTasks += 1;
        }
        if (task.status !== "complete" && (task.isBlocked || task.isWaitingOnDependency)) {
          bucket.blockedTasks += 1;
        }
        if (task.status !== "complete" && task.dueDate < today) {
          bucket.overdueTasks += 1;
        }
        if (task.status === "waiting-for-qa") {
          bucket.waitingQa += 1;
        }
      }
    }

    for (const purchase of purchaseItems) {
      const task = taskById[purchase.taskId];
      for (const subsystemId of new Set(task?.subsystemIds ?? [])) {
        const bucket = counts[subsystemId];
        if (bucket && purchase.orderStatus !== "delivered" && purchase.orderStatus !== "cancelled") {
        bucket.openPurchases += 1;
        }
      }
    }

    for (const finding of qaFindings) {
      if (finding.status === "resolved") continue;
      const linkedSubsystemIds = finding.targetRefs.flatMap((target) => {
        if (target.kind === "subsystem") return [target.id];
        if (target.kind === "task") return taskById[target.id]?.subsystemIds ?? [];
        return [];
      });
      for (const subsystemId of new Set(linkedSubsystemIds)) {
        const bucket = counts[subsystemId];
        if (bucket) bucket.qaFindings += 1;
      }
    }

    for (const risk of risks) {
      if (risk.status === "resolved") continue;
      for (const target of risk.relatedTargets) {
        const subsystemIds = target.kind === "subsystem" ? [target.id] : target.kind === "task" ? taskById[target.id]?.subsystemIds ?? [] : [];
        for (const subsystemId of subsystemIds) {
          const bucket = counts[subsystemId];
          if (bucket) bucket.risks += 1;
        }
      }
    }

    for (const bucket of Object.values(counts)) {
      if (
        bucket.blockedTasks > 0 ||
        bucket.overdueTasks > 0 ||
        bucket.qaFindings > 0 ||
        bucket.risks > 1
      ) {
        bucket.health = "risk";
      } else if (bucket.waitingQa > 0 || bucket.openPurchases > 0 || bucket.risks > 0) {
        bucket.health = "watch";
      }
    }

    return counts;
  }, [purchaseItems, qaFindings, risks, subsystems, taskById, tasks]);

  const filteredSubsystems = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return subsystems.filter((subsystem) => {
      if (!search) {
        return true;
      }

      const leadName = subsystem.responsibleEngineerId
        ? (membersById[subsystem.responsibleEngineerId]?.name ?? "")
        : "";
      const mentorNames = subsystem.mentorIds
        .map((mentorId) => membersById[mentorId]?.name ?? "")
        .join(" ");
      const mechanismNames = (mechanismsBySubsystemId[subsystem.id] ?? [])
        .map((mechanism) => mechanism.name)
        .join(" ");

      return `${subsystem.name} ${subsystem.description} ${leadName} ${mentorNames} ${mechanismNames}`
        .toLowerCase()
        .includes(search);
    });
  }, [mechanismsBySubsystemId, membersById, filters.search, subsystems]);

  const rows = useMemo(() => filteredSubsystems.map((subsystem) => ({
    subsystem,
    mechanisms: mechanismsBySubsystemId[subsystem.id] ?? [],
    counts: subsystemCountsById[subsystem.id],
    isExpanded: subsystem.id === expandedId,
  })), [expandedId, filteredSubsystems, mechanismsBySubsystemId, subsystemCountsById]);
  const visibleMechanismCount = useMemo(() => rows.reduce((total, row) => total + row.mechanisms.length, 0), [rows]);

  return { filters, updateFilters, toggleExpanded, rows, visibleMechanismCount };
}
