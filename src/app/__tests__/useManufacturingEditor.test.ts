import { act, renderHook } from "@testing-library/react-native";
import { useManufacturingEditor } from "../editorModals/useManufacturingEditor";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import type { ManufacturingViewTab } from "../../ui/types";
import { projectWorkItems } from "../../data/workItems";

function setup(manufacturingView: ManufacturingViewTab = "all", canMentorApprove = false, succeeds = true, failDependencyOnce = false) {
  const mutate = jest.fn(async (_path: string, _init: RequestInit) => succeeds);
  const requests: { path: string; init: RequestInit }[] = [];
  let dependencyFailed = false;
  const request = async <T,>(path: string, init: RequestInit): Promise<T> => {
    requests.push({ path, init });
    if (!succeeds) throw new Error("offline");
    if (failDependencyOnce && path === "/api/task-dependencies" && !dependencyFailed) { dependencyFailed = true; throw new Error("relation offline"); }
    return { item: { ...mecoSnapshot.manufacturingItems[0], id: "created-manufacturing" } } as T;
  };
  const taskDependencies: import("../../types/domain").TaskDependency[] = [];
  const refresh = jest.fn(async () => undefined);
  return { mutate, ...renderHook(() => useManufacturingEditor({ ...mecoSnapshot,
    manufacturingView, canMentorApprove, signedInMember: mecoSnapshot.members[1], mutate, request, refresh,
    workItems: projectWorkItems(mecoSnapshot.tasks, mecoSnapshot.manufacturingItems), taskDependencies })), requests, request, refresh };
}

test.each([
  ["all", "cnc"], ["cnc", "cnc"], ["prints", "3d-print"], ["fabrication", "fabrication"],
] as const)("create from %s keeps process and requester defaults", async (view, process) => {
  const { result, requests } = setup(view);
  act(() => result.current.open());
  expect(result.current.draft).toMatchObject({ process, requestedById: mecoSnapshot.members[1].id });
  expect(result.current.requesterName).toBe(mecoSnapshot.members[1].name);
  act(() => result.current.updateDraft({ title: " Plate ", material: " Steel " }));
  await act(async () => { await result.current.save(); });
  expect(requests[0].path).toBe("/api/manufacturing");
  expect(requests[0].init.method).toBe("POST");
  expect(JSON.parse(requests[0].init.body as string)).toMatchObject({
    title: "Plate", material: "Steel", process, status: "requested", mentorReviewed: false,
  });
  expect(result.current.visible).toBe(false);
});

test("manufacturing work can depend on tasks and other manufacturing work using canonical owner fields", async () => {
  const { result, requests } = setup();
  act(() => result.current.open());
  const taskTarget = result.current.dependencyOptions.find((item) => item.sourceType === "task")!;
  const manufacturingTarget = result.current.dependencyOptions.find((item) => item.sourceType === "manufacturing")!;
  act(() => result.current.updateDraft({ dependencies: [
    { kind: "work_item", refType: taskTarget.sourceType, refId: taskTarget.sourceId, requiredState: "complete", dependencyType: "hard" },
    { kind: "work_item", refType: manufacturingTarget.sourceType, refId: manufacturingTarget.sourceId, requiredState: "complete", dependencyType: "hard" },
  ] }));
  act(() => result.current.updateDraft({ title: "New part", material: "Steel" }));
  await act(async () => { await result.current.save(); });
  const edges = requests.filter(({ path }) => path === "/api/task-dependencies").map(({ init }) => JSON.parse(init.body as string));
  expect(edges).toHaveLength(2);
  expect(edges).toEqual(expect.arrayContaining([
    expect.objectContaining({ workItemId: "created-manufacturing", sourceType: "manufacturing", kind: "work_item", refType: "task", refId: taskTarget.sourceId }),
    expect.objectContaining({ workItemId: "created-manufacturing", sourceType: "manufacturing", kind: "work_item", refType: "manufacturing", refId: manufacturingTarget.sourceId }),
  ]));
});

test("a partial dependency save retains the created manufacturing ID for retry", async () => {
  const { result, requests } = setup("all", false, true, true);
  const target = result.current.dependencyOptions.find((item) => item.sourceType === "task")!;
  act(() => result.current.open());
  act(() => result.current.updateDraft({ title: "Retry part", material: "Steel", dependencies: [{ kind: "work_item", refType: "task", refId: target.sourceId, requiredState: "complete", dependencyType: "hard" }] }));
  await act(async () => { await result.current.save(); });
  expect(result.current.id).toBe("created-manufacturing");
  expect(result.current.error).toContain("relation offline");
  await act(async () => { await result.current.save(); });
  expect(requests.filter(({ path }) => path === "/api/manufacturing")).toHaveLength(1);
  expect(requests.some(({ path, init }) => path === "/api/manufacturing/created-manufacturing" && init.method === "PATCH")).toBe(true);
});

test.each([false, true])("editing preserves protected status and deletion permissions (mentor=%s)", async (mentor) => {
  const { result, mutate, requests } = setup("prints", mentor);
  const item = mecoSnapshot.manufacturingItems[0];
  act(() => result.current.open(item));
  expect(result.current.draft.process).toBe(item.process);
  await act(async () => { await result.current.save(); });
  expect(requests[0].path).toBe(`/api/manufacturing/${item.id}`);
  expect(requests[0].init.method).toBe("PATCH");
  const payload = JSON.parse(requests[0].init.body as string);
  expect(payload).not.toHaveProperty("status");
  expect(payload).not.toHaveProperty("mentorReviewed");
  act(() => result.current.open(item));
  await act(async () => { await result.current.deleteManufacturing(); });
  expect(mutate).toHaveBeenCalledTimes(mentor ? 1 : 0);
  expect(result.current.visible).toBe(!mentor);
});

test("invalid QA count prevents writes and failed mutations retain the corrected draft", async () => {
  const { result, requests } = setup("all", true, false);
  act(() => result.current.open(mecoSnapshot.manufacturingItems[0]));
  act(() => result.current.updateDraft({ qaReviewCount: "-1" }));
  await act(async () => { await result.current.save(); });
  expect(requests).toHaveLength(0);
  expect(result.current.error).toContain("QA review count");
  act(() => result.current.updateDraft({ qaReviewCount: "2" }));
  expect(result.current.error).toBeNull();
  await act(async () => { await result.current.save(); await result.current.deleteManufacturing(); });
  expect(result.current).toMatchObject({ visible: true, draft: { qaReviewCount: "2" } });
});
