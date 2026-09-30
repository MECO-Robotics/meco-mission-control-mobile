import type { Member, Task } from "../../../types/domain";

export function makeMember(overrides: Partial<Member> & Pick<Member, "id" | "name" | "role">): Member {
  return { email: `${overrides.id}@example.org`, elevated: overrides.role === "mentor" || overrides.role === "admin" || overrides.role === "lead", seasonId: "season-2026", activeSeasonIds: ["season-2026"], ...overrides };
}

export function makeTask(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    projectId: "robot-project", workTypeId: "programming", responsibleGroupId: "robot-build", workstreamIds: [], summary: "",
    subsystemIds: [], mechanismIds: [], partInstanceIds: [], scheduleRefs: [], requestedById: null, ownerId: null, assigneeIds: [], mentorId: null,
    startDate: "2026-09-01", dueDate: "2026-09-30", priority: "medium", status: "not-started", checklistItems: [], estimatedHours: 0, actualHours: 0,
    requiresDocumentation: false, manufacturingDetails: null, ...overrides,
  };
}
