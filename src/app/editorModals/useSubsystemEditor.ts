import { useEditorDraft } from "./useEditorDraft";
import { buildSubsystemDraft, splitList } from "../../ui/helpers";
import type { Member, Subsystem } from "../../types/domain";

type Inputs = {
  members: Member[];
  mutate: (path: string, init: RequestInit) => Promise<boolean>;
};

export function useSubsystemEditor({ members, mutate }: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildSubsystemDraft);
  const open = (seed?: Subsystem) => openDraft(
    buildSubsystemDraft(seed ?? { responsibleEngineerId: members[0]?.id ?? "" }), seed?.id,
  );
  const save = async () => {
    const mentors = splitList(editor.draft.mentorIdsText).filter((mentorId) =>
      members.some((member) => member.id === mentorId),
    );
    const risks = splitList(editor.draft.risksText);
    const name = editor.draft.name.trim();
    const description = editor.draft.description.trim();
    const missingFields = [
      !name ? "name" : null,
      !description ? "description" : null,
      !editor.draft.responsibleEngineerId || !members.some((member) => member.id === editor.draft.responsibleEngineerId)
        ? "responsible engineer"
        : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setError(`Add ${missingFields.join(", ")} before saving this subsystem.`);
      return;
    }

    const payload = {
      name,
      description,
      parentSubsystemId: null,
      responsibleEngineerId: editor.draft.responsibleEngineerId,
      mentorIds: mentors,
      risks,
    };

    const isEdit = editor.id;
    const ok = await mutate(
      isEdit ? `/api/subsystems/${editor.id}` : "/api/subsystems",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    complete(ok, "Could not confirm the subsystem was saved. Your draft is still here.");
  };

  const remove = async () => {
    if (!editor.id) {
      return;
    }

    const ok = await mutate(`/api/subsystems/${editor.id}`, {
      method: "DELETE",
    });

    complete(ok, "Could not confirm the subsystem was deleted.");
  };

  return { ...editor, open, save, remove };
}
