import { projectWorkItems, resolveWorkItems } from "../workItems";
import type { ManufacturingItem, Task } from "../../types/domain";

const task = (id: string, linkedManufacturingIds: string[] = [], workType?: Task["workType"], title = `Task ${id}`): Task => ({
  id, title, workType, summary: "", subsystemIds: ["subsystem"], disciplineId: "mech", mechanismIds: [],
  partInstanceIds: [], targetEventId: null, ownerId: null, mentorId: null, dueDate: "2026-10-01", priority: "medium",
  status: "not-started", workstreamIds: [], artifactIds: [], checklistItems: [], blockers: [], isBlocked: false, isWaitingOnDependency: false,
  linkedManufacturingIds, linkedPurchaseIds: [], estimatedHours: 0, actualHours: 0,
});

const manufacturing = (id: string): ManufacturingItem => ({
  id, title: `Part ${id}`, subsystemId: "subsystem", requestedById: null, process: "cnc", dueDate: "2026-10-02",
  material: "Aluminum", quantity: 2, status: "requested", mentorReviewed: false, qaReviewCount: 0,
});

describe("projectWorkItems", () => {
  it("projects tasks and specialized manufacturing records into one queue and collapses linked duplicate work", () => {
    const items = projectWorkItems([task("build", ["linked-part"], "Manufacturing", "Make part linked-part")], [manufacturing("linked-part"), manufacturing("standalone-part")]);
    expect(items).toHaveLength(2);
    expect(items.map(({ sourceType, sourceId }) => [sourceType, sourceId])).toEqual([
      ["manufacturing", "linked-part"], ["manufacturing", "standalone-part"],
    ]);
    expect(items[0]).toMatchObject({ taskId: "build", workType: "Manufacturing", manufacturingProcess: "cnc", quantity: 2, material: "Aluminum", mentorReviewed: false });
    expect(items[1].taskId).toBeNull();
  });

  it("keeps a linked Design task as separate work unless its normalized title matches", () => {
    const items = projectWorkItems([task("design", ["linked-part"], "Design", "Design a new intake")], [manufacturing("linked-part")]);
    expect(items).toHaveLength(2);
    expect(items.map(({ sourceType, sourceId }) => [sourceType, sourceId])).toEqual([
      ["task", "design"], ["manufacturing", "linked-part"],
    ]);
    expect(items[1].taskId).toBeNull();
  });

  it("uses the server projection as authoritative and falls back only when omitted", () => {
    const canonical = projectWorkItems([task("canonical")], []);
    expect(resolveWorkItems(canonical, [task("fallback")], [])).toBe(canonical);
    expect(resolveWorkItems(undefined, [task("fallback")], [])[0].sourceId).toBe("fallback");
  });
});
