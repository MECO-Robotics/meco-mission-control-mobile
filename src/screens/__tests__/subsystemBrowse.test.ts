import { act, renderHook } from "@testing-library/react-native";
import type { Risk, Subsystem } from "../../types/domain";
import { useSubsystemBrowse } from "../robot/useSubsystemBrowse";

const subsystem = (id: string): Subsystem => ({
  id, projectId: "robot", name: id, description: "", isCore: false, parentSubsystemId: null,
  responsibleEngineerId: null, mentorIds: [],
});
const risk: Risk = {
  id: "risk-drive", projectId: "robot", title: "Drive chain slip", detail: "", category: "design", severity: "high",
  status: "open", blocksWork: true, source: { kind: "manual" }, relatedTargets: [{ kind: "subsystem", id: "drive" }],
  mitigationTaskId: null, ownerGroupId: null, createdAt: "2026-09-01", updatedAt: "2026-09-01", resolvedAt: null,
};

test("canonical risks drive subsystem health and search without a free-text subsystem risk store", () => {
  const { result } = renderHook(() => useSubsystemBrowse({
    subsystems: [subsystem("drive"), subsystem("arm")], mechanisms: [], tasks: [], purchaseItems: [], qaFindings: [], risks: [risk], membersById: {}, taskById: {},
  }));
  expect(result.current.rows.map(({ subsystem: row, counts }) => [row.id, counts.health, counts.risks])).toEqual([
    ["drive", "watch", 1], ["arm", "good", 0],
  ]);
  act(() => result.current.updateFilters({ search: "drive" }));
  expect(result.current.rows.map(({ subsystem: row }) => row.id)).toEqual(["drive"]);
});

test("schedule or refresh expansion follows the visible subsystem set", () => {
  const rows = [subsystem("drive"), subsystem("arm")];
  const { result, rerender } = renderHook(({ subsystems }: { subsystems: Subsystem[] }) => useSubsystemBrowse({
    subsystems, mechanisms: [], tasks: [], purchaseItems: [], qaFindings: [], risks: [], membersById: {}, taskById: {},
  }), { initialProps: { subsystems: rows } });
  expect(result.current.rows[0].isExpanded).toBe(true);
  act(() => result.current.updateFilters({ search: "arm" }));
  expect(result.current.rows[0].subsystem.id).toBe("arm");
  act(() => result.current.updateFilters({ search: "" }));
  act(() => result.current.toggleExpanded("drive"));
  rerender({ subsystems: [...rows] });
  expect(result.current.rows[0].isExpanded).toBe(false);
});
