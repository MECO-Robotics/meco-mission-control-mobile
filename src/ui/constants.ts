import type { EventType, QaResult, TaskStatus } from "../types/domain";
import { eventTypeColors } from "../theme";
import type {
  ArchiveFilterMode,
  BlockerFilterMode,
  EventStyle,
  InventoryViewTab,
  ManufacturingViewTab,
  Option,
  StatusGroup,
  TaskSubteamTab,
  TaskViewTab,
  WorkLogSortMode,
} from "./types";
export const TASK_VIEW_OPTIONS: { value: TaskViewTab; label: string }[] = [
  { value: "timeline", label: "Timeline" },
  { value: "queue", label: "Queue" },
  { value: "milestones", label: "Milestones" },
];

export const TASK_SUBTEAM_OPTIONS: { value: TaskSubteamTab; label: string }[] = [
  { value: "programming", label: "Programming" },
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
];

export const TASK_SUBTEAM_DISCIPLINE_IDS: Record<TaskSubteamTab, string[]> = {
  programming: ["software", "programming", "integration", "testing"],
  mechanical: ["mechanical", "design", "manufacturing", "assembly"],
  electrical: ["electrical"],
};

export const MANUFACTURING_VIEW_OPTIONS: { value: ManufacturingViewTab; label: string }[] = [
  { value: "cnc", label: "CNC" },
  { value: "prints", label: "3D print" },
  { value: "fabrication", label: "Fabrication" },
];

export const INVENTORY_VIEW_OPTIONS: { value: InventoryViewTab; label: string }[] = [
  { value: "materials", label: "Materials" },
  { value: "parts", label: "Parts" },
  { value: "purchases", label: "Purchases" },
];

export const TASK_STATUS_OPTIONS: Option[] = [
  { id: "not-started", name: "Not started" },
  { id: "in-progress", name: "In progress" },
  { id: "waiting-for-qa", name: "Waiting for QA" },
  { id: "complete", name: "Complete" },
];

export const TASK_PRIORITY_OPTIONS: Option[] = [
  { id: "critical", name: "Critical" },
  { id: "high", name: "High" },
  { id: "medium", name: "Medium" },
  { id: "low", name: "Low" },
];

export const MANUFACTURING_STATUS_OPTIONS: Option[] = [
  { id: "requested", name: "Requested" },
  { id: "approved", name: "Approved" },
  { id: "in-progress", name: "In progress" },
  { id: "qa", name: "QA" },
  { id: "complete", name: "Complete" },
];

export const PART_STATUS_OPTIONS: Option[] = [
  { id: "planned", name: "Planned" },
  { id: "needed", name: "Needed" },
  { id: "available", name: "Available" },
  { id: "installed", name: "Installed" },
  { id: "retired", name: "Retired" },
];

export const PURCHASE_STATUS_OPTIONS: Option[] = [
  { id: "requested", name: "Requested" },
  { id: "approved", name: "Approved" },
  { id: "purchased", name: "Purchased" },
  { id: "shipped", name: "Shipped" },
  { id: "delivered", name: "Delivered" },
];

export const PURCHASE_APPROVAL_OPTIONS: Option[] = [
  { id: "approved", name: "Approved" },
  { id: "waiting", name: "Waiting" },
];

export const MATERIAL_CATEGORY_OPTIONS: Option[] = [
  { id: "metal", name: "Metal" },
  { id: "plastic", name: "Plastic" },
  { id: "filament", name: "Filament" },
  { id: "electronics", name: "Electronics" },
  { id: "hardware", name: "Hardware" },
  { id: "consumable", name: "Consumable" },
  { id: "other", name: "Other" },
];

export const PART_SOURCE_OPTIONS: Option[] = [
  { id: "Onshape", name: "Onshape" },
  { id: "FRC Supplier", name: "FRC Supplier" },
  { id: "COTS", name: "COTS" },
];

export const ACQUISITION_METHOD_OPTIONS: Option[] = [
  { id: "manufacture", name: "Manufacture" },
  { id: "purchase", name: "Purchase" },
  { id: "stock", name: "Already stocked" },
];

