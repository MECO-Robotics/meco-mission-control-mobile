import { getSessionPermissions } from "../sessionPermissions";
import type { Member, SessionUser } from "../../types/domain";

const user: SessionUser = {
  accountId: "student", name: "Student", email: "student@example.com",
  authProvider: "email", picture: null, hostedDomain: "example.com",
};
const mentor: Member = { id: "mentor", name: "Mentor", role: "mentor" };

test.each([
  ["student", false, false], ["external", false, false], ["lead", false, true],
  ["mentor", true, true], ["admin", true, true], [undefined, false, false],
] as const)("authenticated %s role grants the intended actions", (role, approve, reassign) => {
  expect(getSessionPermissions({ ...user, role }, [mentor])).toMatchObject({
    signedInMember: null, canMentorApprove: approve, canReassignTasks: reassign,
  });
});

test("absent session cannot inherit a roster member's missing email", () => {
  expect(getSessionPermissions(null, [mentor])).toEqual({
    signedInMember: null, canMentorApprove: false, canReassignTasks: false,
  });
});

test.each(["lead", "mentor", "admin"] as const)("matched %s member remains a session fallback", (role) => {
  const member: Member = { id: user.accountId, name: user.name, role };
  expect(getSessionPermissions({ ...user, role: "student" }, [member])).toEqual({
    signedInMember: member, canMentorApprove: role !== "lead", canReassignTasks: true,
  });
});

test.each([
  { accountId: " MENTOR " }, { name: " mEnToR " }, { email: " MENTOR@EXAMPLE.COM " },
])("matches existing session identity rules: %j", (identity) => {
  const member = { ...mentor, email: "mentor@example.com" };
  expect(getSessionPermissions({ ...user, ...identity }, [member]).signedInMember).toBe(member);
});

test("selected person and roster filter do not grant privileges", () => {
  const student: Member = { id: user.accountId, name: user.name, role: "student" };
  for (const selectedMemberId of [student.id, mentor.id]) {
    const session = { ...user, selectedMemberId, activePersonFilter: selectedMemberId };
    expect(getSessionPermissions(session, [mentor, student])).toMatchObject({
      signedInMember: student, canMentorApprove: false, canReassignTasks: false,
    });
  }
});
