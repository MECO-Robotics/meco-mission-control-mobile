import { act, renderHook } from "@testing-library/react-native";
import { mecoSnapshot } from "../../data/mockData";
import type { Mechanism, PurchaseItem, QaReview, Subsystem, Task } from "../../types/domain";
import { useSubsystemBrowse } from "../robot/useSubsystemBrowse";

const subsystem = (id: string, risks: string[] = []): Subsystem => ({
  ...mecoSnapshot.subsystems[0], id, name: id, description: "", risks,
  responsibleEngineerId: null, mentorIds: [],
});
const task = (id: string, subsystemId: string, status: Task["status"] = "not-started"): Task => ({
  ...mecoSnapshot.tasks[0], id, subsystemId, status, dueDate: "9999-01-01", blockers: [],
});
const empty = { mechanisms: [] as Mechanism[], tasks: [] as Task[], purchaseItems: [] as PurchaseItem[], qaReviews: [] as QaReview[], membersById: {}, taskById: {} };

test("subsystem search includes ownership, mechanisms and risks while retaining canonical order and grouped counts", () => {
  const subsystems = [subsystem("second"), {
    ...subsystem("drive", ["Chain slip"]), description: "Torque module", responsibleEngineerId: "lead", mentorIds: ["mentor", "missing"],
  }, subsystem("first")];
  const mechanisms: Mechanism[] = [
    { ...mecoSnapshot.mechanisms[0], id: "wheel", subsystemId: "drive", name: "Wheel hub" },
    { ...mecoSnapshot.mechanisms[0], id: "gear", subsystemId: "drive", name: "Gearbox" },
    { ...mecoSnapshot.mechanisms[0], id: "orphan", subsystemId: "missing", name: "Orphan" },
  ];
  const membersById = {
    lead: { ...mecoSnapshot.members[0], name: "Alex Engineer" },
    mentor: { ...mecoSnapshot.members[0], name: "Robin Mentor" },
  };
  const { result } = renderHook(() => useSubsystemBrowse({ ...empty, subsystems, mechanisms, membersById }));
  expect(result.current.rows.map(({ subsystem: row }) => row.id)).toEqual(["second", "drive", "first"]);
  expect(result.current.visibleMechanismCount).toBe(2);
  for (const search of ["DRIVE", " torque ", "Alex", "Robin", "Wheel", "slip"]) {
    act(() => result.current.updateFilters({ search }));
    expect(result.current.rows.map(({ subsystem: row }) => row.id)).toEqual(["drive"]);
    expect(result.current.rows[0].mechanisms.map(({ id }) => id)).toEqual(["wheel", "gear"]);
    expect(result.current.visibleMechanismCount).toBe(2);
  }
  act(() => result.current.updateFilters({ search: "Orphan" }));
  expect(result.current.rows).toEqual([]);
  expect(result.current.visibleMechanismCount).toBe(0);
});

test("health retains risk precedence and exclusions for completed tasks, delivered purchases and passing QA", () => {
  const subsystems = [subsystem("risk"), subsystem("watch", ["Watch item"]), subsystem("good"), subsystem("two-risks", ["One", "Two"])];
  const tasks = [
    { ...task("blocked", "risk"), blockers: ["Delivery"], dueDate: "2000-01-01" },
    task("qa", "watch", "waiting-for-qa"),
    { ...task("complete", "good", "complete"), blockers: ["Historical"], dueDate: "2000-01-01" },
    task("unknown", "missing"),
  ];
  const purchaseItems: PurchaseItem[] = [
    { ...mecoSnapshot.purchaseItems[0], subsystemId: "watch", status: "purchased" },
    { ...mecoSnapshot.purchaseItems[0], subsystemId: "good", status: "delivered" },
  ];
  const qaReviews: QaReview[] = [
    { ...mecoSnapshot.qaReviews[0], taskId: "blocked", result: "minor-fix" },
    { ...mecoSnapshot.qaReviews[0], taskId: null, subjectType: "task", subjectId: "blocked", result: "minor-fix" },
    { ...mecoSnapshot.qaReviews[0], taskId: "complete", result: "pass" },
    { ...mecoSnapshot.qaReviews[0], taskId: "missing", result: "minor-fix" },
  ];
  const input = { ...empty, subsystems, tasks, purchaseItems, qaReviews, taskById: Object.fromEntries(tasks.map((item) => [item.id, item])) };
  const { result, rerender } = renderHook(({ reviews }: { reviews: QaReview[] }) => useSubsystemBrowse({ ...input, qaReviews: reviews }), { initialProps: { reviews: qaReviews } });
  expect(result.current.rows.map(({ counts }) => counts.health)).toEqual(["risk", "watch", "good", "risk"]);
  expect(result.current.rows[0].counts).toMatchObject({ tasks: 1, openTasks: 1, blockedTasks: 1, overdueTasks: 1, qaFindings: 2 });
  expect(result.current.rows[1].counts).toMatchObject({ waitingQa: 1, openPurchases: 1 });
  expect(result.current.rows[2].counts).toMatchObject({ tasks: 1, openTasks: 0, blockedTasks: 0, overdueTasks: 0, openPurchases: 0, qaFindings: 0 });
  rerender({ reviews: [...qaReviews, { ...qaReviews[0], taskId: "qa" }] });
  expect(result.current.rows[1].counts.health).toBe("risk");
});

test("expansion survives hidden search and refresh, preserves explicit collapse and reconciles deleted selection", () => {
  const subsystems = [subsystem("first"), subsystem("second")];
  const { result, rerender } = renderHook(({ items }: { items: Subsystem[] }) => useSubsystemBrowse({ ...empty, subsystems: items }), { initialProps: { items: subsystems } });
  expect(result.current.rows[0].isExpanded).toBe(true);
  act(() => result.current.updateFilters({ search: "second" }));
  expect(result.current.rows[0].isExpanded).toBe(false);
  act(() => result.current.updateFilters({ search: "" }));
  expect(result.current.rows[0].isExpanded).toBe(true);
  act(() => result.current.toggleExpanded("first"));
  rerender({ items: [...subsystems] });
  expect(result.current.rows.every((row) => !row.isExpanded)).toBe(true);
  act(() => result.current.toggleExpanded("second"));
  rerender({ items: [subsystems[0]] });
  expect(result.current.rows[0].isExpanded).toBe(true);
  rerender({ items: [] });
  rerender({ items: subsystems });
  expect(result.current.rows.every((row) => !row.isExpanded)).toBe(true);
});
