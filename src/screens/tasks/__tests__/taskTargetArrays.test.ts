import { buildLanes } from "../../../ui/landscapeTimeline/landscapeTimelineModel";
import { mecoSnapshot } from "../../../data/__tests__/fixtures/mockData";
import { makeTask } from "../../../data/__tests__/fixtures/factories";

test("timeline places one Task in each distinct subsystem lane without duplicating a lane", () => {
  const subsystems = ["drive", "arm"].map((id) => ({ ...mecoSnapshot.subsystems[0], id, name: id }));
  const task = makeTask({ id: "multi-target", title: "Build assembly", subsystemIds: ["drive", "arm", "arm"], startDate: "2026-09-01", dueDate: "2026-09-15" });
  const lanes = buildLanes([task], subsystems, new Date(2026, 8, 1), 30);
  expect(lanes.find(({ id }) => id === "drive")?.tasks.map(({ task: item }) => item.id)).toEqual([task.id]);
  expect(lanes.find(({ id }) => id === "arm")?.tasks.map(({ task: item }) => item.id)).toEqual([task.id]);
});

test("part-instance location remains a tagged physical state independent of readiness", () => {
  const part = mecoSnapshot.partInstances[0];
  expect(part.location).toEqual({ kind: "installed", subsystemId: "drive", mechanismId: "swerve-module" });
  expect(part.readinessStatus).toBe("ready");
});
