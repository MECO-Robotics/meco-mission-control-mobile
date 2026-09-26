import { useState } from "react";
import type { ManufacturingItem, Member, PurchaseItem, Subsystem } from "../../types/domain";
import type { MaterialRollup } from "../../ui/types";

function buildDraft(seed?: Partial<PurchaseItem>) {
  return {
    title: seed?.title ?? "",
    subsystemId: seed?.subsystemId ?? "",
    requestedById: seed?.requestedById ?? "",
    quantity: typeof seed?.quantity === "number" ? String(seed.quantity) : "1",
    vendor: seed?.vendor ?? "",
    linkLabel: seed?.linkLabel ?? "",
    estimatedCost:
      typeof seed?.estimatedCost === "number" ? String(seed.estimatedCost) : "",
    finalCost: typeof seed?.finalCost === "number" ? String(seed.finalCost) : "",
  };
}

type Inputs = {
  subsystems: Subsystem[];
  members: Member[];
  signedInMember: Member | null;
  manufacturingItems: ManufacturingItem[];
  purchaseItems: PurchaseItem[];
  canMentorApprove: boolean;
  mutate: (path: string, init: RequestInit) => Promise<boolean>;
};

export function usePurchaseEditor({
  subsystems,
  members,
  signedInMember,
  manufacturingItems,
  purchaseItems,
  canMentorApprove,
  mutate,
}: Inputs) {
  const [editor, setEditor] = useState<{
    draft: ReturnType<typeof buildDraft>;
    id: string | null;
    visible: boolean;
    error: string | null;
  }>(() => ({
    draft: buildDraft(),
    id: null,
    visible: false,
    error: null,
  }));
  const open = (seed: Partial<PurchaseItem> = {}) => {
    const draft = buildDraft({
      subsystemId: subsystems[0]?.id ?? "",
      requestedById: members[0]?.id ?? "",
      ...seed,
    });
    setEditor({ draft, id: seed.id ?? null, visible: true, error: null });
  };
  const close = () => {
    setEditor((current) => ({ ...current, id: null, visible: false, error: null }));
  };
  const updateDraft = (patch: Partial<typeof editor.draft>) => {
    setEditor((current) => ({ ...current, draft: { ...current.draft, ...patch }, error: null }));
  };
  const closeIfCurrent = () => {
    setEditor((current) => current === editor
      ? { ...current, id: null, visible: false, error: null }
      : current);
  };
  const restock = (row: MaterialRollup) => {
    const relatedManufacturingItem = manufacturingItems.find(
      (item) => item.material === row.name && item.status !== "complete",
    );
    const relatedPurchase = purchaseItems.find((item) => {
      const text = `${item.title} ${item.vendor} ${item.linkLabel}`.toLowerCase();
      return row.name
        .toLowerCase()
        .split(" ")
        .some((token) => token.length > 3 && text.includes(token));
    });

    open({
      title: `Restock ${row.name}`,
      subsystemId: relatedManufacturingItem?.subsystemId ?? subsystems[0]?.id ?? "",
      requestedById: signedInMember?.id ?? members[0]?.id ?? "",
      quantity: Math.max(row.suggestedOrderQuantity, row.reorderPoint),
      vendor: row.vendor === "Mixed" ? "" : row.vendor,
      linkLabel: relatedPurchase?.linkLabel ?? "",
    });
  };

  const save = async () => {
    const parsedQty = Number(editor.draft.quantity);
    const parsedEstimate = Number(editor.draft.estimatedCost);
    const parsedFinal = editor.draft.finalCost.trim() ? Number(editor.draft.finalCost) : undefined;
    const title = editor.draft.title.trim();
    const vendor = editor.draft.vendor.trim();
    const linkLabel = editor.draft.linkLabel.trim();
    const invalidFinalCost =
      editor.draft.finalCost.trim() &&
      (typeof parsedFinal !== "number" || Number.isNaN(parsedFinal) || parsedFinal < 0);
    const missingFields = [
      !title ? "title" : null,
      !editor.draft.subsystemId ? "subsystem" : null,
      !editor.draft.requestedById ? "requester" : null,
      !vendor ? "vendor" : null,
      Number.isNaN(parsedQty) || parsedQty <= 0 ? "quantity" : null,
      Number.isNaN(parsedEstimate) || parsedEstimate < 0 ? "estimated cost" : null,
      invalidFinalCost ? "final cost" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setEditor((current) => ({ ...current, error: `Add ${missingFields.join(", ")} before saving this purchase.` }));
      return;
    }

    const payload = {
      title,
      subsystemId: editor.draft.subsystemId,
      requestedById: editor.draft.requestedById,
      quantity: parsedQty,
      vendor,
      linkLabel: linkLabel || "n/a",
      estimatedCost: parsedEstimate,
      finalCost:
        canMentorApprove && typeof parsedFinal === "number" && !Number.isNaN(parsedFinal)
          ? parsedFinal
          : undefined,
      ...(!editor.id
        ? { approvedByMentor: false, status: "requested" }
        : {}),
    };

    const ok = await mutate(
      editor.id ? `/api/purchases/${editor.id}` : "/api/purchases",
      {
        method: editor.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok) closeIfCurrent();
  };

  const deletePurchase = async () => {
    if (!editor.id || !canMentorApprove) {
      return;
    }

    const ok = await mutate(`/api/purchases/${editor.id}`, {
      method: "DELETE",
    });

    if (ok) closeIfCurrent();
  };

  return {
    ...editor,
    canManageProtectedFields: canMentorApprove,
    open,
    restock,
    close,
    updateDraft,
    save,
    deletePurchase,
  };
}
