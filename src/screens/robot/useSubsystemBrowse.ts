import { useEffect, useMemo, useState } from "react";
import type { Mechanism, Member, PurchaseItem, QaReview, Subsystem, Task } from "../../types/domain";
import { getQaReviewTaskId } from "../../app/appModel";
import { localTodayDate } from "../../ui/helpers";

type Filters = { search: string };
type Inputs = {
  subsystems: Subsystem[];
  mechanisms: Mechanism[];
  tasks: Task[];
  purchaseItems: PurchaseItem[];
  qaReviews: QaReview[];
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

export function useSubsystemBrowse({ subsystems, mechanisms, tasks, purchaseItems, qaReviews, membersById, taskById }: Inputs) {
  const [filters, setFilters] = useState<Readonly<Filters>>({ search: "" });
  const [expandedId, setExpandedId] = useState(subsystems[0]?.id ?? "");
  const updateFilters = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));
  const toggleExpanded = (id: string) => setExpandedId((current) => current === id ? "" : id);

  useEffect(() => {
    if (expandedId && !subsystems.some((subsystem) => subsystem.id === expandedId)) {
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
          risks: subsystem.risks.length,
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
        if (task.status !== "complete" && task.blockers.length > 0) {
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
      const bucket = counts[purchase.subsystemId];
      if (bucket && purchase.status !== "delivered") {
        bucket.openPurchases += 1;
      }
    }

    for (const review of qaReviews) {
      if (review.result === "pass") {
        continue;
      }

      const taskId = getQaReviewTaskId(review);
      const task = taskId ? taskById[taskId] : null;
      for (const subsystemId of new Set(task?.subsystemIds ?? [])) {
        const bucket = counts[subsystemId];
        if (bucket) bucket.qaFindings += 1;
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
  }, [purchaseItems, qaReviews, subsystems, taskById, tasks]);

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

      return `${subsystem.name} ${subsystem.description} ${leadName} ${mentorNames} ${mechanismNames} ${subsystem.risks.join(" ")}`
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
