import { act, renderHook } from "@testing-library/react-native";
import { mecoSnapshot } from "../../data/mockData";
import { useMemberEditor } from "../editorModals/useMemberEditor";
import { useSubsystemEditor } from "../editorModals/useSubsystemEditor";
import { usePartDefinitionEditor } from "../editorModals/usePartDefinitionEditor";
import type { AcquisitionMethod } from "../../ui/types";

const mutation = () => jest.fn(async (_path: string, _init: RequestInit) => true);
const body = (mutate: ReturnType<typeof mutation>, index = 0) => JSON.parse(mutate.mock.calls[index][1].body as string);

test("member edits enforce permission, unique names and normalized attendance/profile fields", async () => {
  const mutate = mutation();
  const { result, rerender } = renderHook<ReturnType<typeof useMemberEditor>, { allowed: boolean }>(({ allowed }) => useMemberEditor({ members: mecoSnapshot.members, canMentorApprove: allowed, mutate }), { initialProps: { allowed: false } });
  act(() => result.current.open("lead"));
  act(() => result.current.updateDraft({ name: " New Person ", email: " PERSON@EXAMPLE.COM ", plannedWeeklyAttendanceHours: "-2", photoUrl: " https://example.com/p.jpg " }));
  await act(async () => { await result.current.save(); });
  expect(mutate).not.toHaveBeenCalled();
  expect(result.current.error).toContain("Only mentors");
  rerender({ allowed: true });
  act(() => result.current.updateDraft({ name: mecoSnapshot.members[0].name.toUpperCase() }));
  await act(async () => { await result.current.save(); });
  expect(result.current.error).toContain("already exists");
  act(() => result.current.edit(mecoSnapshot.members[0].id));
  act(() => result.current.updateDraft({ email: " PERSON@EXAMPLE.COM ", plannedWeeklyAttendanceHours: "-2", photoUrl: " https://example.com/p.jpg " }));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][0]).toBe(`/api/members/${mecoSnapshot.members[0].id}`);
  expect(body(mutate)).toMatchObject({ email: "person@example.com", plannedWeeklyAttendanceHours: 0, photoUrl: "https://example.com/p.jpg" });
  expect(result.current.visible).toBe(false);
});

test("subsystem defaults and validation use current roster; failures retain draft and edit/remove use the selected ID", async () => {
  const mutate = mutation();
  const { result } = renderHook(() => useSubsystemEditor({ members: mecoSnapshot.members, mutate }));
  act(() => result.current.open());
  expect(result.current.draft.responsibleEngineerId).toBe(mecoSnapshot.members[0].id);
  act(() => result.current.updateDraft({ name: " Frame ", description: " Frame build ", responsibleEngineerId: "missing" }));
  await act(async () => { await result.current.save(); });
  expect(mutate).not.toHaveBeenCalled();
  expect(result.current.error).toContain("responsible engineer");
  act(() => result.current.updateDraft({ responsibleEngineerId: mecoSnapshot.members[0].id, mentorIdsText: `${mecoSnapshot.members[1].id},missing`, risksText: " Steel, Budget " }));
  mutate.mockResolvedValueOnce(false);
  await act(async () => { await result.current.save(); });
  expect(body(mutate)).toMatchObject({ name: "Frame", mentorIds: [mecoSnapshot.members[1].id], risks: ["Steel", "Budget"], parentSubsystemId: null });
  expect(result.current).toMatchObject({ visible: true, error: expect.stringContaining("Could not confirm") });
  act(() => result.current.open(mecoSnapshot.subsystems[0]));
  await act(async () => { await result.current.remove(); });
  expect(mutate.mock.calls[1]).toEqual([`/api/subsystems/${mecoSnapshot.subsystems[0].id}`, { method: "DELETE" }]);
});

function partSetup(mutate = mutation(), canCreateParts = true) {
  return { mutate, ...renderHook(() => usePartDefinitionEditor({ ...mecoSnapshot, canCreateParts, mutate })) };
}
const partDraft = { name: " Plate ", partNumber: " PL-1 ", source: "Onshape", revision: " B " };

const acquisitionContext = {
  subsystemId: mecoSnapshot.subsystems[1].id,
  disciplineId: mecoSnapshot.disciplines[1].id,
  ownerId: mecoSnapshot.members.find((member) => member.role === "student")!.id,
  mentorId: mecoSnapshot.members.find((member) => member.role === "mentor")!.id,
  dueDate: "2026-12-10",
};

test.each<AcquisitionMethod>(["stock", "manufacture", "purchase"])("part %s acquisition uses one atomic command with explicit context", async (acquisitionMethod) => {
  const { result, mutate } = partSetup();
  act(() => result.current.open());
  expect(result.current.draft).toMatchObject({ acquisitionMethod: "stock", subsystemId: "", disciplineId: "", ownerId: "", mentorId: "" });
  act(() => result.current.updateDraft({ ...partDraft, ...acquisitionContext, acquisitionMethod }));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls.map(([path]) => path)).toEqual(["/api/part-definitions"]);
  expect(body(mutate)).toEqual({ name: "Plate", partNumber: "PL-1", revision: "B", source: "Onshape", type: "custom", description: "",
    acquisition: acquisitionMethod === "stock" ? { method: "stock" } : { method: acquisitionMethod, ...acquisitionContext } });
  expect(result.current.visible).toBe(false);
});

