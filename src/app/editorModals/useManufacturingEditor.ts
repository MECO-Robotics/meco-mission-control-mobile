import { useEditorDraft } from "./useEditorDraft";
import type { ManufacturingItem, Member, Subsystem, TaskDependency, WorkItem } from "../../types/domain";
import type { ManufacturingViewTab } from "../../ui/types";
import { isoToday } from "../../ui/helpers";

function buildDraft(
  process: ManufacturingItem["process"] = "cnc",
  seed?: Partial<ManufacturingItem>,
) {
  return {
    title: seed?.title ?? "",
    responsibleGroup: seed?.responsibleGroup ?? null,
    subsystemId: seed?.subsystemId ?? "",
    requestedById: seed?.requestedById ?? "",
    process: seed?.process ?? process,
    dueDate: seed?.dueDate ?? isoToday(),
    material: seed?.material ?? "",
    quantity: typeof seed?.quantity === "number" ? String(seed.quantity) : "1",
    batchLabel: seed?.batchLabel ?? "",
    qaReviewCount: typeof seed?.qaReviewCount === "number" ? String(seed.qaReviewCount) : "0",
    dependencies: [] as WorkDependencyDraft[],
  };
}

type WorkDependencyDraft = { kind: "work_item"; refType: "task" | "manufacturing"; refId: string; requiredState: string; dependencyType: "hard" | "soft" };

type Inputs = {
  manufacturingView: ManufacturingViewTab;
  subsystems: Subsystem[];
  members: Member[];
  signedInMember: Member | null;
  canMentorApprove: boolean;
  mutate: (path: string, init: RequestInit) => Promise<boolean>;
  request: <T>(path: string, init: RequestInit) => Promise<T>;
  refresh: () => Promise<unknown>;
  workItems: WorkItem[];
  taskDependencies: TaskDependency[];
};

export function useManufacturingEditor({
  manufacturingView,
  subsystems,
  members,
  signedInMember,
  canMentorApprove,
  mutate,
  request,
  refresh,
  workItems,
  taskDependencies,
}: Inputs) {
  const { view: editor, open: openDraft, setError, complete, retainId } = useEditorDraft(buildDraft);
  const open = (item?: ManufacturingItem) => {
    const process = manufacturingView === "prints" ? "3d-print"
      : manufacturingView === "fabrication" ? "fabrication" : "cnc";
    const draft = buildDraft(process, item ?? {
      subsystemId: subsystems[0]?.id ?? "",
      requestedById: signedInMember?.id ?? members[0]?.id ?? "",
    });
    if (item) draft.dependencies = taskDependencies
      .filter((edge) => (edge.workItemId ?? edge.taskId) === item.id && (edge.sourceType ?? "task") === "manufacturing" && edge.kind === "work_item")
      .map((edge) => ({ kind: "work_item", refType: edge.refType ?? "task", refId: edge.refId, requiredState: edge.requiredState, dependencyType: edge.dependencyType }));
    openDraft(draft, item?.id ?? null);
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
      responsibleGroup: editor.draft.responsibleGroup,
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

    try {
      const response = await request<{ item: ManufacturingItem }>(editor.id ? `/api/manufacturing/${editor.id}` : "/api/manufacturing", {
        method: editor.id ? "PATCH" : "POST", body: JSON.stringify(payload),
      });
      const savedId = response.item.id;
      if (!editor.id) retainId(savedId);
      const existing = editor.id ? taskDependencies.filter((edge) => (edge.workItemId ?? edge.taskId) === savedId && (edge.sourceType ?? "task") === "manufacturing" && edge.kind === "work_item") : [];
      const same = (left: TaskDependency | WorkDependencyDraft, right: WorkDependencyDraft) => left.kind === right.kind && left.refId === right.refId && (left.kind !== "work_item" || left.refType === right.refType) && left.requiredState === right.requiredState && left.dependencyType === right.dependencyType;
      for (const edge of existing) if (!editor.draft.dependencies.some((desired) => same(edge, desired))) await request(`/api/task-dependencies/${edge.id}`, { method: "DELETE" });
      for (const edge of editor.draft.dependencies) if (!existing.some((current) => same(current, edge))) await request("/api/task-dependencies", { method: "POST", body: JSON.stringify({ ...edge, workItemId: savedId, sourceType: "manufacturing" }) });
      await refresh();
      complete(true, "Could not confirm the manufacturing item was saved. Your draft is still here.");
    } catch (error) {
      await refresh().catch(() => undefined);
      setError(error instanceof Error ? error.message : "Could not save the manufacturing item and its dependencies.");
    }
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
    dependencyOptions: workItems.filter((item) => !(item.sourceType === "manufacturing" && item.sourceId === editor.id) && !editor.draft.dependencies.some((edge) => edge.refType === item.sourceType && edge.refId === item.sourceId)),
    selectedDependencies: editor.draft.dependencies.map((edge) => ({ edge, item: workItems.find((item) => item.sourceType === edge.refType && item.sourceId === edge.refId) })),
    save,
    deleteManufacturing,
  };
}
