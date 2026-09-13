import type { TaskQueueSection } from "../../data/taskQueueOrdering";

export const TASK_QUEUE_PAGE_SIZE = 30;

export function getVisibleTaskQueueSections(
  sections: TaskQueueSection[],
  page: number,
): Array<TaskQueueSection & { totalTasks: number }> {
  let sectionOffset = 0;

  return sections.map((section) => {
    const start = sectionOffset;
    sectionOffset += section.tasks.length;

    return {
      ...section,
      totalTasks: section.tasks.length,
      tasks: section.tasks.slice(
        Math.max(0, page * TASK_QUEUE_PAGE_SIZE - start),
        Math.max(0, (page + 1) * TASK_QUEUE_PAGE_SIZE - start),
      ),
    };
  });
}
