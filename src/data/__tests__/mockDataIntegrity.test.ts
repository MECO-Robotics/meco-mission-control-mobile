import { mecoSnapshot } from "../mockData";

function ids<T extends { id: string }>(items: T[]) {
  return new Set(items.map((item) => item.id));
}

function expectKnownId(linkedId: string | null | undefined, knownIds: Set<string>) {
  if (linkedId) {
    expect(knownIds.has(linkedId)).toBe(true);
  }
}

describe("mobile fallback data integrity", () => {
  const memberIds = ids(mecoSnapshot.members);
  const subsystemIds = ids(mecoSnapshot.subsystems);
  const disciplineIds = ids(mecoSnapshot.disciplines);
  const mechanismIds = ids(mecoSnapshot.mechanisms);
  const requirementIds = ids(mecoSnapshot.requirements);
  const partDefinitionIds = ids(mecoSnapshot.partDefinitions);
  const partInstanceIds = ids(mecoSnapshot.partInstances);
  const eventIds = ids(mecoSnapshot.events);
  const taskIds = ids(mecoSnapshot.tasks);
  const manufacturingIds = ids(mecoSnapshot.manufacturingItems);
  const purchaseIds = ids(mecoSnapshot.purchaseItems);
  const workLogIds = ids(mecoSnapshot.workLogs);

  it("keeps new offseason fallback sample coverage broad enough for offline screens", () => {
    expect(mecoSnapshot.members.length).toBeGreaterThanOrEqual(14);
    expect(mecoSnapshot.subsystems.map((subsystem) => subsystem.id)).toEqual(
      expect.arrayContaining(["practice-field", "pit-readiness", "scouting", "vision"]),
    );
    expect(mecoSnapshot.events.map((event) => event.id)).toEqual(
      expect.arrayContaining([
        "summer-scrimmage-jun-13",
        "vision-drive-calibration-jun-20",
        "offseason-volunteer-day-jul-11",
      ]),
    );
    expect(mecoSnapshot.tasks.map((task) => task.id)).toEqual(
      expect.arrayContaining([
        "vision-apriltag-recalibration",
        "practice-field-reset-flow",
        "radio-brownout-checklist",
      ]),
    );
  });

  it("links fallback records only to known members, subsystems, mechanisms, parts, events, and tasks", () => {
    for (const member of mecoSnapshot.members) {
      expectKnownId(member.disciplineId, disciplineIds);
    }

    for (const subsystem of mecoSnapshot.subsystems) {
      expectKnownId(subsystem.parentSubsystemId, subsystemIds);
      expectKnownId(subsystem.responsibleEngineerId, memberIds);
      subsystem.mentorIds.forEach((mentorId) => expectKnownId(mentorId, memberIds));
    }

    for (const mechanism of mecoSnapshot.mechanisms) {
      expectKnownId(mechanism.subsystemId, subsystemIds);
    }

    for (const requirement of mecoSnapshot.requirements) {
      expectKnownId(requirement.subsystemId, subsystemIds);
    }

    for (const partInstance of mecoSnapshot.partInstances) {
      expectKnownId(partInstance.subsystemId, subsystemIds);
      expectKnownId(partInstance.mechanismId, mechanismIds);
      expectKnownId(partInstance.partDefinitionId, partDefinitionIds);
    }

    for (const event of mecoSnapshot.events) {
      event.relatedSubsystemIds.forEach((subsystemId) => expectKnownId(subsystemId, subsystemIds));
    }

    for (const task of mecoSnapshot.tasks) {
      expectKnownId(task.subsystemId, subsystemIds);
      expectKnownId(task.disciplineId, disciplineIds);
      expectKnownId(task.requirementId, requirementIds);
      expectKnownId(task.mechanismId, mechanismIds);
      expectKnownId(task.partInstanceId, partInstanceIds);
      expectKnownId(task.targetEventId, eventIds);
      expectKnownId(task.ownerId, memberIds);
      expectKnownId(task.mentorId, memberIds);
      task.dependencyIds.forEach((dependencyId) => expectKnownId(dependencyId, taskIds));
      task.linkedManufacturingIds.forEach((manufacturingId) =>
        expectKnownId(manufacturingId, manufacturingIds),
      );
      task.linkedPurchaseIds.forEach((purchaseId) => expectKnownId(purchaseId, purchaseIds));
    }

    for (const workLog of mecoSnapshot.workLogs) {
      expectKnownId(workLog.taskId, taskIds);
      workLog.participantIds.forEach((participantId) => expectKnownId(participantId, memberIds));
    }

    for (const attendanceRecord of mecoSnapshot.attendanceRecords) {
      expectKnownId(attendanceRecord.memberId, memberIds);
    }

    for (const manufacturingItem of mecoSnapshot.manufacturingItems) {
      expectKnownId(manufacturingItem.subsystemId, subsystemIds);
      expectKnownId(manufacturingItem.requestedById, memberIds);
      expectKnownId(manufacturingItem.partDefinitionId, partDefinitionIds);
    }

    for (const purchaseItem of mecoSnapshot.purchaseItems) {
      expectKnownId(purchaseItem.subsystemId, subsystemIds);
      expectKnownId(purchaseItem.requestedById, memberIds);
      expectKnownId(purchaseItem.partDefinitionId, partDefinitionIds);
    }

    for (const qaReview of mecoSnapshot.qaReviews) {
      expectKnownId(qaReview.taskId, taskIds);
      if (qaReview.subjectType === "task") {
        expectKnownId(qaReview.subjectId, taskIds);
      }
      if (qaReview.subjectType === "manufacturing") {
        expectKnownId(qaReview.subjectId, manufacturingIds);
      }
      qaReview.participantIds.forEach((participantId) => expectKnownId(participantId, memberIds));
      expectKnownId(qaReview.requestedById, memberIds);
      expectKnownId(qaReview.mentorId, memberIds);
    }

    expect(workLogIds.size).toBe(mecoSnapshot.workLogs.length);
  });
});
