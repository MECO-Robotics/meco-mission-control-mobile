import type {
  ManufacturingItem,
  PartDefinition,
  PartInstance,
  PurchaseItem,
} from "../../types/domain";

export const offseasonPartDefinitions: PartDefinition[] = [
  {
    id: "pd-practice-field-kit",
    name: "Portable Practice Field Kit",
    partNumber: "OPS-512",
    revision: "A",
    type: "field kit",
    source: "In-house fabrication",
    description: "Reusable cones, tape markers, reset bins, and driver station boundary hardware.",
  },
  {
    id: "pd-vision-camera-mount",
    name: "Vision Camera Mount",
    partNumber: "VIS-118",
    revision: "D",
    type: "custom",
    source: "Onshape",
    description: "Adjustable camera mount used for offseason pose-estimation testing.",
  },
];

export const offseasonPartInstances: PartInstance[] = [
  {
    id: "pi-practice-field-kit",
    subsystemId: "practice-field",
    mechanismId: "practice-grid",
    partDefinitionId: "pd-practice-field-kit",
    name: "Portable summer practice field kit",
    quantity: 1,
    trackIndividually: true,
    status: "available",
  },
  {
    id: "pi-vision-camera-mount-front",
    subsystemId: "vision",
    mechanismId: "vision-calibration",
    partDefinitionId: "pd-vision-camera-mount",
    name: "Front camera adjustable mount",
    quantity: 1,
    trackIndividually: true,
    status: "installed",
  },
];

export const offseasonManufacturingItems: ManufacturingItem[] = [
  {
    id: "practice-field-marker-refresh",
    title: "Practice field marker refresh",
    subsystemId: "practice-field",
    requestedById: "caleb",
    process: "fabrication",
    dueDate: "2026-06-09",
    material: "Gaff tape, coroplast, and reset-bin labels",
    partDefinitionId: "pd-practice-field-kit",
    quantity: 1,
    status: "in-progress",
    mentorReviewed: true,
    batchLabel: "FLD-07",
    qaReviewCount: 0,
  },
  {
    id: "vision-camera-mount-recut",
    title: "Vision camera mount recut",
    subsystemId: "vision",
    requestedById: "noah",
    process: "3d-print",
    dueDate: "2026-06-12",
    material: "PETG-CF",
    partDefinitionId: "pd-vision-camera-mount",
    quantity: 2,
    status: "approved",
    mentorReviewed: true,
    batchLabel: "VIS-15",
    qaReviewCount: 0,
  },
];

export const offseasonPurchaseItems: PurchaseItem[] = [
  {
    id: "april-tag-print-set",
    title: "AprilTag calibration print set",
    subsystemId: "vision",
    requestedById: "noah",
    partDefinitionId: "pd-vision-camera-mount",
    quantity: 1,
    vendor: "AndyMark",
    linkLabel: "andymark.com/apriltag",
    estimatedCost: 28,
    approvedByMentor: true,
    status: "delivered",
  },
  {
    id: "practice-field-tape-restock",
    title: "Practice field tape restock",
    subsystemId: "practice-field",
    requestedById: "caleb",
    partDefinitionId: "pd-practice-field-kit",
    quantity: 3,
    vendor: "Uline",
    linkLabel: "uline.com/gaffers-tape",
    estimatedCost: 54,
    approvedByMentor: false,
    status: "requested",
  },
];
