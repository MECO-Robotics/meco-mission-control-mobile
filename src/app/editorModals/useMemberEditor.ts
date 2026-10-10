import { useEditorDraft } from "./useEditorDraft";
import { buildMemberDraft } from "../../ui/helpers";
import type { Member, MemberRole } from "../../types/domain";

type Inputs = {
  members: Member[];
  canMentorApprove: boolean;
  mutate: (path: string, init: RequestInit) => Promise<boolean>;
};

export function useMemberEditor({ members, canMentorApprove, mutate }: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildMemberDraft);
  const open = (role: MemberRole = "student") => openDraft(buildMemberDraft({ role }));
  const edit = (id: string) => {
    const member = members.find((item) => item.id === id);
    if (member) openDraft(buildMemberDraft(member), id);
  };
  const showPhotoNotice = () => setError("Paste a hosted image URL below. Mobile file upload is not available yet.");
  const save = async () => {
    if (!canMentorApprove) {
      setError("Only mentors can invite or edit people.");
      return;
    }

    const name = editor.draft.name.trim();
    const email = editor.draft.email.trim().toLowerCase();
    const duplicateName = members.some(
      (member) =>
        member.id !== editor.id &&
        member.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (!name) {
      setError("Add a name before saving this roster member.");
      return;
    }

    if (duplicateName) {
      setError("A roster member with this name already exists.");
      return;
    }

    const payload = {
      elevated: editor.draft.role === "lead" || editor.draft.role === "admin",
      email,
      name,
      photoUrl: editor.draft.photoUrl.trim(),
      plannedAttendanceDays: editor.draft.plannedAttendanceDays,
      plannedAttendanceNotes: editor.draft.plannedAttendanceNotes.trim(),
      plannedWeeklyAttendanceHours: Math.max(
        0,
        Number(editor.draft.plannedWeeklyAttendanceHours) || 0,
      ),
      role: editor.draft.role,
    };

    const isEdit = editor.id;
    const ok = await mutate(
      isEdit ? `/api/members/${editor.id}` : "/api/members",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    complete(ok, "Could not confirm the member was saved. Your draft is still here.");
  };

  const remove = async () => {
    if (!editor.id) {
      return;
    }

    const ok = await mutate(`/api/members/${editor.id}`, {
      method: "DELETE",
    });

    complete(ok, "Could not confirm the member was deleted.");
  };

  return { ...editor, open, edit, showPhotoNotice, save, remove };
}
