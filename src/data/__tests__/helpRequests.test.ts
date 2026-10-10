import { helpRequestsFromRisks, buildHelpRequestDisplayRows, getDefaultHelpMentorId, getHelpRequestValidationError } from "../helpRequests";
import type { Risk } from "../../types/domain";
import { makeMember, makeTask } from "./fixtures/factories";

const student = makeMember({ id: "ava", name: "Ava Chen", role: "student" });
const mentor = makeMember({ id: "riley", name: "Riley Kim", role: "mentor" });
const task = makeTask({ id: "task", title: "Validate sensors", mentorId: mentor.id });
const risk: Risk = { id: "persisted-risk", projectId: task.projectId, title: "Help requested: Validate sensors", detail: "Verify the calibration output.", category: "help", severity: "medium", status: "open", blocksWork: false, source: { kind: "task", id: task.id }, relatedTargets: [{ kind: "task", id: task.id }], ownerMemberId: mentor.id, ownerGroupId: null, createdByMemberId: student.id, mitigationTaskId: null, mitigationDueDate: null, createdAt: "2026-10-10T12:00:00Z", updatedAt: "2026-10-10T12:00:00Z", resolvedAt: null };

test("persisted mentor-owned risks drive help rows and preserve requester and resolution", () => {
  const requests = helpRequestsFromRisks([risk, { ...risk, id: "ordinary", category: "other", title: "Help requested: Another task" }]);
  expect(requests).toHaveLength(1);
  expect(helpRequestsFromRisks([{ ...risk, title: "Updated calibration context" }])[0].id).toBe(risk.id);
  expect(helpRequestsFromRisks([{ ...risk, ownerMemberId: null }])[0]).toMatchObject({ id: risk.id, mentorId: "" });
  const rows = buildHelpRequestDisplayRows({ helpRequests: requests, membersById: { ava: student, riley: mentor }, taskById: { task }, workLogsById: {} });
  expect(rows[0]).toMatchObject({ id: risk.id, requesterName: student.name, mentorName: mentor.name, taskTitle: task.title, status: "open", reason: risk.detail });
  expect(helpRequestsFromRisks([{ ...risk, status: "resolved" }])[0].status).toBe("resolved");
  expect(task.status).toBe("not-started");
});

test("missing mentor and empty reason fail before requesting persistence", () => {
  expect(getHelpRequestValidationError({ reason: " ", mentorId: mentor.id, requestedById: null })).toMatch(/reason/);
  expect(getHelpRequestValidationError({ reason: "Help", mentorId: "", requestedById: null })).toMatch(/mentor/);
  expect(getDefaultHelpMentorId({ mentorId: "former" }, [mentor])).toBe(mentor.id);
});
