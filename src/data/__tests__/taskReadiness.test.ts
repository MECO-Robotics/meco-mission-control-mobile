import { getAutoTaskStatus, isTaskBlocked, isTaskReadyForQaPass, hasOpenTaskDependency } from "../taskReadiness";
import { getTaskAssignmentState } from "../taskAssignment";
import { mecoSnapshot } from "../mockData";

const member = { id: "member", name: "Member", role: "student" as const };
test("queue and controls respect authoritative blocking even when blocker text is empty", () => {
  const task = { ...mecoSnapshot.tasks[0], ownerId: member.id, blockers: [], isBlocked: true, isWaitingOnDependency: true, status: "not-started" as const };
  expect(isTaskBlocked(task)).toBe(true);
  expect(hasOpenTaskDependency(task)).toBe(true);
  expect(getAutoTaskStatus(task)).toBe("not-started");
  expect(getTaskAssignmentState({ task, membersById: { member }, signedInMember: member, canReassignTasks: false }).canStartWork).toBe(false);
  expect(isTaskReadyForQaPass({ ...task, status: "waiting-for-qa" })).toBe(false);
});
test("satisfied server dependencies permit work without reconstructing readiness from task status", () => {
  const task = { ...mecoSnapshot.tasks[0], ownerId: member.id, isBlocked: false, isWaitingOnDependency: false, status: "not-started" as const };
  expect(getAutoTaskStatus(task)).toBe("in-progress");
  expect(isTaskReadyForQaPass({ ...task, status: "waiting-for-qa" })).toBe(true);
});
