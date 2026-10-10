import { useRef } from "react";
import { useEditorDraft } from "./useEditorDraft";
import type { AcquisitionMethod, PartDefinition } from "../../types/domain";
import { PART_SOURCE_OPTIONS } from "../../ui/constants";

type Draft = { name: string; partNumber: string; revision: string; type: string; description: string; materialId: string; defaultAcquisitionMethod: AcquisitionMethod; cadSource: PartDefinition["cadSource"] };
const buildDraft = (part?: PartDefinition): Draft => ({ name: part?.name ?? "", partNumber: part?.partNumber ?? "", revision: part?.revision ?? "A", type: part?.type ?? "custom", description: part?.description ?? "", materialId: part?.materialId ?? "", defaultAcquisitionMethod: part?.defaultAcquisitionMethod ?? "stock", cadSource: part?.cadSource ?? "manual" });
type Inputs = { partDefinitions: PartDefinition[]; canCreateParts: boolean; mutate: (path: string, init: RequestInit) => Promise<boolean> };
export function usePartDefinitionEditor({ partDefinitions, canCreateParts, mutate }: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildDraft);
  const uncertainCreate = useRef(false);
  const open = () => { uncertainCreate.current = false; openDraft(buildDraft()); };
  const edit = (id: string) => { const part = partDefinitions.find((candidate) => candidate.id === id); if (part) { uncertainCreate.current = false; openDraft(buildDraft(part), id); } };
  const save = async () => {
    const { draft, id } = editor;
    if (!id && uncertainCreate.current) { setError("Creation was already submitted. Reopen the part definition before trying again."); return; }
    if (!id && !canCreateParts) { setError("Only leads, mentors, and admins can add part definitions."); return; }
    const payload = { name: draft.name.trim(), partNumber: draft.partNumber.trim(), revision: draft.revision.trim(), iteration: 0, isArchived: false, type: draft.type.trim(), defaultAcquisitionMethod: draft.defaultAcquisitionMethod, materialId: draft.materialId || null, description: draft.description.trim(), cadSource: draft.cadSource, cadImportSource: "MANUAL" as const, cadEditedAfterImport: false };
    if (!payload.name || !payload.partNumber || !payload.revision || !payload.type) { setError("Add a name, part number, revision, and type."); return; }
    const ok = await mutate(id ? `/api/part-definitions/${id}` : "/api/part-definitions", { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
    if (!id && !ok) uncertainCreate.current = true;
    complete(ok, "Could not confirm the part definition was saved.");
  };
  const remove = async () => { if (!editor.id || !canCreateParts) return; const ok = await mutate(`/api/part-definitions/${editor.id}`, { method: "DELETE" }); complete(ok, "Could not confirm the part definition was deleted."); };
  return { ...editor, open, edit, save, remove, canCreateParts, acquisitionOptions: [{ id: "stock", name: "Stock" }, { id: "purchase-cots", name: "Purchase COTS" }, { id: "manufacture", name: "Manufacture" }], sourceOptions: PART_SOURCE_OPTIONS };
}
