import {
  buildHelpRequest,
  buildHelpRequestDisplayRows,
  getDefaultHelpMentorId,
} from "../helpRequests";
import type { Member, Task, WorkLog } from "../../types/domain";

const mentors: Member[] = [
  { id: "jordan", name: "Jordan Lee", role: "mentor" },
  { id: "riley", name: "Riley Kim", role: "mentor" },
];

const student: Member = { id: "ava", name: "Ava Chen", role: "student" };

const task: Task = {
  id: "swerve-sensor-bundle",
  title: "Validate swerve sensors",
  summary: "Confirm encoder zeroing before QA.",
  subsystemId: "drive",
  disciplineId: "mechanical",
  mechanismId: null,
  partInstanceId: null,
  targetEventId: null,
  ownerId: student.id,
  mentorId: "riley",
  dueDate: "2026-04-24",
  priority: "high",
  status: "in-progress",
  blockers: [],
  isBlocked: false, isWaitingOnDependency: false, checklistItems: [],
  linkedManufacturingIds: [],
  linkedPurchaseIds: [],
  estimatedHours: 2,
  actualHours: 0,
};

const workLog: WorkLog = {
  id: "log-1",
  taskId: task.id,
  date: "2026-04-22",
  hours: 1.5,
  participantIds: [student.id],
  notes: "Checked sensor harness routing.",
};

describe("need help request state", () => {
  it("captures the reason and selected mentor", () => {
    const request = buildHelpRequest({
      id: "help-1",
      taskId: task.id,
      reason: "Need a mentor to verify the encoder reading before we keep going.",
      mentorId: "riley",
      requestedById: student.id,
      createdAt: "2026-04-22T18:30:00.000Z",
    });

    expect(request).toMatchObject({
      id: "help-1",
      taskId: task.id,
      reason: "Need a mentor to verify the encoder reading before we keep going.",
      mentorId: "riley",
      requestedById: student.id,
      status: "requested",
    });
  });

  it("does not change an active task status when help is requested", () => {
    const beforeStatus = task.status;
    const request = buildHelpRequest({
      id: "help-2",
      taskId: task.id,
      reason: "Stuck on calibration output.",
      mentorId: getDefaultHelpMentorId(task, mentors),
      requestedById: student.id,
      createdAt: "2026-04-22T18:35:00.000Z",
    });

    expect(request?.status).toBe("requested");
    expect(task.status).toBe(beforeStatus);
    expect(task.status).toBe("in-progress");
  });

  it("falls back when a task mentor is no longer in the mentor roster", () => {
    expect(getDefaultHelpMentorId({ mentorId: "former-mentor" }, mentors)).toBe("jordan");
  });

  it("builds mentor-visible help queue rows with requester and work context", () => {
    const request = buildHelpRequest({
      id: "help-3",
      taskId: task.id,
      workLogId: workLog.id,
      reason: "Need help interpreting the logged sensor check.",
      mentorId: "riley",
      requestedById: student.id,
      createdAt: "2026-04-22T18:40:00.000Z",
    });

    const rows = buildHelpRequestDisplayRows({
      helpRequests: request ? [request] : [],
      membersById: {
        [student.id]: student,
        jordan: mentors[0],
        riley: mentors[1],
      },
      taskById: { [task.id]: task },
      workLogsById: { [workLog.id]: workLog },
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: "help-3",
        mentorName: "Riley Kim",
        requesterName: "Ava Chen",
        reason: "Need help interpreting the logged sensor check.",
        taskTitle: "Validate swerve sensors",
        workLogLabel: "2026-04-22 - 1.5h",
        status: "requested",
      }),
    ]);
  });
});
