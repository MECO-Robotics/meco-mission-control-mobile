import { TASK_STATUS_FILTER_OPTIONS, TASK_STATUS_OPTIONS, STATUS_LABELS } from "../constants";
import { timelineProgress } from "../helpers";

test("unrecorded remains filterable without becoming a workflow status choice", () => {
  expect(TASK_STATUS_FILTER_OPTIONS.map(({ id }) => id)).toContain("unrecorded");
  expect(TASK_STATUS_OPTIONS.map(({ id }) => id)).not.toContain("unrecorded");
  expect(STATUS_LABELS.unrecorded).toBe("Unrecorded");
});

test("unrecorded task has no inferred timeline progress", () => {
  expect(timelineProgress("unrecorded")).toBeNull();
});
