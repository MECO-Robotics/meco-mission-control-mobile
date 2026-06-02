import { ApiRequestError } from "../api";
import {
  getDefaultWorkLogParticipantIds,
  getTaskAssignmentConflict,
  getTaskAssignmentConflictMessage,
  getTaskAssignmentState,
} from "../taskAssignment";
import type { Member, Task } from "../../types/domain";

const student: Member = { id: "ava", name: "Ava Chen", role: "student" };
const otherStudent: Member = { id: "lucas", name: "Lucas Brooks", role: "student" };
const mentor: Member = { id: "jordan", name: "Jordan Lee", role: "mentor" };
const external: Member = { id: "sam", name: "Sam Rivera", role: "external" };

const baseTask: Task = {
  id: "task-1",
  title: "Wire launcher",
  summary: "Add wiring.",
  subsystemId: "controls",
  disciplineId: "electrical",
  mechanismId: null,
  partInstanceId: null,
  targetEventId: null,
  ownerId: null,
  mentorId: mentor.id,
  dueDate: "2026-06-10",
  priority: "high",
  status: "not-started",
  dependencyIds: [],
  checklistItems: [],
  blockers: [],
  isBlocked: false,
  linkedManufacturingIds: [],
  linkedPurchaseIds: [],
  estimatedHours: 2,
  actualHours: 0,
};

const membersById = {
  [student.id]: student,
  [otherStudent.id]: otherStudent,
  [mentor.id]: mentor,
};

describe("task assignment state", () => {
  it("lets a student claim and start an unowned ready task", () => {
    const state = getTaskAssignmentState({
      canReassignTasks: false,
      hasOpenDependencies: false,
      membersById,
      signedInMember: student,
      task: baseTask,
    });

    expect(state.canClaim).toBe(true);
    expect(state.canStartWork).toBe(true);
    expect(state.canRelease).toBe(false);
  });

  it("lets the current owner release and start work", () => {
    const state = getTaskAssignmentState({
      canReassignTasks: false,
      hasOpenDependencies: false,
      membersById,
      signedInMember: student,
      task: { ...baseTask, ownerId: student.id },
    });

    expect(state.canClaim).toBe(false);
    expect(state.canRelease).toBe(true);
    expect(state.canStartWork).toBe(true);
    expect(state.isClaimedByCurrentMember).toBe(true);
  });

  it("shows claimed-by-other state without student start controls", () => {
    const state = getTaskAssignmentState({
      canReassignTasks: false,
      hasOpenDependencies: false,
      membersById,
      signedInMember: student,
      task: { ...baseTask, ownerId: otherStudent.id },
    });

    expect(state.canClaim).toBe(false);
    expect(state.canRelease).toBe(false);
    expect(state.canStartWork).toBe(false);
    expect(state.isClaimedByOtherMember).toBe(true);
    expect(state.ownerName).toBe("Lucas Brooks");
  });

  it("does not expose claim or start controls without a matched signed-in roster member", () => {
    const state = getTaskAssignmentState({
      canReassignTasks: false,
      hasOpenDependencies: false,
      membersById,
      signedInMember: null,
      task: baseTask,
    });

    expect(state.canClaim).toBe(false);
    expect(state.canStartWork).toBe(false);
  });

  it("does not expose claim or start controls for non task-owning roles", () => {
    const state = getTaskAssignmentState({
      canReassignTasks: false,
      hasOpenDependencies: false,
      membersById,
      signedInMember: external,
      task: baseTask,
    });

    expect(state.canClaim).toBe(false);
    expect(state.canStartWork).toBe(false);
  });

  it("does not expose start controls while blockers or dependencies are open", () => {
    const blockedState = getTaskAssignmentState({
      canReassignTasks: false,
      hasOpenDependencies: false,
      membersById,
      signedInMember: student,
      task: { ...baseTask, blockers: ["Waiting on mentor review"], ownerId: student.id },
    });
    const dependencyState = getTaskAssignmentState({
      canReassignTasks: false,
      hasOpenDependencies: true,
      membersById,
      signedInMember: student,
      task: { ...baseTask, ownerId: student.id },
    });

    expect(blockedState.canStartWork).toBe(false);
    expect(dependencyState.canStartWork).toBe(false);
  });

  it("lets mentors reassign claimed tasks", () => {
    const state = getTaskAssignmentState({
      canReassignTasks: true,
      hasOpenDependencies: false,
      membersById,
      signedInMember: mentor,
      task: { ...baseTask, ownerId: student.id },
    });

    expect(state.canReassign).toBe(true);
    expect(state.canRelease).toBe(true);
  });
});

describe("task assignment conflict handling", () => {
  it("maps already-claimed conflicts into user-facing copy", () => {
    const error = new ApiRequestError("Task already claimed.", 409, {
      code: "task_already_claimed",
      ownerId: otherStudent.id,
      taskId: baseTask.id,
    });

    const conflict = getTaskAssignmentConflict(error);

    expect(conflict).toMatchObject({
      code: "task_already_claimed",
      ownerId: otherStudent.id,
      taskId: baseTask.id,
    });
    expect(getTaskAssignmentConflictMessage(conflict!, membersById)).toBe(
      "Already claimed by Lucas Brooks. The task list has been refreshed.",
    );
    expect(getTaskAssignmentConflictMessage(conflict!, membersById, false)).toBe(
      "Already claimed by Lucas Brooks. Refresh failed; pull to refresh before trying again.",
    );
  });
});

describe("worklog participant defaults", () => {
  it("prefills worklogs with the signed-in member before roster fallback", () => {
    expect(getDefaultWorkLogParticipantIds(otherStudent, [student, otherStudent])).toEqual([
      otherStudent.id,
    ]);
  });
});
