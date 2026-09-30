import { act, renderHook } from "@testing-library/react-native";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import { useMemberEditor } from "../editorModals/useMemberEditor";
import { useSubsystemEditor } from "../editorModals/useSubsystemEditor";
import { usePartDefinitionEditor } from "../editorModals/usePartDefinitionEditor";

const mutation = () => jest.fn(async (_path: string, _init: RequestInit) => true);
const body = (mutate: ReturnType<typeof mutation>, index = 0) => JSON.parse(mutate.mock.calls[index][1].body as string);

test("member edits retain normalized profile and attendance fields", async () => {
  const mutate = mutation();
  const { result } = renderHook(() => useMemberEditor({ members: mecoSnapshot.members, canMentorApprove: true, mutate }));
  act(() => result.current.edit("ava"));
  act(() => result.current.updateDraft({ email: " PERSON@EXAMPLE.COM ", plannedWeeklyAttendanceHours: "-2", photoUrl: " https://example.com/p.jpg " }));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][0]).toBe("/api/members/ava");
  expect(body(mutate)).toMatchObject({ email: "person@example.com", plannedWeeklyAttendanceHours: 0, photoUrl: "https://example.com/p.jpg" });
});

test("subsystem editing has no duplicate free-text risk field", async () => {
  const mutate = mutation();
  const { result } = renderHook(() => useSubsystemEditor({ members: mecoSnapshot.members, mutate }));
  act(() => result.current.open());
  act(() => result.current.updateDraft({ name: "Frame", description: "Frame build", responsibleEngineerId: "ava", mentorIdsText: "lucas,missing" }));
  await act(async () => { await result.current.save(); });
  expect(body(mutate)).toEqual({ name: "Frame", description: "Frame build", parentSubsystemId: null, responsibleEngineerId: "ava", mentorIds: ["lucas"] });
  expect(body(mutate)).not.toHaveProperty("risks");
});

function partSetup(canCreateParts = true) {
  const mutate = mutation();
  return { mutate, ...renderHook(() => usePartDefinitionEditor({ partDefinitions: mecoSnapshot.partDefinitions, canCreateParts, mutate })) };
}

test("part definition acquisition preference is catalog metadata, not a second Task", async () => {
  const { result, mutate } = partSetup();
  act(() => result.current.open());
  act(() => result.current.updateDraft({ name: "Plate", partNumber: "PL-1", defaultAcquisitionMethod: "manufacture", cadSource: "onshape" }));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls.map(([path]) => path)).toEqual(["/api/part-definitions"]);
  expect(body(mutate)).toMatchObject({ defaultAcquisitionMethod: "manufacture", cadSource: "onshape", partNumber: "PL-1" });
  expect(body(mutate)).not.toHaveProperty("acquisition");
  expect(body(mutate)).not.toHaveProperty("taskId");
});

test("part definition edits do not recreate acquisition work", async () => {
  const { result, mutate } = partSetup();
  act(() => result.current.edit(mecoSnapshot.partDefinitions[0].id));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][0]).toBe(`/api/part-definitions/${mecoSnapshot.partDefinitions[0].id}`);
  expect(mutate.mock.calls[0][1].method).toBe("PATCH");
  expect(body(mutate)).not.toHaveProperty("taskId");
});
