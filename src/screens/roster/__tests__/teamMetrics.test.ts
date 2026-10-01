import { getCohortMetrics, getTaskMetrics, getVisibleGroups } from "../teamMetrics";
import type { Member, ResponsibleGroup, Task, WorkLog } from "../../../types/domain";

const task = (patch: Partial<Task> = {}): Task => ({ id: "t1", projectId: "p", workTypeId: "w", responsibleGroupId: "g", workstreamIds: [], title: "Work", summary: "", subsystemIds: [], mechanismIds: [], partInstanceIds: [], scheduleRefs: [], requestedById: null, ownerId: "s1", assigneeIds: [], mentorId: null, startDate: "", dueDate: "2026-01-01", priority: "medium", status: "in-progress", checklistItems: [], estimatedHours: 6, actualHours: 2, requiresDocumentation: false, manufacturingDetails: null, ...patch });
const members: Member[] = [
  { id: "s1", name: "Student", email: "", role: "student", elevated: false, seasonId: "s", activeSeasonIds: ["s"], classYear: "freshman" },
  { id: "s2", name: "Student Lead", email: "", role: "lead", elevated: true, seasonId: "s", activeSeasonIds: ["s"], classYear: "freshman" },
  { id: "m", name: "Mentor", email: "", role: "mentor", elevated: false, seasonId: "s", activeSeasonIds: ["s"] },
];
const logs: WorkLog[] = [{ id: "l", taskId: "t1", date: "2026-01-01", hours: 2.5, participantIds: ["s1", "m"], notes: "" }];

test("task metrics derive open, blocked, overdue and remaining estimate from tasks", () => {
  expect(getTaskMetrics([task({ isWaitingOnDependency: true }), task({ id: "t2", status: "complete" })], "2026-02-01")).toEqual({ open: 1, blocked: 1, overdue: 1, remainingHours: 4 });
});

test("student cohorts aggregate member task and participant work log data without creating owners", () => {
  const metrics = getCohortMetrics(members, [task()], logs);
  expect(metrics[0]).toMatchObject({ classYear: "freshman", members: 2, openTasks: 1, remainingHours: 4, loggedHours: 2.5 });
  expect(metrics.slice(1).every((row) => row.members === 0)).toBe(true);
});

test("archived groups can be surfaced alongside active groups for restoration", () => {
  const groups: ResponsibleGroup[] = [
    { id: "active", seasonId: "s", name: "Active", projectIds: [], memberIds: [], isArchived: false },
    { id: "archived", seasonId: "s", name: "Archived", projectIds: [], memberIds: [], isArchived: true },
  ];
  expect(getVisibleGroups(groups, "active").map(({ id }) => id)).toEqual(["active"]);
  expect(getVisibleGroups(groups, "archived").map(({ id }) => id)).toEqual(["archived"]);
  expect(getVisibleGroups(groups, "all")).toHaveLength(2);
});