export const WORKLOG_SORT_OPTIONS: { id: WorkLogSortMode; name: string }[] = [
  { id: "recent", name: "Newest first" },
  { id: "oldest", name: "Oldest first" },
  { id: "longest", name: "Longest first" },
  { id: "shortest", name: "Shortest first" },
];

export const WORKLOG_TEMPLATE_OPTIONS = [
  {
    id: "cad",
    name: "CAD",
    notes: "CAD work:\n- Changed:\n- Checked clearances/interfaces:\n- Next step:",
  },
  {
    id: "machining",
    name: "Machining",
    notes: "Machining/fabrication:\n- Made:\n- Material/tooling:\n- Measurement/fit check:\n- Next step:",
  },
  {
    id: "wiring",
    name: "Wiring",
    notes: "Wiring/electrical:\n- Wired/changed:\n- Tested:\n- Labeling/documentation:\n- Next step:",
  },
  {
    id: "programming",
    name: "Programming",
    notes: "Programming:\n- Changed:\n- Tested on robot/sim:\n- Issue found:\n- Next step:",
  },
  {
    id: "testing",
    name: "Testing",
    notes: "Testing:\n- Test goal:\n- Setup:\n- Result:\n- Follow-up:",
  },
  {
    id: "meeting",
    name: "Meeting",
    notes: "Meeting notes:\n- Decisions:\n- Assigned work:\n- Risks/blockers:\n- Next check-in:",
  },
];

export const EVENT_TYPE_OPTIONS: Option[] = [
  { id: "drive-practice", name: "Drive practice" },
  { id: "competition", name: "Competition" },
  { id: "deadline", name: "Deadline" },
  { id: "internal-review", name: "Internal review" },
  { id: "demo", name: "Demo" },
];

export const ARCHIVE_FILTER_OPTIONS: { id: ArchiveFilterMode; name: string }[] = [
  { id: "active", name: "Active" },
  { id: "archived", name: "Archive" },
  { id: "all", name: "All" },
];

export const BLOCKER_FILTER_OPTIONS: { id: BlockerFilterMode; name: string }[] = [
  { id: "blocked", name: "Blocked" },
  { id: "clear", name: "No blockers" },
  { id: "over-estimate", name: "Over estimate" },
  { id: "overdue", name: "Overdue" },
  { id: "due-soon", name: "Due soon" },
  { id: "dependency-wait", name: "Dependency wait" },
  { id: "ready-now", name: "Ready now" },
  { id: "ready-to-qa", name: "Ready for QA" },
  { id: "needs-fabrication", name: "Needs fabrication" },
  { id: "needs-purchase", name: "Needs purchase" },
  { id: "unassigned", name: "Unassigned" },
];

export const QA_RESULT_OPTIONS: { id: QaResult; name: string }[] = [
  { id: "pass", name: "Pass" },
  { id: "minor-fix", name: "Minor fix" },
  { id: "iteration-worthy", name: "Iteration-worthy" },
];

export const EVENT_TYPE_STYLES: Record<EventType, EventStyle> = {
  "drive-practice": {
    label: "Drive practice",
    rowBackground: eventTypeColors.practice.columnSurface,
    borderColor: eventTypeColors.practice.border,
    chipBackground: eventTypeColors.practice.surface,
    chipText: eventTypeColors.practice.ink,
  },
  competition: {
    label: "Competition",
    rowBackground: eventTypeColors.competition.columnSurface,
    borderColor: eventTypeColors.competition.border,
    chipBackground: eventTypeColors.competition.surface,
    chipText: eventTypeColors.competition.ink,
  },
  deadline: {
    label: "Deadline",
    rowBackground: eventTypeColors.deadline.columnSurface,
    borderColor: eventTypeColors.deadline.border,
    chipBackground: eventTypeColors.deadline.surface,
    chipText: eventTypeColors.deadline.ink,
  },
  "internal-review": {
    label: "Internal review",
    rowBackground: eventTypeColors.review.columnSurface,
    borderColor: eventTypeColors.review.border,
    chipBackground: eventTypeColors.review.surface,
    chipText: eventTypeColors.review.ink,
  },
  demo: {
    label: "Demo",
    rowBackground: eventTypeColors.demo.columnSurface,
    borderColor: eventTypeColors.demo.border,
    chipBackground: eventTypeColors.demo.surface,
    chipText: eventTypeColors.demo.ink,
  },
};

