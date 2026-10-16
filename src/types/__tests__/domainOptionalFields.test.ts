import type { QaFinding, QaReport, PurchaseReceipt, TestResult } from "../domain";

test("legacy receipts remain valid and receipt operation IDs survive transport round trips", () => {
  const legacy: PurchaseReceipt = { id: "legacy", quantity: 1, location: "Shelf", receivedAt: "2026-10-01", partInstanceIds: [] };
  const current: PurchaseReceipt = { ...legacy, id: "current", operationId: "receipt-operation-1", quantity: 0.5 };
  expect(legacy.operationId).toBeUndefined();
  expect(JSON.parse(JSON.stringify(current))).toMatchObject({ operationId: "receipt-operation-1", quantity: 0.5 });
});

test("optional QA and test evidence metadata survives transport round trips", () => {
  const report: QaReport = {
    id: "qa-1", projectId: "robot", targetRefs: [{ kind: "task", id: "task-1" }], createdByMemberId: null,
    participantIds: [], mentorId: null, requestedById: null, summary: "Inspection", notes: "", createdAt: "2026-10-01",
    status: "reviewed", reportType: "qa", result: "pass", reviewedById: "mentor-1", reviewedAt: "2026-10-02",
    targetRevisions: { "part-1": "revision-4" }, inspectedPartInstanceIds: ["instance-1"], reviewOrder: 3,
    needsReverification: false, followUpTaskId: null, followUpRiskId: "risk-1",
  };
  const testResult: TestResult = {
    id: "test-1", projectId: "robot", targetRefs: [{ kind: "part-instance", id: "instance-1" }],
    title: "Drive test", status: "pass", createdAt: "2026-10-02", observedAt: "2026-10-01", verificationOrder: 4,
    targetRevisions: { "part-1": "revision-4" }, inspectedPartInstanceIds: ["instance-1"], needsReverification: false,
  };
  const finding: QaFinding = {
    id: "finding-1", reportId: "qa-1", projectId: "robot", targetRefs: [{ kind: "part-instance", id: "instance-1" }],
    title: "Loose mount", detail: "Retest after correction", severity: "medium", status: "resolved", createdAt: "2026-10-01", updatedAt: "2026-10-03",
    retests: [{ operationId: "op-1", sourceType: "qa", result: "pass", notes: "Secure", reviewedAt: "2026-10-03", reviewedById: "mentor-1", order: 1, verificationOrder: 5, targetRevisions: { "part-1": "revision-4" }, inspectedPartInstanceIds: ["instance-1"], supersedesId: "retest-old" }],
  };
  expect(JSON.parse(JSON.stringify(report))).toMatchObject({ targetRevisions: { "part-1": "revision-4" }, followUpRiskId: "risk-1" });
  expect(JSON.parse(JSON.stringify(report))).toMatchObject({ inspectedPartInstanceIds: ["instance-1"], reviewOrder: 3, needsReverification: false });
  expect(JSON.parse(JSON.stringify(testResult))).toMatchObject({ createdAt: "2026-10-02", observedAt: "2026-10-01", verificationOrder: 4, targetRevisions: { "part-1": "revision-4" }, inspectedPartInstanceIds: ["instance-1"], needsReverification: false });
  expect(JSON.parse(JSON.stringify(finding))).toMatchObject({ retests: [{ operationId: "op-1", sourceType: "qa", result: "pass", reviewedById: "mentor-1", order: 1, verificationOrder: 5, supersedesId: "retest-old" }] });
});
