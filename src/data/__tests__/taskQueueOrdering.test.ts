import { buildTaskQueueSections } from "../taskQueueOrdering";
import type { Member, ResponsibleGroup, Task } from "../../types/domain";

const mentor: Member = { id: "mentor-1", name: "Mentor One", role: "mentor", email: "mentor@example.org", elevated: true, seasonId: "season", activeSeasonIds: ["season"] };
const groups: ResponsibleGroup[] = [
  { id: "robot-build", seasonId: "season", name: "Robot Build", projectIds: ["robot"], memberIds: [mentor.id], isArchived: false },
  { id: "programming", seasonId: "season", name: "Programming", projectIds: ["robot"], memberIds: [], isArchived: false },
];
const baseTask: Task = {
  actualHours: 0, projectId: "robot", workTypeId: "programming", responsibleGroupId: "programming", dueDate: "2026-06-10", estimatedHours: 2,
  id: "task", isBlocked: false, isWaitingOnDependency: false, checklistItems: [], scheduleRefs: [], manufacturingDetails: null,
  mechanismIds: [], mentorId: mentor.id, ownerId: null, requestedById: null, assigneeIds: [], partInstanceIds: [], priority: "medium", status: "not-started",
  workstreamIds: [], subsystemIds: ["controls"], summary: "Task summary.", title: "Task", startDate: "2026-06-01", requiresDocumentation: false,
};
function makeTask(patch: Partial<Task>): Task { return { ...baseTask, ...patch, id: patch.id ?? baseTask.id, title: patch.title ?? patch.id ?? baseTask.title }; }
function taskIds(sectionId: string, tasks: Task[], activeResponsibleGroupId = "programming") {
  return buildTaskQueueSections({ activeResponsibleGroupId, responsibleGroups: groups, canViewAllQueues: false, tasks }).find(({ id }) => id === sectionId)?.tasks.map(({ id }) => id) ?? [];
}

describe("Task Kanban queue ordering", () => {
  it("filters by responsible group independently from work type", () => {
    const tasks = [
      makeTask({ workTypeId: "design", responsibleGroupId: "robot-build", dueDate: "2026-06-01", id: "other" }),
      makeTask({ workTypeId: "programming", responsibleGroupId: "programming", dueDate: "2026-06-03", id: "mine-late" }),
      makeTask({ workTypeId: "testing", responsibleGroupId: "programming", dueDate: "2026-06-02", id: "mine-soon" }),
    ];
    expect(taskIds("primary-available", tasks)).toEqual(["mine-soon", "mine-late"]);
    expect(taskIds("other-available", tasks)).toEqual(["other"]);
  });
  it("separates dependency-blocked and QA work from available queues", () => {
    const tasks = [makeTask({ id: "blocked", isBlocked: true }), makeTask({ id: "waiting", status: "waiting-for-qa" }), makeTask({ id: "available" })];
    expect(taskIds("primary-available", tasks)).toEqual(["available"]);
    expect(taskIds("blocked", tasks)).toEqual(["blocked"]);
    expect(taskIds("waiting-qa", tasks)).toEqual(["waiting"]);
  });
  it("lets reviewers see all responsible-group work", () => {
    const tasks = [makeTask({ id: "other-blocked", responsibleGroupId: "robot-build", isBlocked: true }), makeTask({ id: "group-qa", status: "waiting-for-qa" })];
    const sections = buildTaskQueueSections({ activeResponsibleGroupId: "programming", responsibleGroups: groups, canViewAllQueues: true, tasks });
    expect(sections.find(({ id }) => id === "blocked")?.tasks.map(({ id }) => id)).toEqual(["other-blocked"]);
    expect(sections.find(({ id }) => id === "waiting-qa")?.tasks.map(({ id }) => id)).toEqual(["group-qa"]);
  });
  it("keeps completed work visible when filtering the group queue", () => {
    const tasks = [makeTask({ id: "mine-complete", status: "complete" }), makeTask({ id: "other-complete", responsibleGroupId: "robot-build", status: "complete" })];
    expect(taskIds("completed", tasks)).toEqual(["mine-complete"]);
    expect(taskIds("primary-available", tasks)).toEqual([]);
  });
});
