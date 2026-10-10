import { act, renderHook } from "@testing-library/react-native";
import { useMilestoneEditor } from "../editorModals/useMilestoneEditor";
import type { Milestone } from "../../types/domain";
import { buildDateTime } from "../../ui/helpers";

const milestone: Milestone = { id: "review", seasonId: "season", projectIds: ["robot-project"], type: "internal-review", title: "Design review", startAt: "2026-10-03T18:00:00", endAt: null, status: "planned", description: "Review robot work" };
function setup(persist = jest.fn(async () => true), remove = jest.fn(async () => true)) {
  return { persist, remove, ...renderHook(() => useMilestoneEditor({ persist, remove })) };
}

test.each([["", "", null], ["2026-10-04", "", ["2026-10-04", "18:00"]], ["", "20:00", ["2026-10-03", "20:00"]]] as const)("saving preserves partial end values (%s, %s)", async (endDate, endTime, expected) => {
  const { result, persist } = setup();
  act(() => result.current.open());
  act(() => result.current.updateDraft({ title: " Review ", projectIdsText: "robot-project", startDate: "2026-10-03", endDate, endTime, description: " Notes " }));
  await act(async () => { await result.current.save(); });
  expect(persist).toHaveBeenCalledWith(null, expect.objectContaining({
    title: "Review", type: "internal-review", description: "Notes", projectIds: ["robot-project"], startAt: buildDateTime("2026-10-03", "18:00"),
    endAt: expected ? buildDateTime(expected[0], expected[1]) : null,
  }));
  expect(result.current.visible).toBe(false);
});

test("invalid dates block persistence and create resets an edited Schedule record", async () => {
  const { result, persist } = setup();
  act(() => result.current.open(milestone));
  act(() => result.current.updateDraft({ startDate: "invalid" }));
  await act(async () => { await result.current.save(); });
  expect(persist).not.toHaveBeenCalled();
  expect(result.current.error).toContain("start date");
  act(() => result.current.updateDraft({ startDate: "2026-10-03", endDate: "2026-10-02" }));
  await act(async () => { await result.current.save(); });
  expect(result.current.error).toContain("after the start");
  act(() => result.current.close()); act(() => result.current.open());
  expect(result.current).toMatchObject({ id: null, error: null, visible: true, draft: { title: "", projectIdsText: "", startTime: "18:00", endDate: "", endTime: "" } });
});

test("milestone delete stays in Schedule ownership", async () => {
  const { result, remove } = setup(jest.fn(async () => true), jest.fn(async () => false));
  act(() => result.current.open(milestone));
  await act(async () => { await result.current.deleteMilestone(); });
  expect(remove).toHaveBeenCalledWith(milestone.id);
  expect(result.current.visible).toBe(true);
  expect(result.current.error).toContain("milestone was deleted");
});
