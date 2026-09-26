import { useRef } from "react";
import { useEditorDraft } from "./useEditorDraft";
import { buildPartDefinitionDraft, isoToday } from "../../ui/helpers";
import type { Member, Subsystem, Discipline, PartDefinition } from "../../types/domain";
import type { AcquisitionMethod } from "../../ui/types";
import { mapTaskPayloadToServer } from "../appModel";

type Inputs = {
  members: Member[];
  subsystems: Subsystem[];
  disciplines: Discipline[];
  partDefinitions: PartDefinition[];
  signedInMember: Member | null;
  mutate: (path: string, init: RequestInit) => Promise<boolean>;
};

export function usePartDefinitionEditor({ members, subsystems, disciplines, partDefinitions, signedInMember, mutate }: Inputs) {
  const { view: editor, open: openDraft, setError, complete } = useEditorDraft(buildPartDefinitionDraft);
  const creation = useRef({ attempted: false });
  const open = () => {
    creation.current = { attempted: false };
    openDraft(buildPartDefinitionDraft());
  };
  const edit = (id: string) => {
    const part = partDefinitions.find((item) => item.id === id);
    if (part) {
      creation.current = { attempted: false };
      openDraft(buildPartDefinitionDraft(part), id);
    }
  };
  const createPartAcquisitionWork = async (
    partName: string,
    acquisitionMethod: AcquisitionMethod,
  ) => {
    if (acquisitionMethod === "stock") {
      return true;
    }

    const subsystemId = subsystems[0]?.id ?? "";
    const requesterId = signedInMember?.id ?? members[0]?.id ?? "";
    const ownerId = requesterId;
    const mentorId =
      members.find((member) => member.role === "mentor" || member.role === "admin")?.id ??
      requesterId;
    const dueDate = isoToday();

    if (!subsystemId || !requesterId || !ownerId || !mentorId) {
      return false;
    }

    let acquisitionOk: boolean;
    if (acquisitionMethod === "manufacture") {
      acquisitionOk = await mutate("/api/manufacturing", {
        method: "POST",
        body: JSON.stringify({
          title: `Make ${partName}`,
          subsystemId,
          requestedById: requesterId,
          process: "cnc",
          dueDate,
          material: editor.draft.source,
          quantity: 1,
          status: "requested",
          mentorReviewed: false,
          batchLabel: undefined,
          qaReviewCount: 0,
        }),
      });
    } else {
      acquisitionOk = await mutate("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          title: `Buy ${partName}`,
          subsystemId,
          requestedById: requesterId,
          quantity: 1,
          vendor: editor.draft.source,
          linkLabel: "n/a",
          estimatedCost: 0,
          approvedByMentor: false,
          status: "requested",
        }),
      });
    }

    const taskOk = await mutate("/api/tasks", {
      method: "POST",
      body: JSON.stringify(mapTaskPayloadToServer({
        title: `Acquire ${partName}`,
        summary:
          acquisitionMethod === "manufacture"
            ? `Manufacture ${partName} and move it through QA.`
            : `Purchase ${partName} and confirm it is ready for installation.`,
        subsystemId,
        disciplineId: disciplines[0]?.id || "mechanical",
        mechanismId: null,
        partInstanceId: null,
        targetEventId: null,
        ownerId,
        mentorId,
        dueDate,
        priority: "medium",
        status: "not-started",

        linkedManufacturingIds: [],
        linkedPurchaseIds: [],
        estimatedHours: 0,
        actualHours: 0,
      })),
    });
    return acquisitionOk && taskOk;
  };

  const save = async () => {
    const attempt = creation.current;
    if (!editor.id && attempt.attempted) {
      setError("Creation was already submitted. Close this draft and refresh before creating more acquisition work.");
      return;
    }
    const partName = editor.draft.name.trim();
    const partNumber = editor.draft.partNumber.trim();
    const revision = editor.draft.revision.trim();
    const source = editor.draft.source.trim();
    const missingFields = [
      !partName ? "name" : null,
      !partNumber ? "part number" : null,
      !revision ? "revision" : null,
      !source ? "source" : null,
      !editor.draft.acquisitionMethod ? "acquisition method" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setError(`Add ${missingFields.join(", ")} before saving this part definition.`);
      return;
    }

    const payload = {
      name: partName,
      partNumber,
      revision,
      type: editor.draft.source === "Onshape" ? "custom" : "cots",
      source,
      description: "",
    };

    const isEdit = editor.id;
    if (!isEdit) attempt.attempted = true;
    const ok = await mutate(
      isEdit
        ? `/api/part-definitions/${editor.id}`
        : "/api/part-definitions",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok && !isEdit) {
      const acquisitionOk = await createPartAcquisitionWork(partName, editor.draft.acquisitionMethod);
      // The definition has already been saved; report partial completion without suggesting a duplicate create.
      complete(acquisitionOk, "Part definition saved, but acquisition work could not be confirmed. Close this draft and refresh before creating more acquisition work.");
    } else {
      complete(ok, "Could not confirm the part definition was saved. Close this draft and refresh before submitting again.");
    }
  };

  const remove = async () => {
    if (!editor.id) {
      return;
    }

    const ok = await mutate(`/api/part-definitions/${editor.id}`, {
      method: "DELETE",
    });

    complete(ok, "Could not confirm the part definition was deleted.");
  };

  return { ...editor, open, edit, save, remove };
}
