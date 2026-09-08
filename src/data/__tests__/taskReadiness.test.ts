import { getAutoTaskStatus, isTaskBlocked, isTaskReadyForQaPass, hasOpenTaskDependency } from "../taskReadiness";
import { getTaskAssignmentState } from "../taskAssignment";
import { mecoSnapshot } from "../mockData";

const member = { id: "member", name: "Member", role: "student" as const };
test.each([
  { isBlocked: true, isWaitingOnDependency: false },
  { isBlocked: false, isWaitingOnDependency: true },
])("queue and controls respect separate server readiness flags: %o", (readiness) => {
  const task = { ...mecoSnapshot.tasks[0], ownerId: member.id, blockers: [], ...readiness, status: "not-started" as const };
  expect(isTaskBlocked(task)).toBe(true);
  expect(hasOpenTaskDependency(task)).toBe(readiness.isWaitingOnDependency);
  expect(getAutoTaskStatus(task)).toBe("not-started");
  expect(getTaskAssignmentState({ task, membersById: { member }, signedInMember: member, canReassignTasks: false }).canStartWork).toBe(false);
  expect(isTaskReadyForQaPass({ ...task, status: "waiting-for-qa" })).toBe(false);
});
test("satisfied server dependencies permit work without reconstructing readiness from task status", () => {
  const task = { ...mecoSnapshot.tasks[0], ownerId: member.id, isBlocked: false, isWaitingOnDependency: false, status: "not-started" as const };
  expect(getAutoTaskStatus(task)).toBe("in-progress");
  expect(isTaskReadyForQaPass({ ...task, status: "waiting-for-qa" })).toBe(true);
});
