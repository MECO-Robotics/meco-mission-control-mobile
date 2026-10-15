import type { Member } from "../types/domain";

export function eligibleTaskOwners(members: readonly Member[]) {
  return members.filter((member) => member.role === "student" || member.role === "lead");
}

export function eligibleTaskMentors(members: readonly Member[]) {
  return members.filter((member) => member.role === "mentor");
}

export function getDefaultTaskPeople(members: readonly Member[]) {
  return {
    ownerId: eligibleTaskOwners(members)[0]?.id ?? "",
    mentorId: eligibleTaskMentors(members)[0]?.id ?? "",
  };
}
