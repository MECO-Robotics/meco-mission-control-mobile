import type { Member } from "../types/domain";

function isMemberInProjectSeason(member: Member, projectSeasonId: string | undefined) {
  return projectSeasonId !== undefined &&
    (member.seasonId === projectSeasonId || member.activeSeasonIds?.includes(projectSeasonId) === true);
}

export function eligibleTaskOwners(members: readonly Member[], projectSeasonId: string | undefined) {
  return members.filter((member) => (member.role === "student" || member.role === "lead") && isMemberInProjectSeason(member, projectSeasonId));
}

export function eligibleTaskMentors(members: readonly Member[], projectSeasonId: string | undefined) {
  return members.filter((member) => member.role === "mentor" && isMemberInProjectSeason(member, projectSeasonId));
}

export function getDefaultTaskPeople(members: readonly Member[], projectSeasonId: string | undefined) {
  return {
    ownerId: eligibleTaskOwners(members, projectSeasonId)[0]?.id ?? "",
    mentorId: eligibleTaskMentors(members, projectSeasonId)[0]?.id ?? "",
  };
}
