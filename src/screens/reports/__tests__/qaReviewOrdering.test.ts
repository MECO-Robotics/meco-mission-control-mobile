import type { QaReport } from "../../../types/domain";
import { isUnverifiedLegacyQaReview, sortQaReviews } from "../qaReviewOrdering";

function report(overrides: Partial<QaReport> & Pick<QaReport, "id" | "result">): QaReport {
  return {
    projectId: "robot",
    targetRefs: [],
    createdByMemberId: null,
    participantIds: [],
    mentorId: null,
    requestedById: null,
    summary: overrides.id,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "reviewed",
    reportType: "qa",
    reviewedById: "mentor-1",
    reviewedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("server review order wins over authored date and preserves the observed date", () => {
  const futureOldPass = report({ id: "future-old-pass", result: "pass", createdAt: "2099-01-01T00:00:00.000Z", reviewedAt: "2099-01-01T00:00:00.000Z", reviewOrder: 1 });
  const newerFailure = report({ id: "newer-failure", result: "iteration-worthy", createdAt: "2026-10-15T00:00:00.000Z", reviewedAt: "2026-10-15T00:00:00.000Z", reviewOrder: 2 });
  const sorted = sortQaReviews([futureOldPass, newerFailure], {}, []);

  expect(sorted.map((review) => review.id)).toEqual(["newer-failure", "future-old-pass"]);
  expect(sorted[1].createdAt).toBe("2099-01-01T00:00:00.000Z");
});

test("unknown-order legacy review falls behind stamped reviews and remains marked unverified", () => {
  const legacy = report({ id: "legacy-pass", result: "pass", createdAt: "2099-01-01T00:00:00.000Z", reviewedAt: "2099-01-01T00:00:00.000Z" });
  const stamped = report({ id: "stamped-failure", result: "iteration-worthy", reviewOrder: 2 });
  const sorted = sortQaReviews([legacy, stamped], {}, []);

  expect(sorted.map((review) => review.id)).toEqual(["stamped-failure", "legacy-pass"]);
  expect(isUnverifiedLegacyQaReview(sorted[1])).toBe(true);
});

test("draft and submitted passes sort after reviewed outcomes", () => {
  const reviewedFailure = report({ id: "reviewed-failure", result: "iteration-worthy", reviewOrder: 1 });
  const submittedPass = report({ id: "submitted-pass", result: "pass", status: "submitted", createdAt: "2099-01-01T00:00:00.000Z" });
  const draftPass = report({ id: "draft-pass", result: "pass", status: "draft", createdAt: "2098-01-01T00:00:00.000Z" });
  expect(sortQaReviews([submittedPass, draftPass, reviewedFailure], {}, []).map((review) => review.id))
    .toEqual(["reviewed-failure", "submitted-pass", "draft-pass"]);
});
