import type { QaReport, Task, TaskDependency } from "../../types/domain";

const QA_FIX_SIZE_RANK: Record<string, number> = {
  "iteration-worthy": 0,
  "minor-fix": 1,
  pass: 2,
};

export function isUnverifiedLegacyQaReview(review: QaReport) {
  return review.status === "reviewed" && review.reviewOrder === undefined;
}

export function sortQaReviews(
  reports: readonly QaReport[],
  taskById: Record<string, Task>,
  taskDependencies: readonly TaskDependency[],
) {
  const getOrderGroup = (report: QaReport) => report.status !== "reviewed" ? 2 : report.reviewOrder === undefined ? 1 : 0;
  return [...reports].sort((left, right) => {
    const groupDelta = getOrderGroup(left) - getOrderGroup(right);
    if (groupDelta !== 0) return groupDelta;

    if (getOrderGroup(left) === 0) {
      const orderDelta = right.reviewOrder! - left.reviewOrder!;
      if (orderDelta !== 0) return orderDelta;
    } else {
      const leftDate = getOrderGroup(left) === 1 ? left.reviewedAt ?? left.id : left.createdAt;
      const rightDate = getOrderGroup(right) === 1 ? right.reviewedAt ?? right.id : right.createdAt;
      const dateDelta = rightDate.localeCompare(leftDate);
      if (dateDelta !== 0) return dateDelta;
    }

    const leftTaskId = left.targetRefs.find((target) => target.kind === "task")?.id ?? null;
    const rightTaskId = right.targetRefs.find((target) => target.kind === "task")?.id ?? null;
    const leftTask = leftTaskId ? taskById[leftTaskId] : null;
    const rightTask = rightTaskId ? taskById[rightTaskId] : null;
    const dependencyDelta = taskDependencies.filter((edge) => edge.taskId === rightTask?.id).length - taskDependencies.filter((edge) => edge.taskId === leftTask?.id).length;
    if (dependencyDelta !== 0) return dependencyDelta;

    const fixSizeDelta = QA_FIX_SIZE_RANK[left.result] - QA_FIX_SIZE_RANK[right.result];
    if (fixSizeDelta !== 0) return fixSizeDelta;
    return left.summary.localeCompare(right.summary) || left.id.localeCompare(right.id);
  });
}
