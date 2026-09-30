import { useEditorDraft } from "./useEditorDraft";
import type { Material, PurchaseItem, Task, Vendor } from "../../types/domain";
import type { MaterialRollup } from "../../ui/types";

type Draft = { title: string; taskId: string; kind: "cots-goods" | "manufacturing-service"; quantity: string; vendorId: string; amount: string; materialId: string };
function buildDraft(seed?: PurchaseItem): Draft {
  const quote = seed?.quotes.find((item) => item.id === seed.selectedQuoteId) ?? seed?.quotes[0];
  return { title: seed?.title ?? "", taskId: seed?.taskId ?? "", kind: seed?.kind ?? "cots-goods", quantity: String(seed?.quantity ?? 1), vendorId: quote?.vendorId ?? "", amount: quote?.amount ? String(quote.amount.amount) : "", materialId: seed?.materialId ?? "" };
}
type Inputs = { tasks: Task[]; materials: Material[]; vendors: Vendor[]; purchaseItems: PurchaseItem[]; canMentorApprove: boolean; mutate: (path: string, init: RequestInit) => Promise<boolean> };
export function usePurchaseEditor({ tasks, materials, vendors, purchaseItems, canMentorApprove, mutate }: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildDraft);
  const open = (seed?: PurchaseItem) => openDraft(buildDraft(seed), seed?.id ?? null);
  const restock = (row: MaterialRollup) => openDraft({ ...buildDraft(), title: `Restock ${row.name}`, materialId: row.id, quantity: String(Math.max(1, row.suggestedOrderQuantity)) });
  const save = async () => {
    const quantity = Number(editor.draft.quantity);
    const amount = editor.draft.amount.trim() ? Number(editor.draft.amount) : null;
    if (!tasks.some((task) => task.id === editor.draft.taskId) || !editor.draft.title.trim() || !Number.isFinite(quantity) || quantity <= 0 || (amount !== null && (!Number.isFinite(amount) || amount < 0))) {
      setError("Choose the procurement task and enter a title, positive quantity, and valid quote amount."); return;
    }
    if (editor.draft.vendorId && !vendors.some((vendor) => vendor.id === editor.draft.vendorId)) { setError("Choose a known vendor."); return; }
    if (editor.draft.materialId && !materials.some((material) => material.id === editor.draft.materialId)) { setError("Choose a known material."); return; }
    const quoteId = editor.draft.vendorId ? (editor.draft.vendorId + "-quote") : null;
    const quotes = editor.draft.vendorId ? [{ id: quoteId!, vendorId: editor.draft.vendorId, reference: null, amount: amount === null ? null : { amount, currency: "USD" }, quotedAt: new Date().toISOString() }] : [];
    const payload = { taskId: editor.draft.taskId, kind: editor.draft.kind, partDefinitionId: null, materialId: editor.draft.materialId || null, title: editor.draft.title.trim(), quantity, quotes, selectedQuoteId: quoteId, approvalStatus: "pending", approvedById: null, approvedAt: null, purchaseOrderNumber: null, orderStatus: "not-ordered", finalCost: null, expectedDeliveryDate: null, trackingNumber: null, trackingUrl: null, orderedAt: null, deliveredAt: null };
    const ok = await mutate(editor.id ? `/api/purchases/${editor.id}` : "/api/purchases", { method: editor.id ? "PATCH" : "POST", body: JSON.stringify(payload) });
    complete(ok, "Could not confirm the purchase item was saved. Your draft is still here.");
  };
  const deletePurchase = async () => { if (!editor.id || !canMentorApprove) return; const ok = await mutate(`/api/purchases/${editor.id}`, { method: "DELETE" }); complete(ok, "Could not confirm the purchase item was deleted."); };
  return { ...editor, open, restock, save, deletePurchase, canManageProtectedFields: canMentorApprove, taskOptions: tasks.map((task) => ({ id: task.id, name: task.title })), vendorOptions: vendors.map((vendor) => ({ id: vendor.id, name: vendor.name })), materialOptions: materials.map((material) => ({ id: material.id, name: material.name })) };
}
