import { getTaskMetrics, getVisibleGroups } from "../teamMetrics";
import type { ResponsibleGroup, Task } from "../../../types/domain";

const task = (patch: Partial<Task> = {}): Task => ({ id: "t1", projectId: "p", workTypeId: "w", responsibleGroupId: "g", workstreamIds: [], title: "Work", summary: "", subsystemIds: [], mechanismIds: [], partInstanceIds: [], scheduleRefs: [], requestedById: null, ownerId: "s1", assigneeIds: [], mentorId: null, startDate: "", dueDate: "2026-01-01", priority: "medium", status: "in-progress", checklistItems: [], estimatedHours: 6, actualHours: 2, requiresDocumentation: false, manufacturingDetails: null, ...patch });
test("task metrics derive open, blocked, overdue and remaining estimate from tasks", () => {
  expect(getTaskMetrics([task({ isWaitingOnDependency: true }), task({ id: "t2", status: "complete" })], "2026-02-01")).toEqual({ open: 1, blocked: 1, overdue: 1, remainingHours: 4 });
});

test("archived groups can be surfaced alongside active groups for restoration", () => {
  const groups: ResponsibleGroup[] = [
    { id: "active", seasonId: "s", name: "Active", icon: "wrench", color: "#B45309", projectIds: [], workTypeIds: [], primaryMemberIds: [], memberIds: [], isArchived: false },
    { id: "archived", seasonId: "s", name: "Archived", icon: "code", color: "#7C3AED", projectIds: [], workTypeIds: [], primaryMemberIds: [], memberIds: [], isArchived: true },
  ];
  expect(getVisibleGroups(groups, "active").map(({ id }) => id)).toEqual(["active"]);
  expect(getVisibleGroups(groups, "archived").map(({ id }) => id)).toEqual(["archived"]);
  expect(getVisibleGroups(groups, "all")).toHaveLength(2);
});

test("default overdue cutoff follows the device calendar rather than UTC", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-09T11:30:00Z"));
  const offset = jest.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-780);
  try {
    expect(getTaskMetrics([task({ dueDate: "2026-10-09" })]).overdue).toBe(1);
  } finally { offset.mockRestore(); jest.useRealTimers(); }
});
