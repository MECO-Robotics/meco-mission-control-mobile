import * as Localization from "expo-localization";

import type {
  Event,
  ManufacturingItem,
  MemberRole,
  PartInstance,
  PurchaseItem,
  Subsystem,
  Task,
  TaskStatus,
  WorkLog,
} from "../types/domain";

import { STATUS_GROUPS } from "./constants";
import type {
  ManufacturingDraft,
  MemberDraft,
  MilestoneDraft,
  PartDefinitionDraft,
  PartLifecycleStatus,
  PurchaseDraft,
  StatusGroup,
  SubsystemDraft,
  WorkLogDraft,
} from "./types";
export function buildMilestoneDraft(seed?: Partial<Event>): MilestoneDraft {
  return {
    title: seed?.title ?? "",
    type: seed?.type ?? "internal-review",
    isExternal: seed?.isExternal ?? false,
    description: seed?.description ?? "",
    relatedSubsystemIdsText: seed?.relatedSubsystemIds?.join(", ") ?? "",
  };
}

export function buildWorkLogDraft(seed?: Partial<WorkLog>): WorkLogDraft {
  return {
    taskId: seed?.taskId ?? "",
    date: seed?.date ?? isoToday(),
    hours: typeof seed?.hours === "number" ? String(seed.hours) : "",
    participantIdsText: seed?.participantIds?.join(",") ?? "",
    notes: seed?.notes ?? "",
  };
}

export function buildManufacturingDraft(
  process: ManufacturingItem["process"],
  seed?: Partial<ManufacturingItem>,
): ManufacturingDraft {
  return {
    title: seed?.title ?? "",
    subsystemId: seed?.subsystemId ?? "",
    requestedById: seed?.requestedById ?? "",
    process: seed?.process ?? process,
    dueDate: seed?.dueDate ?? isoToday(),
    material: seed?.material ?? "",
    quantity: typeof seed?.quantity === "number" ? String(seed.quantity) : "1",
    status: seed?.status ?? "requested",
    mentorReviewed: seed?.mentorReviewed ?? false,
    batchLabel: seed?.batchLabel ?? "",
    qaReviewCount: typeof seed?.qaReviewCount === "number" ? String(seed.qaReviewCount) : "0",
  };
}

export function buildPurchaseDraft(seed?: Partial<PurchaseItem>): PurchaseDraft {
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
    approvedByMentor: seed?.approvedByMentor ?? false,
    status: seed?.status ?? "requested",
  };
}

export function buildMemberDraft(
  seed?: Partial<{
    email: string;
    photoUrl: string;
    name: string;
    role: MemberRole;
    elevated: boolean;
    disciplineId: string | null;
    plannedWeeklyAttendanceHours: number;
    plannedAttendanceDays: string[];
    plannedAttendanceNotes: string;
  }>,
): MemberDraft {
  return {
    email: seed?.email ?? "",
    photoUrl: seed?.photoUrl ?? "",
    name: seed?.name ?? "",
    role: seed?.role ?? "student",
    elevated:
      seed?.elevated ?? (seed?.role === "lead" || seed?.role === "admin"),
    disciplineId: seed?.disciplineId ?? "",
    plannedWeeklyAttendanceHours:
      typeof seed?.plannedWeeklyAttendanceHours === "number"
        ? String(seed.plannedWeeklyAttendanceHours)
        : "0",
    plannedAttendanceDays: seed?.plannedAttendanceDays ?? [],
    plannedAttendanceNotes: seed?.plannedAttendanceNotes ?? "",
  };
}

export function buildSubsystemDraft(seed?: Partial<Subsystem>): SubsystemDraft {
  return {
    name: seed?.name ?? "",
    description: seed?.description ?? "",
    responsibleEngineerId: seed?.responsibleEngineerId ?? "",
    mentorIdsText: seed?.mentorIds?.join(",") ?? "",
    risksText: seed?.risks?.join(", ") ?? "",
  };
}