test("nonstock creation requires permission and current explicit task context", async () => {
  const forbidden = partSetup(mutation(), false);
  act(() => forbidden.result.current.open());
  expect(forbidden.result.current.acquisitionOptions.map(({ id }) => id)).toEqual(["stock"]);
  act(() => forbidden.result.current.updateDraft({ ...partDraft, ...acquisitionContext, acquisitionMethod: "purchase" }));
  await act(async () => { await forbidden.result.current.save(); });
  expect(forbidden.mutate).not.toHaveBeenCalled();
  expect(forbidden.result.current.error).toContain("Only leads");
  const { result, mutate } = partSetup();
  act(() => result.current.open());
  act(() => result.current.updateDraft({ ...partDraft, acquisitionMethod: "manufacture" }));
  await act(async () => { await result.current.save(); });
  expect(mutate).not.toHaveBeenCalled();
  expect(result.current.error).toContain("subsystem, discipline, task owner, QA mentor");
  act(() => result.current.updateDraft({ ...acquisitionContext, mentorId: acquisitionContext.ownerId, dueDate: "2026-02-30" }));
  await act(async () => { await result.current.save(); });
  expect(result.current.error).toContain("QA mentor, valid due date");
  expect(mutate).not.toHaveBeenCalled();
  act(() => result.current.updateDraft(acquisitionContext));
  await act(async () => { await result.current.save(); });
  expect(mutate).toHaveBeenCalledTimes(1);
});

test.each<AcquisitionMethod>(["stock", "manufacture", "purchase"])("unconfirmed %s creation prevents duplicate submission until reopened", async (acquisitionMethod) => {
  const mutate = mutation().mockResolvedValueOnce(false);
  const { result } = partSetup(mutate);
  act(() => result.current.open());
  act(() => result.current.updateDraft({ ...partDraft, ...acquisitionContext, acquisitionMethod }));
  await act(async () => { await result.current.save(); });
  expect(result.current.visible).toBe(true);
  expect(result.current.error).toContain("Could not confirm");
  act(() => result.current.updateDraft({ name: "Changed" }));
  await act(async () => { await result.current.save(); });
  expect(mutate).toHaveBeenCalledTimes(1);
  act(() => { result.current.close(); result.current.open(); });
  act(() => result.current.updateDraft(partDraft));
  await act(async () => { await result.current.save(); });
  expect(mutate).toHaveBeenCalledTimes(2);
  expect(result.current.visible).toBe(false);
});

test("part edit does not recreate acquisition and deletion reports its outcome", async () => {
  const { result, mutate } = partSetup();
  act(() => result.current.edit(mecoSnapshot.partDefinitions[0].id));
  await act(async () => { await result.current.save(); });
  expect(mutate.mock.calls[0][1].method).toBe("PATCH");
  expect(body(mutate)).not.toHaveProperty("acquisition");
  expect(mutate).toHaveBeenCalledTimes(1);
  act(() => result.current.edit(mecoSnapshot.partDefinitions[0].id));
  mutate.mockResolvedValueOnce(false);
  await act(async () => { await result.current.remove(); });
  expect(result.current.error).toContain("deleted");
  expect(result.current.visible).toBe(true);
});

test("editing a web-authored definition preserves its custom source and omits unedited fields", async () => {
  const part = { ...mecoSnapshot.partDefinitions[0], source: "Local machine shop", description: "Keep web-authored notes", type: "custom" as const };
  const mutate = mutation();
  const { result } = renderHook(() => usePartDefinitionEditor({ ...mecoSnapshot, partDefinitions: [part], canCreateParts: true, mutate }));
  act(() => result.current.edit(part.id));
  expect(result.current.draft.source).toBe(part.source);
  expect(result.current.sourceOptions).toContainEqual({ id: part.source, name: part.source });
  act(() => result.current.updateDraft({ name: "Renamed bracket", revision: "C" }));
  await act(async () => { await result.current.save(); });
  expect(body(mutate)).toEqual({ name: "Renamed bracket", revision: "C", source: part.source, partNumber: part.partNumber });
  expect(body(mutate)).not.toHaveProperty("description");
  expect(body(mutate)).not.toHaveProperty("type");
});

test("late part completion leaves a newly opened draft unchanged and unlocked", async () => {
  let resolve!: (ok: boolean) => void;
  const mutate = mutation().mockImplementationOnce(() => new Promise<boolean>((done) => { resolve = done; }));
  const { result } = partSetup(mutate);
  act(() => result.current.open());
  act(() => result.current.updateDraft({ ...partDraft, acquisitionMethod: "stock" }));
  let saving!: Promise<void>;
  act(() => { saving = result.current.save(); });
  act(() => { result.current.close(); result.current.open(); });
  act(() => result.current.updateDraft({ ...partDraft, name: "New draft", acquisitionMethod: "stock" }));
  await act(async () => { resolve(true); await saving; });
  expect(result.current).toMatchObject({ visible: true, error: null, draft: { name: "New draft" } });
  await act(async () => { await result.current.save(); });
  expect(mutate).toHaveBeenCalledTimes(2);
});
