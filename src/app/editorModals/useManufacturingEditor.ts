import { useEditorDraft } from "./useEditorDraft";
import type { ManufacturingItem, Member, Subsystem } from "../../types/domain";
import type { ManufacturingViewTab } from "../../ui/types";
import { isoToday } from "../../ui/helpers";

function buildDraft(
  process: ManufacturingItem["process"] = "cnc",
  seed?: Partial<ManufacturingItem>,
) {
  return {
    title: seed?.title ?? "",
    subsystemId: seed?.subsystemId ?? "",
    requestedById: seed?.requestedById ?? "",
    process: seed?.process ?? process,
    dueDate: seed?.dueDate ?? isoToday(),
    material: seed?.material ?? "",
    quantity: typeof seed?.quantity === "number" ? String(seed.quantity) : "1",
    batchLabel: seed?.batchLabel ?? "",
    qaReviewCount: typeof seed?.qaReviewCount === "number" ? String(seed.qaReviewCount) : "0",
  };
}

type Inputs = {
  manufacturingView: ManufacturingViewTab;
  subsystems: Subsystem[];
  members: Member[];
  signedInMember: Member | null;
  canMentorApprove: boolean;
  mutate: (path: string, init: RequestInit) => Promise<boolean>;
};

export function useManufacturingEditor({
  manufacturingView,
  subsystems,
  members,
  signedInMember,
  canMentorApprove,
  mutate,
}: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildDraft);
  const open = (item?: ManufacturingItem) => {
    const process = manufacturingView === "prints" ? "3d-print"
      : manufacturingView === "fabrication" ? "fabrication" : "cnc";
    openDraft(buildDraft(process, item ?? {
      subsystemId: subsystems[0]?.id ?? "",
      requestedById: signedInMember?.id ?? members[0]?.id ?? "",
    }), item?.id ?? null);
  };
  const save = async () => {
    const parsedQty = Number(editor.draft.quantity);
    const parsedQaReviewCount = Number(editor.draft.qaReviewCount);
    const title = editor.draft.title.trim();
    const material = editor.draft.material.trim();
    const missingFields = [
      !title ? "title" : null,
      !editor.draft.subsystemId ? "subsystem" : null,
      !editor.draft.requestedById ? "requester" : null,
      !material ? "material" : null,
      Number.isNaN(parsedQty) || parsedQty <= 0 ? "quantity" : null,
      Number.isNaN(parsedQaReviewCount) || parsedQaReviewCount < 0 ? "QA review count" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setError(`Add ${missingFields.join(", ")} before saving this manufacturing item.`);
      return;
    }

    const payload = {
      title,
      subsystemId: editor.draft.subsystemId,
      requestedById: editor.draft.requestedById,
      process: editor.draft.process,
      dueDate: editor.draft.dueDate || isoToday(),
      material,
      quantity: parsedQty,
      batchLabel: editor.draft.batchLabel.trim() || undefined,
      qaReviewCount: parsedQaReviewCount,
      ...(!editor.id
        ? { status: "requested", mentorReviewed: false }
        : {}),
    };

    const ok = await mutate(
      editor.id ? `/api/manufacturing/${editor.id}` : "/api/manufacturing",
      {
        method: editor.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    complete(ok, "Could not confirm the manufacturing item was saved. Your draft is still here.");
  };

  const deleteManufacturing = async () => {
    if (!editor.id || !canMentorApprove) {
      return;
    }

    const ok = await mutate(`/api/manufacturing/${editor.id}`, {
      method: "DELETE",
    });

    complete(ok, "Could not confirm the manufacturing item was deleted.");
  };

  return {
    ...editor,
    canDelete: canMentorApprove,
    requesterName: members.find((member) => member.id === editor.draft.requestedById)?.name
      ?? signedInMember?.name ?? "Signed-in person",
    open,
    save,
    deleteManufacturing,
  };
}
