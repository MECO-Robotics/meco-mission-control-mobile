import { act, renderHook } from "@testing-library/react-native";
import { useManufacturingEditor } from "../editorModals/useManufacturingEditor";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import type { ManufacturingViewTab } from "../../ui/types";

function setup(manufacturingView: ManufacturingViewTab = "all", canMentorApprove = false, succeeds = true) {
  const mutate = jest.fn(async (_path: string, _init: RequestInit) => succeeds);
  return { mutate, ...renderHook(() => useManufacturingEditor({ ...mecoSnapshot,
    manufacturingView, canMentorApprove, signedInMember: mecoSnapshot.members[1], mutate })) };
}

test.each([
  ["all", "cnc"], ["cnc", "cnc"], ["prints", "3d-print"], ["fabrication", "fabrication"],
] as const)("create from %s keeps process and requester defaults", async (view, process) => {
  const { result, mutate } = setup(view);
  act(() => result.current.open());
  expect(result.current.draft).toMatchObject({ process, requestedById: mecoSnapshot.members[1].id });
  expect(result.current.requesterName).toBe(mecoSnapshot.members[1].name);
  act(() => result.current.updateDraft({ title: " Plate ", material: " Steel " }));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][0]).toBe("/api/manufacturing");
  expect(mutate.mock.calls[0][1].method).toBe("POST");
  expect(JSON.parse(mutate.mock.calls[0][1].body as string)).toMatchObject({
    title: "Plate", material: "Steel", process, status: "requested", mentorReviewed: false,
  });
  expect(result.current.visible).toBe(false);
});

test.each([false, true])("editing preserves protected status and deletion permissions (mentor=%s)", async (mentor) => {
  const { result, mutate } = setup("prints", mentor);
  const item = mecoSnapshot.manufacturingItems[0];
  act(() => result.current.open(item));
  expect(result.current.draft.process).toBe(item.process);
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][0]).toBe(`/api/manufacturing/${item.id}`);
  expect(mutate.mock.calls[0][1].method).toBe("PATCH");
  const payload = JSON.parse(mutate.mock.calls[0][1].body as string);
  expect(payload).not.toHaveProperty("status");
  expect(payload).not.toHaveProperty("mentorReviewed");
  act(() => result.current.open(item));
  await act(async () => { await result.current.deleteManufacturing(); });
  expect(mutate).toHaveBeenCalledTimes(mentor ? 2 : 1);
  expect(result.current.visible).toBe(!mentor);
});

test("invalid QA count prevents writes and failed mutations retain the corrected draft", async () => {
  const { result, mutate } = setup("all", true, false);
  act(() => result.current.open(mecoSnapshot.manufacturingItems[0]));
  act(() => result.current.updateDraft({ qaReviewCount: "-1" }));
  await act(async () => { await result.current.save(); });
  expect(mutate).not.toHaveBeenCalled();
  expect(result.current.error).toContain("QA review count");
  act(() => result.current.updateDraft({ qaReviewCount: "2" }));
  expect(result.current.error).toBeNull();
  await act(async () => { await result.current.save(); await result.current.deleteManufacturing(); });
  expect(result.current).toMatchObject({ visible: true, draft: { qaReviewCount: "2" } });
});
