import {
  buildTaskQueueSections,
  getTaskSubteamForDisciplineId,
} from "../taskQueueOrdering";
import type { Member, Task } from "../../types/domain";

const student: Member = {
  disciplineId: "software",
  id: "student-1",
  name: "Student One",
  role: "student",
};
const mentor: Member = { id: "mentor-1", name: "Mentor One", role: "mentor" };

const baseTask: Task = {
  actualHours: 0,
  blockers: [],
  checklistItems: [],
  dependencyIds: [],
  disciplineId: "software",
  dueDate: "2026-06-10",
  estimatedHours: 2,
  id: "task",
  isBlocked: false,
  linkedManufacturingIds: [],
  linkedPurchaseIds: [],
  mechanismId: null,
  mentorId: mentor.id,
  ownerId: null,
  partInstanceId: null,
  priority: "medium",
  status: "not-started",
  subsystemId: "controls",
  summary: "Task summary.",
  targetEventId: null,
  title: "Task",
};

function makeTask(patch: Partial<Task>): Task {
  return {
    ...baseTask,
    ...patch,
    id: patch.id ?? baseTask.id,
    title: patch.title ?? patch.id ?? baseTask.title,
  };
}

function taskIds(sectionId: string, tasks: Task[]) {
  const section = buildTaskQueueSections({
    activeTaskSubteam: "programming",
    canViewAllQueues: false,
    signedInMember: student,
    taskById: Object.fromEntries(tasks.map((task) => [task.id, task])),
    tasks,
  }).find((candidate) => candidate.id === sectionId);

  return section?.tasks.map((task) => task.id) ?? [];
}

describe("task queue ordering", () => {
  it("maps discipline IDs to mobile subteam queues", () => {
    expect(getTaskSubteamForDisciplineId("software", "mechanical")).toBe("programming");
    expect(getTaskSubteamForDisciplineId("electrical", "mechanical")).toBe("electrical");
    expect(getTaskSubteamForDisciplineId("unknown", "mechanical")).toBe("mechanical");
  });

  it("orders user subteam work before other available tasks", () => {
    const tasks = [
      makeTask({ disciplineId: "mechanical", dueDate: "2026-06-01", id: "other" }),
      makeTask({ disciplineId: "software", dueDate: "2026-06-03", id: "mine-late" }),
      makeTask({ disciplineId: "software", dueDate: "2026-06-02", id: "mine-soon" }),
    ];

    expect(taskIds("primary-available", tasks)).toEqual(["mine-soon", "mine-late"]);
    expect(taskIds("other-available", tasks)).toEqual(["other"]);
  });

  it("separates blocked and Waiting QA work from available queues", () => {
    const dependency = makeTask({
      disciplineId: "mechanical",
      id: "dependency",
      status: "in-progress",
    });
    const tasks = [
      dependency,
      makeTask({ id: "blocked", blockers: ["Need mentor review"] }),
      makeTask({ dependencyIds: [dependency.id], id: "dependency-wait" }),
      makeTask({ id: "waiting", status: "waiting-for-qa" }),
      makeTask({ id: "available" }),
    ];

    expect(taskIds("primary-available", tasks)).toEqual(["available"]);
    expect(taskIds("blocked", tasks)).toEqual(["blocked", "dependency-wait"]);
    expect(taskIds("waiting-qa", tasks)).toEqual(["waiting"]);
  });

  it("lets mentors and admins see blocked and QA work across queues", () => {
    const tasks = [
      makeTask({ disciplineId: "mechanical", id: "mechanical-blocked", blockers: ["Part missing"] }),
      makeTask({ disciplineId: "electrical", id: "electrical-qa", status: "waiting-for-qa" }),
    ];
    const sections = buildTaskQueueSections({
      activeTaskSubteam: "programming",
      canViewAllQueues: true,
      signedInMember: mentor,
      taskById: Object.fromEntries(tasks.map((task) => [task.id, task])),
      tasks,
    });

    expect(sections.find((section) => section.id === "blocked")?.tasks.map((task) => task.id)).toEqual([
      "mechanical-blocked",
    ]);
    expect(sections.find((section) => section.id === "waiting-qa")?.tasks.map((task) => task.id)).toEqual([
      "electrical-qa",
    ]);
  });

  it("keeps completed subteam work visible when filters return completed tasks", () => {
    const tasks = [
      makeTask({ disciplineId: "software", id: "mine-complete", status: "complete" }),
      makeTask({ disciplineId: "mechanical", id: "other-complete", status: "complete" }),
    ];

    expect(taskIds("completed", tasks)).toEqual(["mine-complete"]);
    expect(taskIds("primary-available", tasks)).toEqual([]);
  });
});
