import { mecoSnapshot } from "./fixtures/mockData";

const ids = <T extends { id: string }>(items: T[]) => new Set(items.map(({ id }) => id));

describe("canonical mobile FRC fixtures", () => {
  it("uses the six season projects and links Tasks to independent work type and responsible group dimensions", () => {
    expect(mecoSnapshot.projects.map(({ name }) => name)).toEqual(["Robot", "Media", "Outreach", "Operations", "Strategy", "Training"]);
    const projectIds = ids(mecoSnapshot.projects);
    const workTypeIds = ids(mecoSnapshot.workTypes);
    const responsibleGroupIds = ids(mecoSnapshot.responsibleGroups);
    for (const task of mecoSnapshot.tasks) {
      expect(projectIds.has(task.projectId)).toBe(true);
      expect(workTypeIds.has(task.workTypeId)).toBe(true);
      if (task.responsibleGroupId) expect(responsibleGroupIds.has(task.responsibleGroupId)).toBe(true);
      expect(task).not.toHaveProperty("disciplineId");
      expect(task).not.toHaveProperty("blockers");
    }
  });

  it("keeps purchasing, inventory location, schedule and evidence references in their owning domains", () => {
    const taskIds = ids(mecoSnapshot.tasks);
    const partDefinitionIds = ids(mecoSnapshot.partDefinitions);
    const subsystemIds = ids(mecoSnapshot.subsystems);
    for (const purchase of mecoSnapshot.purchaseItems) {
      expect(taskIds.has(purchase.taskId)).toBe(true);
      if (purchase.partDefinitionId) expect(partDefinitionIds.has(purchase.partDefinitionId)).toBe(true);
    }
    for (const instance of mecoSnapshot.partInstances) {
      expect(partDefinitionIds.has(instance.partDefinitionId)).toBe(true);
      if (instance.location.kind === "installed") expect(subsystemIds.has(instance.location.subsystemId)).toBe(true);
    }
    for (const report of mecoSnapshot.qaReports) {
      expect(report.targetRefs.length).toBeGreaterThan(0);
      for (const target of report.targetRefs) {
        if (target.kind === "task") expect(taskIds.has(target.id)).toBe(true);
      }
    }
    for (const dependency of mecoSnapshot.taskDependencies) {
      expect(taskIds.has(dependency.taskId)).toBe(true);
      if (dependency.kind === "task") expect(taskIds.has(dependency.refId)).toBe(true);
    }
  });
});
