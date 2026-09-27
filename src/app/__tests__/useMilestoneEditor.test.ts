import { act, renderHook } from "@testing-library/react-native";
import { useMilestoneEditor } from "../editorModals/useMilestoneEditor";
import { mecoSnapshot } from "../../data/__tests__/fixtures/mockData";
import { buildDateTime } from "../../ui/helpers";

function setup(persist = jest.fn(async () => true), remove = jest.fn(async () => true)) {
  const subsystems = mecoSnapshot.subsystems;
  const subsystemsById = Object.fromEntries(subsystems.map((item) => [item.id, item]));
  return { persist, remove, ...renderHook(() => useMilestoneEditor({ subsystemsById, persist, remove })) };
}

test.each([
  ["", "", null],
  ["2026-10-04", "", ["2026-10-04", "18:00"]],
  ["", "20:00", ["2026-10-03", "20:00"]],
  ["2026-10-04", "20:00", ["2026-10-04", "20:00"]],
] as const)("saving preserves partial end values (%s, %s)", async (endDate, endTime, expected) => {
  const { result, persist } = setup();
  act(() => result.current.open());
  act(() => result.current.updateDraft({ title: " Review ", startDate: "2026-10-03", endDate, endTime,
    relatedSubsystemIdsText: `${mecoSnapshot.subsystems[0].id}, missing`, description: " Notes " }));
  await act(async () => { await result.current.save(); });
  expect(persist).toHaveBeenCalledWith(null, expect.objectContaining({
    title: "Review", description: "Notes", startDateTime: buildDateTime("2026-10-03", "18:00"),
    endDateTime: expected ? buildDateTime(expected[0], expected[1]) : null,
    relatedSubsystemIds: [mecoSnapshot.subsystems[0].id],
  }));
  expect(result.current.visible).toBe(false);
});

test("invalid dates block persistence; field edits clear errors and create resets an edited draft", async () => {
  const { result, persist } = setup();
  act(() => result.current.open(mecoSnapshot.events[0]));
  act(() => result.current.updateDraft({ startDate: "invalid" }));
  await act(async () => { await result.current.save(); });
  expect(persist).not.toHaveBeenCalled();
  expect(result.current.error).toContain("start date");
  act(() => result.current.updateDraft({ startDate: "2026-10-03", endDate: "2026-10-02" }));
  expect(result.current.error).toBeNull();
  await act(async () => { await result.current.save(); });
  expect(result.current.error).toContain("after start");
  act(() => result.current.close());
  act(() => result.current.open());
  expect(result.current).toMatchObject({ id: null, error: null, visible: true,
    draft: { title: "", startTime: "18:00", endDate: "", endTime: "" } });
});

test.each([true, false])("failed save/delete retain the draft; stale completion (%s) cannot change a newer editor", async (succeeds) => {
  let complete!: (ok: boolean) => void;
  const persist = jest.fn(() => new Promise<boolean>((resolve) => { complete = resolve; }));
  const { result, remove } = setup(persist, jest.fn(async () => false));
  const event = mecoSnapshot.events[0];
  act(() => result.current.open(event));
  let pending!: Promise<void>;
  act(() => { pending = result.current.save(); });
  expect(persist).toHaveBeenCalledWith(event.id, expect.objectContaining({ title: event.title }));
  expect(result.current.visible).toBe(true);
  await act(async () => { complete(false); await pending; });
  expect(result.current.visible).toBe(true);
  await act(async () => { await result.current.deleteMilestone(); });
  expect(remove).toHaveBeenCalledWith(event.id);
  expect(result.current.draft.title).toBe(event.title);
  act(() => { pending = result.current.save(); });
  act(() => result.current.open());
  await act(async () => { complete(succeeds); await pending; });
  expect(result.current).toMatchObject({ visible: true, id: null, error: null, draft: { title: "" } });
});
