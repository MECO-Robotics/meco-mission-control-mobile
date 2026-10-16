import { getDefaultTaskPeople, eligibleTaskMentors, eligibleTaskOwners } from "../taskPeople";
import { mecoSnapshot } from "./fixtures/mockData";

test("task selectors match API eligibility, even when admin and external members come first", () => {
  const roster = ["maya", "outside", "jordan", "ava", "captain"].map((id, index) => {
    const source = mecoSnapshot.members.find((member) => member.id === id);
    return source ?? { ...mecoSnapshot.members[0], id, role: index === 1 ? "external" as const : "lead" as const };
  });
  expect(eligibleTaskOwners(roster, "season-2026").map((member) => member.id)).toEqual(["ava", "captain"]);
  expect(eligibleTaskMentors(roster, "season-2026").map((member) => member.id)).toEqual(["jordan"]);
  expect(getDefaultTaskPeople(roster, "season-2026")).toEqual({ ownerId: "ava", mentorId: "jordan" });
});

test("mentor-only, empty, and all-ineligible rosters leave owner unassigned", () => {
  const mentor = mecoSnapshot.members.find((member) => member.role === "mentor")!;
  const admin = mecoSnapshot.members.find((member) => member.role === "admin")!;
  expect(getDefaultTaskPeople([mentor], "season-2026")).toEqual({ ownerId: "", mentorId: mentor.id });
  expect(getDefaultTaskPeople([admin], "season-2026")).toEqual({ ownerId: "", mentorId: "" });
  expect(getDefaultTaskPeople([], "season-2026")).toEqual({ ownerId: "", mentorId: "" });
});

test("task people require project-season membership and include active cross-season members", () => {
  const student = mecoSnapshot.members.find((member) => member.role === "student")!;
  const lead = mecoSnapshot.members.find((member) => member.role === "lead") ?? { ...student, role: "lead" as const };
  const mentor = mecoSnapshot.members.find((member) => member.role === "mentor")!;
  const roster = [
    { ...student, id: "past-student", seasonId: "past-season", activeSeasonIds: ["past-season"] },
    { ...student, id: "current-student", seasonId: "current-season", activeSeasonIds: ["current-season"] },
    { ...lead, id: "active-cross-season-lead", seasonId: "past-season", activeSeasonIds: ["current-season"] },
    { ...mentor, id: "past-mentor", seasonId: "past-season", activeSeasonIds: ["past-season"] },
    { ...mentor, id: "current-mentor", seasonId: "current-season", activeSeasonIds: ["current-season"] },
    { ...mentor, id: "active-cross-season-mentor", seasonId: "past-season", activeSeasonIds: ["current-season"] },
  ];

  expect(eligibleTaskOwners(roster, "current-season").map((member) => member.id)).toEqual(["current-student", "active-cross-season-lead"]);
  expect(eligibleTaskMentors(roster, "current-season").map((member) => member.id)).toEqual(["current-mentor", "active-cross-season-mentor"]);
  expect(getDefaultTaskPeople(roster, "current-season")).toEqual({ ownerId: "current-student", mentorId: "current-mentor" });
  expect(getDefaultTaskPeople(roster, undefined)).toEqual({ ownerId: "", mentorId: "" });
});
