import { getDefaultTaskPeople, eligibleTaskMentors, eligibleTaskOwners } from "../taskPeople";
import { mecoSnapshot } from "./fixtures/mockData";

test("task selectors match API eligibility, even when admin and external members come first", () => {
  const roster = ["maya", "outside", "jordan", "ava", "captain"].map((id, index) => {
    const source = mecoSnapshot.members.find((member) => member.id === id);
    return source ?? { ...mecoSnapshot.members[0], id, role: index === 1 ? "external" as const : "lead" as const };
  });
  expect(eligibleTaskOwners(roster).map((member) => member.id)).toEqual(["ava", "captain"]);
  expect(eligibleTaskMentors(roster).map((member) => member.id)).toEqual(["jordan"]);
  expect(getDefaultTaskPeople(roster)).toEqual({ ownerId: "ava", mentorId: "jordan" });
});

test("mentor-only, empty, and all-ineligible rosters leave owner unassigned", () => {
  const mentor = mecoSnapshot.members.find((member) => member.role === "mentor")!;
  const admin = mecoSnapshot.members.find((member) => member.role === "admin")!;
  expect(getDefaultTaskPeople([mentor])).toEqual({ ownerId: "", mentorId: mentor.id });
  expect(getDefaultTaskPeople([admin])).toEqual({ ownerId: "", mentorId: "" });
  expect(getDefaultTaskPeople([])).toEqual({ ownerId: "", mentorId: "" });
});