export function buildPartDefinitionDraft(
  seed?: Partial<{
    name: string;
    partNumber: string;
    revision: string;
    source: string;
    acquisitionMethod: PartDefinitionDraft["acquisitionMethod"];
}>,
): PartDefinitionDraft {
  const source =
    seed?.source === "Onshape" || seed?.source === "FRC Supplier" || seed?.source === "COTS"
      ? seed.source
      : "Onshape";

  return {
    name: seed?.name ?? "",
    partNumber: seed?.partNumber ?? "",
    revision: seed?.revision ?? "A",
    source,
    acquisitionMethod: seed?.acquisitionMethod ?? "manufacture",
  };
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function getStatusGroup(value: string): StatusGroup {
  for (const [group, candidates] of Object.entries(STATUS_GROUPS) as [
    Exclude<StatusGroup, "neutral">,
    Set<string>,
  ][]) {
    if (candidates.has(value)) {
      return group;
    }
  }

  return "neutral";
}

export function timelineProgress(status: TaskStatus): number {
  if (status === "complete") {
    return 1;
  }

  if (status === "waiting-for-qa") {
    return 0.8;
  }

  if (status === "in-progress") {
    return 0.55;
  }

  return 0.18;
}

export function inferMaterialCategory(materialName: string): string {
  const name = materialName.toLowerCase();

  if (name.includes("poly") || name.includes("abs") || name.includes("pla")) {
    return "plastic";
  }

  if (name.includes("onyx") || name.includes("filament")) {
    return "filament";
  }

  if (name.includes("wire") || name.includes("sensor") || name.includes("pcb")) {
    return "electronics";
  }

  if (name.includes("bolt") || name.includes("screw") || name.includes("nut")) {
    return "hardware";
  }

  if (name.includes("alu") || name.includes("steel") || name.includes("metal")) {
    return "metal";
  }

  return "other";
}

export function derivePartLifecycleStatus(
  partInstance: PartInstance,
  tasks: Task[],
): PartLifecycleStatus {
  const linkedTasks = tasks.filter((task) => task.partInstanceId === partInstance.id);

  if (linkedTasks.length === 0) {
    return "planned";
  }

  if (linkedTasks.every((task) => task.status === "complete")) {
    return "installed";
  }

  if (linkedTasks.some((task) => task.status === "waiting-for-qa")) {
    return "available";
  }

  if (linkedTasks.some((task) => task.status === "in-progress")) {
    return "needed";
  }

  return "planned";
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

let appLocaleOverride: string | null = null;

export function setAppLocaleOverride(locale: string | null) {
  appLocaleOverride = locale;
}

export function getDeviceLocale() {
  const nativeLocale = Localization.getLocales()[0]?.languageTag;

  if (typeof nativeLocale === "string" && nativeLocale.trim().length > 0) {
    return nativeLocale;
  }

  return Intl.DateTimeFormat().resolvedOptions().locale;
}

export function getAppLocale() {
  return appLocaleOverride ?? getDeviceLocale();
}

export function formatDate(value: string, locale = getAppLocale()) {
  const date = parseDateOnly(value);

  if (!date) {
    return value.slice(5);
  }

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

export function datePortion(dateTime: string) {
  return dateTime.slice(0, 10);
}

export function timePortion(dateTime: string) {
  if (dateTime.length < 16) {
    return "12:00";
  }

  return dateTime.slice(11, 16);
}

export function buildDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export function compareDateTimes(a: string, b: string) {
  return new Date(a).getTime() - new Date(b).getTime();
}

export function localTodayDate() {
  const now = new Date();
  const offsetAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offsetAdjusted.toISOString().slice(0, 10);
}

export function formatDateTime(value: string, locale = getAppLocale()) {
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function capitalize(value: string) {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export function shiftDateByDays(value: string, dayDelta: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}