export const STATUS_GROUPS: Record<Exclude<StatusGroup, "neutral">, Set<string>> = {
  success: new Set(["complete", "delivered", "available", "installed", "pass"]),
  info: new Set(["in-progress", "shipped", "purchased", "approved"]),
  warning: new Set(["waiting-for-qa", "qa", "requested", "high", "waiting", "needed"]),
  danger: new Set(["not-started", "critical", "retired", "iteration-worthy"]),
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "waiting-for-qa": "Waiting for QA",
  complete: "Complete",
};

export const SUBVIEW_INTERACTION_GUIDANCE: Record<string, string[]> = {
  timeline: [
    "Start with the nearest due date and check who owns it.",
    "Tap a task when you need the linked subsystem, part, or event.",
    "Use the people filter when you only want your own work or a mentor's queue.",
  ],
  queue: [
    "Search by task, subsystem, owner, or part when the list gets long.",
    "Use the chips to narrow the queue before standup or shop time.",
    "Tap a card to update status, priority, blockers, or ownership.",
  ],
  milestones: [
    "Sort the list when you need the next deadline or review first.",
    "Open a milestone to adjust the date, type, or related subsystems.",
    "Add new events as soon as a review, demo, or competition date is confirmed.",
  ],
  worklogs: [
    "Search notes when you need to find what changed during a work session.",
    "Sort by date or hours depending on whether you are checking recency or effort.",
    "Open a log to fix participants, hours, or the task it belongs to.",
  ],
  cnc: [
    "Use Add to request a CNC job for the active project.",
    "Requester is filled in from the signed-in person, so students do not need to pick themselves.",
    "Mentors can approve from the card, then the manufacturer can start, send to QA, or complete it.",
  ],
  prints: [
    "Filter print jobs by subsystem, requester, material, or status.",
    "Mentors can approve a job from the card when it is ready.",
    "Move the job through start, QA, and complete as the part moves through the shop.",
  ],
  fabrication: [
    "Use this queue for shop work that is not CNC or 3D printing.",
    "Keep material, quantity, due date, and batch notes current.",
    "Approve, start, QA, and complete work from the card when the job changes hands.",
  ],
  materials: [
    "Check low-stock rows before approving new fabrication work.",
    "Use the category chips to find metal, filament, hardware, or electronics quickly.",
    "Restock from this view when upcoming demand is larger than what is on hand.",
  ],
  parts: [
    "Part definitions show source, total instance count, and available spares.",
    "Choose a source from Onshape, FRC Supplier, or COTS when adding a definition.",
    "Pick an acquisition method on add so the app can open the follow-up manufacturing or purchase work.",
  ],
  purchases: [
    "Search the purchase list before adding a duplicate request.",
    "Filter by vendor, status, or mentor approval during buying review.",
    "Open a card to update cost, vendor, status, or mentor approval details.",
  ],
  subsystems: [
    "Tap a subsystem to show or hide its mechanisms.",
    "Long-press a subsystem when you need to edit ownership, mentors, or risks.",
    "Use this view to compare open work against subsystem responsibility.",
  ],
  reports: [
    "Use QA reports to record pass, minor-fix, or iteration-worthy outcomes.",
    "Sort QA reports by recency, dependencies, and fix size when planning follow-up.",
    "Iteration-worthy QA reports are surfaced in the risk register.",
  ],
  risks: [
    "Review task blockers, subsystem risks, and QA findings together.",
    "High-priority blockers and iteration-worthy findings are marked high.",
    "Resolve blockers from the task queue when the underlying issue is cleared.",
  ],
  roster: [
    "People are grouped by role so ownership and mentor coverage are easy to scan.",
    "Tap a person to make them the current person for filtered views.",
    "Use Edit when a name or role needs to change.",
  ],
};
