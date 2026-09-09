import type { Member, SessionUser } from "../types/domain";

/** UI permissions use the authenticated identity, never the selected roster filter. */
export function getSessionPermissions(user: SessionUser | null, members: Member[]) {
  const signedInMember = user
    ? members.find((member) =>
        member.id.toLowerCase() === user.accountId.trim().toLowerCase() ||
        member.name.trim().toLowerCase() === user.name.trim().toLowerCase() ||
        member.email?.trim().toLowerCase() === user.email.trim().toLowerCase(),
      ) ?? null
    : null;
  // Preserve the matched session member fallback used by development sessions.
  const roles = user ? [user.role, signedInMember?.role] : [];
  const canMentorApprove = roles.some((role) => role === "mentor" || role === "admin");
  return {
    signedInMember,
    canMentorApprove,
    canSubmitQa: ["lead", "mentor", "admin"].includes(user?.role ?? signedInMember?.role ?? ""),
    canReassignTasks: canMentorApprove || roles.includes("lead"),
  };
}
