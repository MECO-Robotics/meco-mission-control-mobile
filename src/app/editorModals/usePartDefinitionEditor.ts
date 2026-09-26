import { useRef } from "react";
import { useEditorDraft } from "./useEditorDraft";
import { isoToday } from "../../ui/helpers";
import type { Member, Subsystem, Discipline, PartDefinition } from "../../types/domain";
import type { AcquisitionMethod } from "../../ui/types";
import { isValidDateInput } from "../appModel";

function buildDraft(seed?: PartDefinition) {
  return {
    name: seed?.name ?? "",
    partNumber: seed?.partNumber ?? "",
    revision: seed?.revision ?? "A",
    source: seed && ["Onshape", "FRC Supplier", "COTS"].includes(seed.source) ? seed.source : "Onshape",
    acquisitionMethod: "stock" as AcquisitionMethod,
    subsystemId: "",
    disciplineId: "",
    ownerId: "",
    mentorId: "",
    dueDate: isoToday(),
  };
}

type Inputs = {
  members: Member[];
  subsystems: Subsystem[];
  disciplines: Discipline[];
  partDefinitions: PartDefinition[];
  canCreateAcquisition: boolean;
  mutate: (path: string, init: RequestInit) => Promise<boolean>;
};

export function usePartDefinitionEditor({ members, subsystems, disciplines, partDefinitions, canCreateAcquisition, mutate }: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildDraft);
  const creation = useRef({ attempted: false });
  const open = () => {
    creation.current = { attempted: false };
    openDraft(buildDraft());
  };
  const edit = (id: string) => {
    const part = partDefinitions.find((item) => item.id === id);
    if (part) {
      creation.current = { attempted: false };
      openDraft(buildDraft(part), id);
    }
  };
  const owners = members.filter((member) => member.role !== "external");
  const mentors = members.filter((member) => member.role === "mentor" || member.role === "admin");
  const save = async () => {
    const attempt = creation.current;
    if (!editor.id && attempt.attempted) {
      setError("Creation was already submitted. Close this draft and refresh before submitting again.");
      return;
    }
    const { draft } = editor;
    const name = draft.name.trim();
    const partNumber = draft.partNumber.trim();
    const revision = draft.revision.trim();
    const source = draft.source.trim();
    const createsWork = !editor.id && draft.acquisitionMethod !== "stock";
    if (createsWork && !canCreateAcquisition) {
      setError("Only leads, mentors and admins can create acquisition work. Choose Already stocked or ask a team lead.");
      return;
    }
    const missingFields = [
      !name ? "name" : null,
      !partNumber ? "part number" : null,
      !revision ? "revision" : null,
      !source ? "source" : null,
      createsWork && !subsystems.some((item) => item.id === draft.subsystemId) ? "subsystem" : null,
      createsWork && !disciplines.some((item) => item.id === draft.disciplineId) ? "discipline" : null,
      createsWork && !owners.some((item) => item.id === draft.ownerId) ? "task owner" : null,
      createsWork && !mentors.some((item) => item.id === draft.mentorId) ? "QA mentor" : null,
      createsWork && !isValidDateInput(draft.dueDate) ? "valid due date" : null,
    ].filter((field): field is string => Boolean(field));
    if (missingFields.length > 0) {
      setError(`Add ${missingFields.join(", ")} before saving this part definition.`);
      return;
    }
    const payload = {
      name, partNumber, revision, source,
      type: source === "Onshape" ? "custom" : "cots",
      description: "",
      ...(!editor.id ? { acquisition: createsWork ? {
        method: draft.acquisitionMethod,
        subsystemId: draft.subsystemId,
        disciplineId: draft.disciplineId,
        ownerId: draft.ownerId,
        mentorId: draft.mentorId,
        dueDate: draft.dueDate,
      } : { method: "stock" } } : {}),
    };
    if (!editor.id) attempt.attempted = true;
    const ok = await mutate(
      editor.id ? `/api/part-definitions/${editor.id}` : "/api/part-definitions",
      { method: editor.id ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
    complete(ok, "Could not confirm the part definition was saved. Close this draft and refresh before submitting again.");
  };
  const remove = async () => {
    if (!editor.id) return;
    const ok = await mutate(`/api/part-definitions/${editor.id}`, { method: "DELETE" });
    complete(ok, "Could not confirm the part definition was deleted.");
  };
  return {
    ...editor, open, edit, save, remove,
    acquisitionOptions: [
      { id: "stock", name: "Already stocked" },
      ...(canCreateAcquisition ? [{ id: "manufacture", name: "Manufacture" }, { id: "purchase", name: "Purchase" }] : []),
    ],
    subsystems, disciplines, owners, mentors,
  };
}
