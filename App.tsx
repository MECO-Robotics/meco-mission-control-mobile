import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  TextInput,
  Platform,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import {
  EVENT_TYPE_OPTIONS,
  EVENT_TYPE_STYLES,
  INVENTORY_VIEW_OPTIONS,
  MANUFACTURING_STATUS_OPTIONS,
  MANUFACTURING_VIEW_OPTIONS,
  ACQUISITION_METHOD_OPTIONS,
  PART_SOURCE_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  QA_RESULT_OPTIONS,
  STATUS_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_SUBTEAM_DISCIPLINE_IDS,
  TASK_SUBTEAM_OPTIONS,
  TASK_VIEW_OPTIONS,
  WORKLOG_TEMPLATE_OPTIONS,
} from "./src/ui/constants";
import {
  buildDateTime,
  buildManufacturingDraft,
  buildMemberDraft,
  buildMilestoneDraft,
  buildPartDefinitionDraft,
  buildPurchaseDraft,
  buildSubsystemDraft,
  buildTaskDraft,
  buildWorkLogDraft,
  capitalize,
  compareDateTimes,
  datePortion,
  derivePartLifecycleStatus,
  formatDate,
  formatDateTime,
  inferMaterialCategory,
  isoToday,
  localTodayDate,
  splitList,
  timePortion,
} from "./src/ui/helpers";
import { getResponsiveMetrics, scaleFont } from "./src/ui/responsive";
import { styles } from "./src/ui/styles";
import type {
  AcquisitionMethod,
  ArchiveFilterMode,
  BlockerFilterMode,
  EditorMode,
  EventReportDraft,
  InventoryViewTab,
  ManufacturingDraft,
  ManufacturingViewTab,
  MaterialRollup,
  MemberDraft,
  MilestoneDraft,
  MilestoneSortField,
  NavItem,
  PartDefinitionDraft,
  PurchaseDraft,
  QaReportDraft,
  SummaryChipData,
  SubsystemDraft,
  TaskDraft,
  TaskSubteamTab,
  TaskViewTab,
  ViewTab,
  WorkLogDraft,
  WorkLogSortMode,
} from "./src/ui/types";
import {
  AdvancedOptions,
  EditorModal,
  DropdownField,
  ModalField,
  SearchField,
  ToggleField,
} from "./src/ui/ui";
import { AppThemeProvider } from "./src/ui/themeContext";
import { LocalizationProvider, Text, type LanguageCode } from "./src/i18n";
import {
  ApiNetworkError,
  ApiRequestError,
  classifyMobileAuthError,
  getMobileAuthErrorMessage,
  type MobileAuthErrorState,
  requestJson,
  resolveApiBaseUrl,
} from "./src/data/api";
import { buildHelpRequest, type HelpRequestInput } from "./src/data/helpRequests";
import { mecoSnapshot } from "./src/data/mockData";
import { tasks as seededTasks } from "./src/data/tasks";
import type {
  MemberRole,
  ManufacturingItem,
  BootstrapMilestone,
  Event,
  EventType,
  HelpRequest,
  PlatformBootstrapPayload,
  PublicAuthConfig,
  PurchaseItem,
  QaRequest,
  QaReview,
  SessionResponse,
  SessionUser,
  Subsystem,
  Task,
  TaskPriority,
  TaskStatus,
  WorkLog,
} from "./src/types/domain";

import { appThemes, colors, type AppThemeName } from "./src/theme";
import { AttendanceStatusMark } from "./src/screens/AttendanceStatusMark";
import { AttendanceScreen } from "./src/screens/AttendanceScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { ManufacturingScreen } from "./src/screens/ManufacturingScreen";
import { ReportsScreen } from "./src/screens/ReportsScreen";
import { RisksScreen } from "./src/screens/RisksScreen";
import { RosterScreen } from "./src/screens/RosterScreen";
import { SubsystemsScreen } from "./src/screens/SubsystemsScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { WorkLogsScreen } from "./src/screens/WorkLogsScreen";
import type { SubsystemCounts, WorkLogListItem } from "./src/screens/types";
import {
  buildWorkLogDraftFingerprint,
  enqueuePendingWorkLogDraft,
  loadPendingWorkLogDrafts,
  markPendingWorkLogDraftFailed,
  markPendingWorkLogDraftSyncing,
  reconcilePendingWorkLogDrafts,
  removePendingWorkLogDraft,
  savePendingWorkLogDrafts,
  type PendingWorkLogDraft,
} from "./src/services/workLogDraftSync";
import {
  endWorkLogLiveActivity,
  startWorkLogLiveActivity,
  updateWorkLogLiveActivity,
} from "./src/services/workLogLiveActivity";
import {
  cancelWorkLogTimerReminders,
  clearPersistedWorkLogTimerState,
  persistWorkLogTimerState,
  restorePersistedWorkLogTimerReminder,
  schedulePersistedWorkLogTimerReminders,
} from "./src/services/workLogTimerNotifications";

WebBrowser.maybeCompleteAuthSession();

const SWIPE_ACTIVATION_DISTANCE = 18;
const SWIPE_COMMIT_DISTANCE = 52;
const SUBTAB_SWIPE_ACTIVATION_DISTANCE = 24;
const SUBTAB_SWIPE_COMMIT_DISTANCE = 72;
const TIMER_TICK_MS = 1000;
const MS_PER_HOUR = 1000 * 60 * 60;
const GOOGLE_CLIENT_ID_PLACEHOLDER = "missing-google-client-id";

type AttendanceStatus = "yes" | "maybe" | "no";
type SeasonOption = {
  id: string;
  label: string;
};
type WorkLogTimerState = {
  id: string;
  elapsedMs: number;
  isPaused: boolean;
  reminderNotificationIds: string[];
  startedAt: number | null;
};

type WorkLogMutationResponse = {
  item?: WorkLog;
};

function shouldQueueWorkLogDraftAfterError(error: unknown) {
  return (
    error instanceof ApiNetworkError ||
    (error instanceof ApiRequestError && error.status >= 500)
  );
}

function mapPendingWorkLogDraftToWorkLog(
  draft: PendingWorkLogDraft,
): WorkLogListItem {
  return {
    id: draft.id,
    localDraftId: draft.id,
    syncError: draft.error,
    syncStatus: draft.status,
    ...draft.payload,
  };
}

function formatTimerElapsed(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}

function formatHoursFromTimer(elapsedMs: number) {
  const roundedHours = Math.round((elapsedMs / MS_PER_HOUR) * 100) / 100;

  return Number.isInteger(roundedHours)
    ? String(roundedHours)
    : String(roundedHours).replace(/0$/, "");
}

function getWorkLogTimerElapsedMs(
  timer: WorkLogTimerState | null,
  now = Date.now(),
) {
  if (!timer) {
    return 0;
  }

  return (
    timer.elapsedMs +
    (timer.startedAt && !timer.isPaused
      ? Math.max(0, now - timer.startedAt)
      : 0)
  );
}
type RiskPriority = "high" | "medium" | "low";

const RISK_PRIORITY_RANK: Record<RiskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const ATTENDANCE_STATUS_BY_MEMBER_ID: Record<string, AttendanceStatus> = {
  ava: "yes",
  ethan: "maybe",
  jordan: "yes",
  lucas: "no",
  maya: "yes",
  priya: "maybe",
  riley: "yes",
  noah: "yes",
  zoe: "maybe",
  diego: "yes",
  emma: "yes",
};

const INITIAL_SEASONS: SeasonOption[] = [
  { id: "2026-offseason", label: "2026 Competition & Offseason" },
  { id: "2027-preseason", label: "2027 Preseason" },
];

const PLANNED_ATTENDANCE_DAY_OPTIONS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
] as const;

const REQUIRED_EMAIL_DOMAIN = "mecorobotics.org";

const REQUIRED_TASK_SUBSYSTEMS: Subsystem[] = [
  {
    id: "climber",
    name: "Climber",
    description: "Endgame lift, latch, and climb release mechanisms.",
    isCore: false,
    parentSubsystemId: null,
    responsibleEngineerId: "priya",
    mentorIds: ["jordan"],
    risks: ["Hook alignment", "Winch load margin"],
  },
  {
    id: "controls",
    name: "Controls",
    description: "Robot software, safety, and autonomous logic.",
    isCore: false,
    parentSubsystemId: "drive",
    responsibleEngineerId: "ethan",
    mentorIds: ["riley"],
    risks: ["Auto safety interlocks"],
  },
  {
    id: "drive",
    name: "Drivetrain",
    description: "Core drivetrain, chassis interfaces, and shared base electronics.",
    isCore: true,
    parentSubsystemId: null,
    responsibleEngineerId: "ava",
    mentorIds: ["jordan"],
    risks: ["Sensor drift", "Cable clearance"],
  },
  {
    id: "manipulator",
    name: "Manipulator",
    description: "Intake, handling, and game-piece interaction hardware.",
    isCore: false,
    parentSubsystemId: "drive",
    responsibleEngineerId: "lucas",
    mentorIds: ["riley"],
    risks: ["Chain wear", "Assembly tolerance"],
  },
  {
    id: "vision",
    name: "Vision",
    description: "Camera targeting, pose estimation, and visual feedback.",
    isCore: false,
    parentSubsystemId: "drive",
    responsibleEngineerId: "ethan",
    mentorIds: ["riley"],
    risks: ["Camera calibration", "Lighting variability"],
  },
];
function buildSubsystemOptions(subsystems: Subsystem[]) {
  return subsystems.map((subsystem) => ({
    id: subsystem.id,
    name: subsystem.name,
  }));
}

function normalizeTaskSubsystems(currentSubsystems: Subsystem[]) {
  return currentSubsystems.length > 0 ? currentSubsystems : REQUIRED_TASK_SUBSYSTEMS;
}

function withSeededSubteamTasks(currentTasks: Task[]) {
  const currentTaskIds = new Set(currentTasks.map((task) => task.id));
  const missingSeededTasks = seededTasks.filter((task) => !currentTaskIds.has(task.id));

  return [...currentTasks, ...missingSeededTasks];
}

function parseClientError(error: unknown) {
  const authErrorState = classifyMobileAuthError(error);
  if (authErrorState !== "unknown") {
    return getMobileAuthErrorMessage(authErrorState);
  }

  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Request failed unexpectedly.";
}

function getClientErrorMessage(
  error: unknown,
  context: "auth-config" | "authenticated" | "general" = "general",
) {
  const authErrorState = classifyMobileAuthError(error, context);
  if (authErrorState !== "unknown") {
    return getMobileAuthErrorMessage(authErrorState);
  }

  return parseClientError(error);
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTimeInput(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function taskDependsOnTarget(
  taskId: string,
  targetTaskId: string,
  taskById: Record<string, Task>,
  visitedTaskIds = new Set<string>(),
): boolean {
  if (taskId === targetTaskId) {
    return true;
  }

  if (visitedTaskIds.has(taskId)) {
    return false;
  }

  visitedTaskIds.add(taskId);

  const task = taskById[taskId];
  if (!task) {
    return false;
  }

  return task.dependencyIds.some((dependencyId) =>
    taskDependsOnTarget(dependencyId, targetTaskId, taskById, visitedTaskIds),
  );
}

function getAutoTaskStatus(
  task: Pick<Task, "blockers" | "dependencyIds" | "ownerId" | "status">,
  taskById: Record<string, Task>,
): TaskStatus {
  if (task.status !== "not-started") {
    return task.status;
  }

  const hasOpenDependency = task.dependencyIds
    .map((dependencyId) => taskById[dependencyId])
    .some((dependency) => dependency && dependency.status !== "complete");

  if (task.ownerId && task.blockers.length === 0 && !hasOpenDependency) {
    return "in-progress";
  }

  return task.status;
}

function buildTaskById(tasks: Task[]) {
  return Object.fromEntries(tasks.map((task) => [task.id, task])) as Record<string, Task>;
}

function hasOpenTaskDependency(
  task: Pick<Task, "dependencyIds">,
  taskById: Record<string, Task>,
) {
  return task.dependencyIds
    .map((dependencyId) => taskById[dependencyId])
    .some((dependency) => dependency && dependency.status !== "complete");
}

function isTaskReadyForQaPass(task: Task, taskById: Record<string, Task>) {
  return (
    task.status === "waiting-for-qa" &&
    task.blockers.length === 0 &&
    !hasOpenTaskDependency(task, taskById)
  );
}

function getQaReviewTaskId(review: QaReview) {
  if (review.taskId) {
    return review.taskId;
  }

  return review.subjectType === "task" && review.subjectId ? review.subjectId : null;
}

function buildTaskMutationPayload(task: Task) {
  return {
    title: task.title,
    summary: task.summary,
    subsystemId: task.subsystemId,
    disciplineId: task.disciplineId,
    mechanismId: task.mechanismId,
    partInstanceId: task.partInstanceId,
    targetEventId: task.targetEventId,
    ownerId: task.ownerId,
    mentorId: task.mentorId,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    dependencyIds: task.dependencyIds,
    checklistItems: task.checklistItems ?? [],
    blockers: task.blockers,
    linkedManufacturingIds: task.linkedManufacturingIds,
    linkedPurchaseIds: task.linkedPurchaseIds,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours,
  };
}

function shiftDateByDays(value: string, dayDelta: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

type ServerTask = Task & {
  targetMilestoneId?: string | null;
};

type EmailCodeStartResponse = {
  sentTo?: string;
  expiresInMinutes?: number;
};

function normalizeTaskFromServer(task: ServerTask): Task {
  return {
    ...task,
    targetEventId: task.targetEventId ?? task.targetMilestoneId ?? null,
  };
}

function mapTaskPayloadToServer<T extends { targetEventId?: string | null }>(
  payload: T,
) {
  const { targetEventId, ...serverPayload } = payload;

  return {
    ...serverPayload,
    targetMilestoneId: targetEventId ?? null,
  };
}

function getTaskSubteamForDiscipline(disciplineId: string, fallback: TaskSubteamTab) {
  return (
    TASK_SUBTEAM_OPTIONS.find((option) =>
      TASK_SUBTEAM_DISCIPLINE_IDS[option.value].includes(disciplineId),
    )?.value ?? fallback
  );
}

function mapTaskPriorityToRiskPriority(priority: TaskPriority): RiskPriority {
  if (priority === "critical" || priority === "high") {
    return "high";
  }

  return priority === "low" ? "low" : "medium";
}

function mapMilestoneTypeToEventType(type: string | undefined): EventType {
  switch (type) {
    case "practice":
      return "drive-practice";
    case "competition":
    case "deadline":
    case "internal-review":
    case "demo":
      return type;
    default:
      return "deadline";
  }
}

function mapEventTypeToMilestoneType(type: EventType) {
  return type === "drive-practice" ? "practice" : type;
}

function getPhotoFileName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "No image selected";
  }

  const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed;
  const fileName = withoutQuery.split("/").filter(Boolean).pop();
  return fileName || "Selected image";
}

function normalizeRequiredEmailDomain(domain: string | null | undefined) {
  return domain?.trim().toLowerCase().replace(/^@/, "") || REQUIRED_EMAIL_DOMAIN;
}

function hasRequiredEmailDomain(email: string, requiredDomain: string) {
  const [, domain = ""] = email.split("@");
  const normalizedDomain = domain.toLowerCase();
  return (
    normalizedDomain === requiredDomain ||
    normalizedDomain.endsWith(`.${requiredDomain}`)
  );
}

function buildLocalEmailSessionUser(email: string, hostedDomain: string): SessionUser {
  const [accountName] = email.split("@");
  const accountId = accountName.trim().toLowerCase();
  const name = accountId.replace(/[._-]+/g, " ").trim();

  return {
    accountId: accountId || email,
    authProvider: "email",
    email,
    hostedDomain,
    name: name || email,
    picture: null,
  };
}

function getWorkLogDraftOwnerKey(user: SessionUser | null) {
  return (
    user?.email.trim().toLowerCase() ||
    user?.accountId.trim().toLowerCase() ||
    user?.name.trim().toLowerCase() ||
    null
  );
}

function isWorkLogDraftOwnedBy(
  draft: PendingWorkLogDraft,
  ownerKey: string | null,
) {
  return (draft.ownerKey ?? null) === ownerKey;
}

function mapMilestonesToEvents(payload: PlatformBootstrapPayload): Event[] {
  const subsystems = ensureArray(payload.subsystems);

  return ensureArray(payload.milestones).map((milestone) => ({
    id: milestone.id,
    title: milestone.title,
    type: mapMilestoneTypeToEventType(milestone.type),
    startDateTime: milestone.startDateTime,
    endDateTime: milestone.endDateTime,
    isExternal: milestone.isExternal,
    description: milestone.description,
    relatedSubsystemIds:
      milestone.relatedSubsystemIds ??
      subsystems
        .filter((subsystem) => ensureArray(milestone.projectIds).includes(subsystem.projectId ?? ""))
        .map((subsystem) => subsystem.id),
  }));
}

type MilestoneMutationResponse = {
  item?: BootstrapMilestone;
};

function applyMilestoneSubsystemLinks(
  currentEvents: Event[],
  milestone: BootstrapMilestone | undefined,
  fallbackMilestoneId: string | null,
  relatedSubsystemIds: string[],
) {
  const milestoneId = milestone?.id ?? fallbackMilestoneId;
  if (!milestoneId) {
    return currentEvents;
  }

  return currentEvents.map((event) =>
    event.id === milestoneId ? { ...event, relatedSubsystemIds } : event,
  );
}

export default function App() {
  const { height, width } = useWindowDimensions();
  const systemColorScheme = useColorScheme();
  const responsiveMetrics = useMemo(() => getResponsiveMetrics(width), [width]);
  const isCompactLayout = responsiveMetrics.isCompact;
  const isLandscapeTimelineLayout = width > height;
  const isLandscapeCardLayout = width > height;
  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);

  const [apiToken, setApiToken] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authConfig, setAuthConfig] = useState<PublicAuthConfig | null>(null);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [hasRequestedEmailCode, setHasRequestedEmailCode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorState, setAuthErrorState] =
    useState<MobileAuthErrorState | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGoogleSignInPending, setIsGoogleSignInPending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<
    "connecting" | "connected" | "offline"
  >("connecting");
  const [syncError, setSyncError] = useState<string | null>(null);
  const envGoogleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleClientId = authConfig?.googleClientId?.trim() || envGoogleClientId;
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || googleClientId;
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || googleClientId;
  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || googleClientId;
  const requiredEmailDomain = normalizeRequiredEmailDomain(authConfig?.hostedDomain);
  const isAuthConfigUnavailable = authErrorState === "auth-config-unavailable";
  const activeGoogleClientId =
    Platform.OS === "ios"
      ? googleIosClientId
      : Platform.OS === "android"
        ? googleAndroidClientId
        : googleWebClientId;

  const [googleRequest, googleResponse, promptGoogleSignIn] =
    Google.useIdTokenAuthRequest({
      androidClientId: googleAndroidClientId || GOOGLE_CLIENT_ID_PLACEHOLDER,
      clientId: googleClientId || GOOGLE_CLIENT_ID_PLACEHOLDER,
      iosClientId: googleIosClientId || GOOGLE_CLIENT_ID_PLACEHOLDER,
      selectAccount: true,
      webClientId: googleWebClientId || GOOGLE_CLIENT_ID_PLACEHOLDER,
    });

  const showAuthError = useCallback((message: string) => {
    setAuthErrorState(null);
    setAuthError(message);
    Alert.alert("Sign-in problem", message);
  }, []);

  const endSessionForAuthFailure = useCallback((message: string) => {
    setApiToken(null);
    setSessionUser(null);
    setHasAuthenticated(false);
    setAuthCode("");
    setHasRequestedEmailCode(false);
    setIsGoogleSignInPending(false);
    setIsAuthenticating(false);
    setSyncError(null);
    setAuthNotice(null);
    setAuthErrorState("expired-session");
    setAuthError(message);
    setBackendStatus("connected");
  }, []);

  const [activeTab, setActiveTab] = useState<ViewTab>("home");
  const [taskView, setTaskView] = useState<TaskViewTab>("queue");
  const [activeTaskSubteam, setActiveTaskSubteam] =
    useState<TaskSubteamTab>("programming");
  const [manufacturingView, setManufacturingView] =
    useState<ManufacturingViewTab>("cnc");
  const [inventoryView, setInventoryView] = useState<InventoryViewTab>("purchases");
  const [isNavMenuVisible, setIsNavMenuVisible] = useState(false);
  const [isProjectOverlayVisible, setIsProjectOverlayVisible] = useState(false);
  const [isPersonMenuVisible, setIsPersonMenuVisible] = useState(false);
  const [isSeasonMenuVisible, setIsSeasonMenuVisible] = useState(false);
  const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false);
  const [attendanceStatusByMemberId, setAttendanceStatusByMemberId] =
    useState<Record<string, AttendanceStatus>>(ATTENDANCE_STATUS_BY_MEMBER_ID);
  const [themeOverride, setThemeOverride] = useState<AppThemeName | null>(null);
  const [languageOverride] = useState<LanguageCode | null>(null);
  const [activePersonFilter, setActivePersonFilter] = useState("all");
  const [seasons, setSeasons] = useState<SeasonOption[]>(INITIAL_SEASONS);
  const [activeSeasonId, setActiveSeasonId] = useState(INITIAL_SEASONS[0].id);

  const [members, setMembers] = useState(() => mecoSnapshot.members);
  const [subsystems, setSubsystems] = useState(() => normalizeTaskSubsystems(mecoSnapshot.subsystems));
  const [disciplines, setDisciplines] = useState(() => mecoSnapshot.disciplines);
  const [mechanisms, setMechanisms] = useState(() => mecoSnapshot.mechanisms);
  const [tasks, setTasks] = useState(() => withSeededSubteamTasks(mecoSnapshot.tasks));
  const tasksRef = useRef<Task[]>(tasks);
  const taskByIdRef = useRef<Record<string, Task>>(buildTaskById(tasks));
  const [events, setEvents] = useState(() => mecoSnapshot.events);
  const [workLogs, setWorkLogs] = useState(() => mecoSnapshot.workLogs);
  const workLogsRef = useRef<WorkLog[]>(mecoSnapshot.workLogs);
  const [pendingWorkLogDrafts, setPendingWorkLogDrafts] = useState<
    PendingWorkLogDraft[]
  >([]);
  const pendingWorkLogDraftsRef = useRef<PendingWorkLogDraft[]>([]);
  const isSyncingWorkLogDraftsRef = useRef(false);
  const startTaskRef = useRef<(task: Task) => Promise<void>>(async () => undefined);
  const activeWorkLogDraftOwnerKey = useMemo(
    () => getWorkLogDraftOwnerKey(sessionUser),
    [sessionUser],
  );
  const [manufacturingItems, setManufacturingItems] = useState(
    () => mecoSnapshot.manufacturingItems,
  );
  const [purchaseItems, setPurchaseItems] = useState(() => mecoSnapshot.purchaseItems);
  const [partDefinitions, setPartDefinitions] = useState(
    () => mecoSnapshot.partDefinitions,
  );
  const [partInstances, setPartInstances] = useState(() => mecoSnapshot.partInstances);
  const [qaReviews, setQaReviews] = useState<QaReview[]>(() => mecoSnapshot.qaReviews);
  const [qaRequests, setQaRequests] = useState<QaRequest[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [eventReports, setEventReports] = useState<EventReportDraft[]>([]);
  const systemThemeMode: AppThemeName = systemColorScheme === "dark" ? "dark" : "light";
  const themeMode = themeOverride ?? systemThemeMode;
  const isDarkModeEnabled = themeMode === "dark";
  const themeColors = appThemes[themeMode];
  const seasonModeLabel =
    seasons.find((option) => option.id === activeSeasonId)?.label ?? "No Season";

  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskSubsystemFilter, setTaskSubsystemFilter] = useState("all");
  const [taskOwnerFilter, setTaskOwnerFilter] = useState("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [taskArchiveFilter, setTaskArchiveFilter] =
    useState<ArchiveFilterMode>("active");
  const [taskBlockerFilter, setTaskBlockerFilter] =
    useState<BlockerFilterMode>("all");
  const [timelineSubsystemFilter, setTimelineSubsystemFilter] = useState("all");
  const [timelineMilestoneFilter, setTimelineMilestoneFilter] = useState("all");

  const [milestoneSearch, setMilestoneSearch] = useState("");
  const [milestoneTypeFilter, setMilestoneTypeFilter] = useState("all");
  const [milestoneSortField, setMilestoneSortField] =
    useState<MilestoneSortField>("startDateTime");
  const [milestoneSortOrder, setMilestoneSortOrder] = useState<"asc" | "desc">("asc");

  const [workLogSearch, setWorkLogSearch] = useState("");
  const [workLogSubsystemFilter, setWorkLogSubsystemFilter] = useState("all");
  const [workLogSortMode, setWorkLogSortMode] =
    useState<WorkLogSortMode>("recent");

  const [manufacturingSearch, setManufacturingSearch] = useState("");
  const [manufacturingSubsystemFilter, setManufacturingSubsystemFilter] =
    useState("all");
  const [manufacturingRequesterFilter, setManufacturingRequesterFilter] =
    useState("all");
  const [manufacturingStatusFilter, setManufacturingStatusFilter] =
    useState("all");
  const [manufacturingMaterialFilter, setManufacturingMaterialFilter] =
    useState("all");
  const [manufacturingArchiveFilter, setManufacturingArchiveFilter] =
    useState<ArchiveFilterMode>("active");

  const [materialsSearch, setMaterialsSearch] = useState("");
  const [materialsCategoryFilter, setMaterialsCategoryFilter] = useState("all");
  const [materialsStockFilter, setMaterialsStockFilter] = useState("all");

  const [partsSearch, setPartsSearch] = useState("");
  const [partsSubsystemFilter, setPartsSubsystemFilter] = useState("all");
  const [partsStatusFilter, setPartsStatusFilter] = useState("all");

  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseSubsystemFilter, setPurchaseSubsystemFilter] = useState("all");
  const [purchaseRequesterFilter, setPurchaseRequesterFilter] = useState("all");
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState("all");
  const [purchaseVendorFilter, setPurchaseVendorFilter] = useState("all");
  const [purchaseApprovalFilter, setPurchaseApprovalFilter] = useState("all");
  const [purchaseArchiveFilter, setPurchaseArchiveFilter] =
    useState<ArchiveFilterMode>("active");

  const [subsystemSearch, setSubsystemSearch] = useState("");
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string>(
    subsystems[0]?.id ?? "",
  );

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [taskEditorMode, setTaskEditorMode] = useState<EditorMode | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(buildTaskDraft());
  const [taskEditorError, setTaskEditorError] = useState<string | null>(null);
  const [taskDependencySearch, setTaskDependencySearch] = useState("");

  const [milestoneEditorMode, setMilestoneEditorMode] = useState<EditorMode | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [milestoneDraft, setMilestoneDraft] = useState<MilestoneDraft>(
    buildMilestoneDraft(),
  );
  const [milestoneStartDate, setMilestoneStartDate] = useState("");
  const [milestoneStartTime, setMilestoneStartTime] = useState("18:00");
  const [milestoneEndDate, setMilestoneEndDate] = useState("");
  const [milestoneEndTime, setMilestoneEndTime] = useState("");
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [deadlineEditorVisible, setDeadlineEditorVisible] = useState(false);
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  const [workLogEditorMode, setWorkLogEditorMode] = useState<EditorMode | null>(null);
  const [activeWorkLogId, setActiveWorkLogId] = useState<string | null>(null);
  const [workLogDraft, setWorkLogDraft] = useState<WorkLogDraft>(
    buildWorkLogDraft(),
  );
  const [workLogError, setWorkLogError] = useState<string | null>(null);
  const [workLogTimer, setWorkLogTimer] = useState<WorkLogTimerState | null>(null);
  const workLogTimerRef = useRef<WorkLogTimerState | null>(null);
  const [workLogTimerTick, setWorkLogTimerTick] = useState(Date.now());

  const [manufacturingEditorMode, setManufacturingEditorMode] = useState<EditorMode | null>(
    null,
  );
  const [activeManufacturingId, setActiveManufacturingId] = useState<string | null>(null);
  const [manufacturingDraft, setManufacturingDraft] = useState<ManufacturingDraft>(
    buildManufacturingDraft("cnc"),
  );
  const [manufacturingError, setManufacturingError] = useState<string | null>(null);

  const [purchaseEditorMode, setPurchaseEditorMode] = useState<EditorMode | null>(null);
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft>(buildPurchaseDraft());
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const [memberEditorMode, setMemberEditorMode] = useState<EditorMode | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft>(buildMemberDraft());
  const [memberError, setMemberError] = useState<string | null>(null);

  const [subsystemEditorMode, setSubsystemEditorMode] = useState<EditorMode | null>(null);
  const [activeSubsystemId, setActiveSubsystemId] = useState<string | null>(null);
  const [subsystemDraft, setSubsystemDraft] = useState<SubsystemDraft>(
    buildSubsystemDraft(),
  );
  const [subsystemError, setSubsystemError] = useState<string | null>(null);

  const [partDefinitionEditorMode, setPartDefinitionEditorMode] = useState<EditorMode | null>(
    null,
  );
  const [activePartDefinitionId, setActivePartDefinitionId] = useState<string | null>(null);
  const [partDefinitionDraft, setPartDefinitionDraft] = useState<PartDefinitionDraft>(
    buildPartDefinitionDraft(),
  );
  const [partDefinitionError, setPartDefinitionError] = useState<string | null>(null);
  const [qaReportEditorMode, setQaReportEditorMode] = useState<EditorMode | null>(null);
  const [activeQaRequestId, setActiveQaRequestId] = useState<string | null>(null);
  const [qaReportDraft, setQaReportDraft] = useState<QaReportDraft>({
    taskId: "",
    participantIdsText: "",
    result: "pass",
    mentorApproved: false,
    notes: "",
    evidenceNotes: "",
    followUpTaskTitle: "",
  });
  const [qaReportError, setQaReportError] = useState<string | null>(null);
  const [eventReportEditorMode, setEventReportEditorMode] = useState<EditorMode | null>(null);
  const [eventReportDraft, setEventReportDraft] = useState<EventReportDraft>({
    eventId: "",
    summary: "",
    findingText: "",
    followUpTaskTitle: "",
  });
  const [eventReportError, setEventReportError] = useState<string | null>(null);

  const persistPendingWorkLogDrafts = useCallback(
    async (drafts: PendingWorkLogDraft[]) => {
      pendingWorkLogDraftsRef.current = drafts;
      setPendingWorkLogDrafts(drafts);
      await savePendingWorkLogDrafts(drafts);
    },
    [],
  );

  const applyBootstrapPayload = useCallback((payload: PlatformBootstrapPayload) => {
    const events = ensureArray(payload.events);
    const tasks = ensureArray(payload.tasks).map((task) =>
      normalizeTaskFromServer(task as ServerTask),
    );
    const payloadWorkLogs = ensureArray(payload.workLogs);

    setMembers(ensureArray(payload.members));
    setSubsystems(normalizeTaskSubsystems(ensureArray(payload.subsystems)));
    setDisciplines(ensureArray(payload.disciplines));
    setMechanisms(ensureArray(payload.mechanisms));
    tasksRef.current = tasks;
    taskByIdRef.current = buildTaskById(tasks);
    setTasks(tasks);
    setEvents(events.length > 0 ? events : mapMilestonesToEvents(payload));
    workLogsRef.current = payloadWorkLogs;
    setWorkLogs(payloadWorkLogs);
    setManufacturingItems(ensureArray(payload.manufacturingItems));
    setPurchaseItems(ensureArray(payload.purchaseItems));
    setQaRequests(ensureArray(payload.qaRequests));
    setHelpRequests(ensureArray(payload.helpRequests));
    setPartDefinitions(ensureArray(payload.partDefinitions));
    setPartInstances(ensureArray(payload.partInstances));
  }, []);

  const refreshWorkspaceFromServer = useCallback(
    async (token: string | null) => {
      const payload = await requestJson<PlatformBootstrapPayload>(
        apiBaseUrl,
        "/api/bootstrap",
        undefined,
        token,
      );
      applyBootstrapPayload(payload);
      return payload;
    },
    [apiBaseUrl, applyBootstrapPayload],
  );

  const syncPendingWorkLogDrafts = useCallback(
    async (
      token: string | null,
      serverWorkLogs: WorkLog[] = workLogsRef.current,
      ownerKey: string | null = getWorkLogDraftOwnerKey(sessionUser),
    ) => {
      if (isSyncingWorkLogDraftsRef.current) {
        return null;
      }

      isSyncingWorkLogDraftsRef.current = true;

      try {
        let drafts = reconcilePendingWorkLogDrafts(
          pendingWorkLogDraftsRef.current,
          serverWorkLogs,
          ownerKey,
        );

        if (drafts.length !== pendingWorkLogDraftsRef.current.length) {
          await persistPendingWorkLogDrafts(drafts);
        }

        let didSyncDraft = false;
        let draftSyncError: string | null = null;
        for (const draft of drafts.filter((draft) => isWorkLogDraftOwnedBy(draft, ownerKey))) {
          drafts = markPendingWorkLogDraftSyncing(drafts, draft.id);
          await persistPendingWorkLogDrafts(drafts);

          try {
            await requestJson<WorkLogMutationResponse>(
              apiBaseUrl,
              "/api/work-logs",
              {
                method: "POST",
                body: JSON.stringify(draft.payload),
              },
              token,
            );

            drafts = removePendingWorkLogDraft(drafts, draft.id);
            didSyncDraft = true;
            await persistPendingWorkLogDrafts(drafts);

            const loggedTask = tasksRef.current.find(
              (task) => task.id === draft.payload.taskId,
            );
            if (loggedTask) {
              await startTaskRef.current(loggedTask);
            }
          } catch (error) {
            if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
              throw error;
            }

            const message = getClientErrorMessage(error);
            drafts = markPendingWorkLogDraftFailed(drafts, draft.id, message);
            await persistPendingWorkLogDrafts(drafts);
            draftSyncError = draftSyncError ?? message;
          }
        }

        if (drafts.length !== pendingWorkLogDraftsRef.current.length) {
          await persistPendingWorkLogDrafts(drafts);
        }

        if (!didSyncDraft && pendingWorkLogDraftsRef.current.length === 0) {
          return null;
        }

        try {
          const payload = await refreshWorkspaceFromServer(token);
          const reconciledDrafts = reconcilePendingWorkLogDrafts(
            pendingWorkLogDraftsRef.current,
            ensureArray(payload.workLogs),
            ownerKey,
          );
          await persistPendingWorkLogDrafts(reconciledDrafts);
          return draftSyncError;
        } catch (error) {
          if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
            throw error;
          }

          return getClientErrorMessage(error);
        }
      } finally {
        isSyncingWorkLogDraftsRef.current = false;
      }
    },
    [apiBaseUrl, persistPendingWorkLogDrafts, refreshWorkspaceFromServer, sessionUser],
  );

  useEffect(() => {
    tasksRef.current = tasks;
    taskByIdRef.current = buildTaskById(tasks);
  }, [tasks]);

  useEffect(() => {
    let isActive = true;

    void loadPendingWorkLogDrafts().then((drafts) => {
      if (!isActive) {
        return;
      }

      const reconciledDrafts = reconcilePendingWorkLogDrafts(
        drafts,
        workLogsRef.current,
      );
      pendingWorkLogDraftsRef.current = reconciledDrafts;
      setPendingWorkLogDrafts(reconciledDrafts);

      if (reconciledDrafts.length !== drafts.length) {
        void savePendingWorkLogDrafts(reconciledDrafts);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const loadPublicAuthConfig = useCallback(async () => {
    setBackendStatus("connecting");
    setSyncError(null);

    try {
      const config = await requestJson<PublicAuthConfig>(
        apiBaseUrl,
        "/api/auth/config",
      );
      setAuthConfig(config);
      setAuthErrorState(null);
      setAuthError(null);
      setBackendStatus("connected");
      return config;
    } catch (error) {
      const message = getClientErrorMessage(error, "auth-config");
      setBackendStatus("offline");
      setAuthConfig({
        enabled: false,
        googleClientId: null,
        hostedDomain: "mecorobotics.org",
        emailEnabled: true,
        devBypassAvailable: false,
      });
      setAuthErrorState("auth-config-unavailable");
      setAuthError(message);
      setSyncError(message);
      return null;
    }
  }, [apiBaseUrl]);

  const finishSignIn = useCallback(
    async (token: string | null, user: SessionUser) => {
      setApiToken(token);
      setSessionUser(user);
      setHasAuthenticated(true);
      setIsSyncing(true);
      setSyncError(null);

      try {
        const payload = await refreshWorkspaceFromServer(token);
        const draftSyncError = await syncPendingWorkLogDrafts(
          token,
          ensureArray(payload.workLogs),
          getWorkLogDraftOwnerKey(user),
        );
        setBackendStatus(draftSyncError ? "offline" : "connected");
        setSyncError(draftSyncError);
      } catch (error) {
        setBackendStatus("offline");
        setSyncError(parseClientError(error));
      } finally {
        setIsSyncing(false);
      }
    },
    [refreshWorkspaceFromServer, syncPendingWorkLogDrafts],
  );

  const signInWithGoogle = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthErrorState(null);
    setAuthNotice(null);

    try {
      if (isAuthConfigUnavailable) {
        setAuthErrorState("auth-config-unavailable");
        setAuthError(getMobileAuthErrorMessage("auth-config-unavailable"));
        return;
      }

      if (!activeGoogleClientId) {
        if (!authConfig?.devBypassAvailable) {
          showAuthError(
            Platform.OS === "ios"
              ? "Google sign-in needs a configured Google client ID, then Expo must be restarted."
              : Platform.OS === "android"
                ? "Google sign-in needs a configured Google client ID, then Expo must be restarted."
                : "Google sign-in is not configured for this app yet.",
          );
          return;
        }

        const session = await requestJson<SessionResponse>(
          apiBaseUrl,
          "/api/auth/dev-bypass",
          { method: "POST" },
        );
        await finishSignIn(session.token, session.user);
        return;
      }

      if (!googleRequest) {
        showAuthError("Google sign-in is still loading. Try again in a moment.");
        return;
      }

      setIsGoogleSignInPending(true);
      const result = await promptGoogleSignIn();
      if (result.type === "cancel" || result.type === "dismiss") {
        setIsGoogleSignInPending(false);
        return;
      }

      if (result.type !== "success") {
        setIsGoogleSignInPending(false);
        showAuthError("Google sign-in did not complete.");
      }
    } catch (error) {
      setIsGoogleSignInPending(false);
      showAuthError(getClientErrorMessage(error));
    } finally {
      setIsAuthenticating(false);
    }
  }, [
    apiBaseUrl,
    activeGoogleClientId,
    authConfig?.devBypassAvailable,
    finishSignIn,
    googleRequest,
    isAuthConfigUnavailable,
    promptGoogleSignIn,
    showAuthError,
  ]);

  useEffect(() => {
    if (!isGoogleSignInPending || hasAuthenticated || googleResponse?.type !== "success") {
      return;
    }

    const credential =
      googleResponse.params.id_token ?? googleResponse.authentication?.idToken;
    const hasAuthorizationCode = Boolean(googleResponse.params.code);

    let isActive = true;

    async function exchangeGoogleCredential() {
      if (!credential) {
        setIsGoogleSignInPending(false);
        showAuthError(
          hasAuthorizationCode
            ? "Google returned an authorization code instead of an ID token. This app needs an ID token to sign in."
            : "Google did not return an ID token.",
        );
        return;
      }

      setIsAuthenticating(true);
      setAuthError(null);
      setAuthErrorState(null);
      setAuthNotice(null);

      try {
        const session = await requestJson<SessionResponse>(
          apiBaseUrl,
          "/api/auth/google",
          {
            method: "POST",
            body: JSON.stringify({ credential }),
          },
        );

        if (isActive) {
          await finishSignIn(session.token, session.user);
        }
      } catch (error) {
        if (isActive) {
          showAuthError(getClientErrorMessage(error));
        }
      } finally {
        if (isActive) {
          setIsGoogleSignInPending(false);
          setIsAuthenticating(false);
        }
      }
    }

    void exchangeGoogleCredential();

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, finishSignIn, googleResponse, hasAuthenticated, isGoogleSignInPending, showAuthError]);

  const signInWithEmail = useCallback(async () => {
    const email = authEmail.trim().toLowerCase();
    const code = authCode.trim();

    setAuthError(null);
    setAuthErrorState(null);
    setAuthNotice(null);

    let currentAuthConfig = authConfig;
    if (isAuthConfigUnavailable) {
      setIsAuthenticating(true);
      try {
        currentAuthConfig = await loadPublicAuthConfig();
      } finally {
        setIsAuthenticating(false);
      }

      if (!currentAuthConfig) {
        return;
      }
    }

    if (currentAuthConfig?.emailEnabled === false) {
      setAuthError("Email sign-in is not enabled for this workspace.");
      return;
    }

    if (!email || !hasRequiredEmailDomain(email, requiredEmailDomain)) {
      setAuthError(`Use an @${requiredEmailDomain} email.`);
      return;
    }

    if (hasRequestedEmailCode && !code) {
      setAuthError("Enter the code from your email.");
      return;
    }

    setIsAuthenticating(true);

    try {
      if (hasRequestedEmailCode) {
        const session = await requestJson<SessionResponse>(
          apiBaseUrl,
          "/api/auth/email/verify",
          {
            method: "POST",
            body: JSON.stringify({ email, code }),
          },
        );
        setAuthCode("");
        await finishSignIn(session.token, session.user);
        return;
      }

      if (currentAuthConfig?.devBypassAvailable) {
        const session = await requestJson<SessionResponse>(
          apiBaseUrl,
          "/api/auth/dev-bypass",
          { method: "POST" },
        );
        await finishSignIn(session.token, {
          ...session.user,
          authProvider: "email",
          email,
        });
        return;
      }

      if (currentAuthConfig?.enabled === false) {
        await finishSignIn(null, buildLocalEmailSessionUser(email, requiredEmailDomain));
        setAuthNotice(
          "Authentication service is unavailable. Continuing with a local session.",
        );
        return;
      }

      const response = await requestJson<EmailCodeStartResponse>(
        apiBaseUrl,
        "/api/auth/email/start",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
      setHasRequestedEmailCode(true);
      setAuthNotice(
        response.expiresInMinutes
          ? `Code sent to ${response.sentTo ?? email}. It expires in ${response.expiresInMinutes} minutes.`
          : `Code sent to ${response.sentTo ?? email}.`,
      );
    } catch (error) {
      setAuthError(getClientErrorMessage(error));
    } finally {
      setIsAuthenticating(false);
    }
  }, [
    apiBaseUrl,
    authConfig,
    authCode,
    authEmail,
    finishSignIn,
    hasRequestedEmailCode,
    isAuthConfigUnavailable,
    loadPublicAuthConfig,
    requiredEmailDomain,
  ]);

  const syncFromBackend = useCallback(async () => {
    setIsSyncing(true);
    setBackendStatus("connecting");
    setSyncError(null);

    try {
      const authConfig = await requestJson<PublicAuthConfig>(
        apiBaseUrl,
        "/api/auth/config",
      );

      let token = process.env.EXPO_PUBLIC_API_TOKEN?.trim() ?? "";
      token = token.length > 0 ? token : "";
      let syncSessionUser = sessionUser;

      if (!token && authConfig.devBypassAvailable) {
        const session = await requestJson<SessionResponse>(
          apiBaseUrl,
          "/api/auth/dev-bypass",
          { method: "POST" },
        );
        token = session.token;
        syncSessionUser = session.user;
        setSessionUser(session.user);
      }

      const resolvedToken = token || null;
      setApiToken(resolvedToken);
      const payload = await refreshWorkspaceFromServer(resolvedToken);
      const draftSyncError = await syncPendingWorkLogDrafts(
        resolvedToken,
        ensureArray(payload.workLogs),
        getWorkLogDraftOwnerKey(syncSessionUser),
      );
      setBackendStatus(draftSyncError ? "offline" : "connected");
      setSyncError(draftSyncError);
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      setBackendStatus("offline");
      setSyncError(getClientErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }, [
    apiBaseUrl,
    endSessionForAuthFailure,
    refreshWorkspaceFromServer,
    sessionUser,
    syncPendingWorkLogDrafts,
  ]);

  const runMutation = useCallback(
    async (path: string, init: RequestInit) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        await requestJson(apiBaseUrl, path, init, apiToken);
        const payload = await refreshWorkspaceFromServer(apiToken);
        const draftSyncError = await syncPendingWorkLogDrafts(
          apiToken,
          ensureArray(payload.workLogs),
          activeWorkLogDraftOwnerKey,
        );
        setBackendStatus(draftSyncError ? "offline" : "connected");
        setSyncError(draftSyncError);
        return true;
      } catch (error) {
        if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
          endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
          return false;
        }

        setBackendStatus("offline");
        setSyncError(getClientErrorMessage(error));
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [
      apiBaseUrl,
      apiToken,
      activeWorkLogDraftOwnerKey,
      endSessionForAuthFailure,
      refreshWorkspaceFromServer,
      syncPendingWorkLogDrafts,
    ],
  );

  const membersById = useMemo(() => {
    return Object.fromEntries(
      members.map((member) => [member.id, member]),
    ) as Record<string, (typeof members)[number]>;
  }, [members]);
  const sessionMember = useMemo(() => {
    const sessionName = sessionUser?.name.trim().toLowerCase();
    const sessionEmail = sessionUser?.email.trim().toLowerCase();
    const sessionAccount = sessionUser?.accountId.trim().toLowerCase();
    return members.find((member) => {
      return (
        member.id.toLowerCase() === sessionAccount ||
        member.name.trim().toLowerCase() === sessionName ||
        member.email?.trim().toLowerCase() === sessionEmail
      );
    }) ?? null;
  }, [members, sessionUser]);

  const signedInMember = useMemo(() => {
    if (sessionMember) {
      return sessionMember;
    }

    return members[0] ?? null;
  }, [members, sessionMember]);
  const canUseSignedInMemberRoleFallback =
    sessionMember !== null && signedInMember?.id === sessionMember.id;
  const canMentorApprove =
    sessionUser?.role === "mentor" ||
    sessionUser?.role === "admin" ||
    (canUseSignedInMemberRoleFallback &&
      (signedInMember?.role === "mentor" || signedInMember?.role === "admin"));
  const signedInEmailInitial =
    sessionUser?.email.trim().charAt(0).toUpperCase() || "M";
  const visiblePendingWorkLogDrafts = useMemo(
    () =>
      pendingWorkLogDrafts.filter((draft) =>
        isWorkLogDraftOwnedBy(draft, activeWorkLogDraftOwnerKey),
      ),
    [activeWorkLogDraftOwnerKey, pendingWorkLogDrafts],
  );

  const subsystemsById = useMemo(() => {
    return Object.fromEntries(
      subsystems.map((subsystem) => [subsystem.id, subsystem]),
    ) as Record<string, (typeof subsystems)[number]>;
  }, [subsystems]);
  const taskSubsystemOptions = useMemo(() => buildSubsystemOptions(subsystems), [subsystems]);

  const disciplinesById = useMemo(() => {
    return Object.fromEntries(
      disciplines.map((discipline) => [discipline.id, discipline]),
    ) as Record<string, (typeof disciplines)[number]>;
  }, [disciplines]);

  const mechanismsById = useMemo(() => {
    return Object.fromEntries(
      mechanisms.map((mechanism) => [mechanism.id, mechanism]),
    ) as Record<string, (typeof mechanisms)[number]>;
  }, [mechanisms]);

  const partDefinitionsById = useMemo(() => {
    return Object.fromEntries(
      partDefinitions.map((partDefinition) => [partDefinition.id, partDefinition]),
    ) as Record<string, (typeof partDefinitions)[number]>;
  }, [partDefinitions]);

  const partInstancesById = useMemo(() => {
    return Object.fromEntries(
      partInstances.map((partInstance) => [partInstance.id, partInstance]),
    ) as Record<string, (typeof partInstances)[number]>;
  }, [partInstances]);

  const eventsById = useMemo(() => {
    return Object.fromEntries(
      events.map((event) => [event.id, event]),
    ) as Record<string, (typeof events)[number]>;
  }, [events]);

  const taskById = useMemo(() => {
    return buildTaskById(tasks);
  }, [tasks]);
  const workLogsForDisplay = useMemo<WorkLogListItem[]>(() => {
    const serverFingerprints = new Set(
      workLogs.map((workLog) => buildWorkLogDraftFingerprint(workLog)),
    );
    const localDraftRows = visiblePendingWorkLogDrafts
      .filter(
        (draft) =>
          draft.attemptCount === 0 || !serverFingerprints.has(draft.fingerprint),
      )
      .map(mapPendingWorkLogDraftToWorkLog);

    return [...localDraftRows, ...workLogs];
  }, [visiblePendingWorkLogDrafts, workLogs]);
  const failedWorkLogDraftCount = useMemo(
    () => visiblePendingWorkLogDrafts.filter((draft) => draft.status === "failed").length,
    [visiblePendingWorkLogDrafts],
  );
  const activeTaskSubteamTasks = useMemo(() => {
    const disciplineIds = TASK_SUBTEAM_DISCIPLINE_IDS[activeTaskSubteam];

    return tasks.filter((task) => disciplineIds.includes(task.disciplineId));
  }, [activeTaskSubteam, tasks]);
  const activeTaskSubteamLabel =
    TASK_SUBTEAM_OPTIONS.find((option) => option.value === activeTaskSubteam)?.label ??
    "Programming";
  const selectedTaskDependencyIds = useMemo(() => {
    return splitList(taskDraft.dependencyIdsText)
      .filter((dependencyId) => taskById[dependencyId])
      .filter((dependencyId) => dependencyId !== activeTaskId);
  }, [activeTaskId, taskById, taskDraft.dependencyIdsText]);
  const selectedTaskDependencies = useMemo(() => {
    return selectedTaskDependencyIds
      .map((dependencyId) => taskById[dependencyId])
      .filter((task): task is Task => Boolean(task));
  }, [selectedTaskDependencyIds, taskById]);
  const openTaskDependencies = useMemo(() => {
    return selectedTaskDependencies.filter((dependency) => dependency.status !== "complete");
  }, [selectedTaskDependencies]);
  const taskDependencyReadinessMessage = useMemo(() => {
    if (openTaskDependencies.length === 0) {
      return null;
    }

    const dependencyNames = openTaskDependencies
      .map((dependency) => `${dependency.title} (${STATUS_LABELS[dependency.status]})`)
      .join(", ");

    if (taskDraft.status === "complete") {
      return `This task is marked complete but still depends on: ${dependencyNames}.`;
    }

    if (taskDraft.status === "waiting-for-qa") {
      return `This task is waiting for QA with unfinished dependencies: ${dependencyNames}.`;
    }

    return `This task is not ready until these dependencies finish: ${dependencyNames}.`;
  }, [openTaskDependencies, taskDraft.status]);
  const downstreamTaskDependencies = useMemo(() => {
    if (!activeTaskId) {
      return [];
    }

    return tasks
      .filter((task) => task.id !== activeTaskId)
      .filter((task) => task.dependencyIds.includes(activeTaskId))
      .sort(
        (firstTask, secondTask) =>
          firstTask.dueDate.localeCompare(secondTask.dueDate) ||
          firstTask.title.localeCompare(secondTask.title),
      )
      .slice(0, 6);
  }, [activeTaskId, tasks]);
  const availableTaskDependencyOptions = useMemo(() => {
    const selectedIds = new Set(selectedTaskDependencyIds);
    const search = taskDependencySearch.trim().toLowerCase();

    return tasks
      .filter((task) => task.id !== activeTaskId)
      .filter((task) => !selectedIds.has(task.id))
      .filter(
        (task) => !activeTaskId || !taskDependsOnTarget(task.id, activeTaskId, taskById),
      )
      .filter((task) => {
        if (!search) {
          return true;
        }

        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "";
        const ownerName = task.ownerId ? (membersById[task.ownerId]?.name ?? "") : "";

        return [
          task.id,
          task.title,
          task.summary,
          STATUS_LABELS[task.status],
          subsystemName,
          ownerName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((firstTask, secondTask) => {
        const firstSubsystemScore = firstTask.subsystemId === taskDraft.subsystemId ? 0 : 1;
        const secondSubsystemScore = secondTask.subsystemId === taskDraft.subsystemId ? 0 : 1;
        const firstDisciplineScore = firstTask.disciplineId === taskDraft.disciplineId ? 0 : 1;
        const secondDisciplineScore = secondTask.disciplineId === taskDraft.disciplineId ? 0 : 1;

        return (
          firstSubsystemScore - secondSubsystemScore ||
          firstDisciplineScore - secondDisciplineScore ||
          firstTask.dueDate.localeCompare(secondTask.dueDate) ||
          firstTask.title.localeCompare(secondTask.title)
        );
      })
      .slice(0, search ? 20 : 10);
  }, [
    activeTaskId,
    membersById,
    selectedTaskDependencyIds,
    subsystemsById,
    taskById,
    taskDependencySearch,
    taskDraft.disciplineId,
    taskDraft.subsystemId,
    tasks,
  ]);

  const navigationItems = useMemo<NavItem[]>(() => {
    const homeCount = tasks.filter((task) => task.status !== "complete").length;

    return [
      {
        key: "home",
        label: "Home",
        shortLabel: "HM",
        count: homeCount,
      },
      {
        key: "attendance",
        label: "Attendance",
        shortLabel: "AT",
        count: members.length,
      },
      {
        key: "tasks",
        label: "Tasks",
        shortLabel: "TS",
        count: tasks.length,
      },
      {
        key: "worklogs",
        label: "Logs",
        shortLabel: "WL",
        count: workLogsForDisplay.length,
      },
      {
        key: "inventory",
        label: "Inventory",
        shortLabel: "IN",
        count: partDefinitions.length + purchaseItems.length,
      },
      {
        key: "reports",
        label: "QA",
        shortLabel: "QA",
        count: helpRequests.length + qaRequests.length + qaReviews.length + eventReports.length,
      },
      {
        key: "roster",
        label: "Directory",
        shortLabel: "DR",
        count: members.length,
      },
      {
        key: "risks",
        label: "Risks",
        shortLabel: "RK",
        count: subsystems.reduce((sum, subsystem) => sum + subsystem.risks.length, 0),
      },
    ];
  }, [
    tasks,
    workLogsForDisplay.length,
    partDefinitions,
    purchaseItems,
    subsystems,
    members,
    helpRequests.length,
    qaRequests.length,
    qaReviews,
    eventReports,
  ]);

  const navigationSections = useMemo(
    () => [
      {
        title: "Dashboard",
        items: navigationItems.filter((item) =>
          item.key === "home" || item.key === "attendance",
        ),
      },
      {
        title: "Work",
        items: navigationItems.filter((item) =>
          item.key === "tasks" ||
          item.key === "worklogs" ||
          item.key === "inventory" ||
          item.key === "reports" ||
          item.key === "risks",
        ),
      },
      {
        title: "Config",
        items: navigationItems.filter((item) => item.key === "roster"),
      },
    ],
    [navigationItems],
  );

  const taskLoggedHoursById = useMemo(() => {
    return workLogsForDisplay.reduce<Record<string, number>>((hoursByTaskId, workLog) => {
      hoursByTaskId[workLog.taskId] = (hoursByTaskId[workLog.taskId] ?? 0) + workLog.hours;
      return hoursByTaskId;
    }, {});
  }, [workLogsForDisplay]);

  const filteredTaskQueue = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();

    return [...activeTaskSubteamTasks]
      .filter((task) => {
        if (
          activePersonFilter !== "all" &&
          task.ownerId !== activePersonFilter &&
          task.mentorId !== activePersonFilter
        ) {
          return false;
        }

        if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) {
          return false;
        }

        if (taskArchiveFilter === "active" && task.status === "complete") {
          return false;
        }

        if (taskArchiveFilter === "archived" && task.status !== "complete") {
          return false;
        }

        if (taskBlockerFilter === "blocked" && task.blockers.length === 0) {
          return false;
        }

        if (taskBlockerFilter === "clear" && task.blockers.length > 0) {
          return false;
        }

        if (taskBlockerFilter === "over-estimate") {
          const loggedHours = taskLoggedHoursById[task.id] ?? task.actualHours;
          if (task.estimatedHours <= 0 || loggedHours <= task.estimatedHours) {
            return false;
          }
        }

        if (
          taskBlockerFilter === "overdue" &&
          (task.status === "complete" || task.dueDate >= localTodayDate())
        ) {
          return false;
        }

        if (taskBlockerFilter === "due-soon") {
          const today = localTodayDate();
          const soonDate = shiftDateByDays(today, 7);

          if (task.status === "complete" || task.dueDate < today || task.dueDate > soonDate) {
            return false;
          }
        }

        if (taskBlockerFilter === "dependency-wait") {
          const hasOpenDependency = task.dependencyIds
            .map((dependencyId) => taskById[dependencyId])
            .some((dependency) => dependency && dependency.status !== "complete");

          if (!hasOpenDependency) {
            return false;
          }
        }

        if (taskBlockerFilter === "ready-now") {
          const hasOpenDependency = task.dependencyIds
            .map((dependencyId) => taskById[dependencyId])
            .some((dependency) => dependency && dependency.status !== "complete");

          if (
            task.status === "complete" ||
            task.status === "waiting-for-qa" ||
            task.blockers.length > 0 ||
            hasOpenDependency ||
            !task.ownerId
          ) {
            return false;
          }
        }

        if (taskBlockerFilter === "ready-to-qa") {
          const hasOpenDependency = task.dependencyIds
            .map((dependencyId) => taskById[dependencyId])
            .some((dependency) => dependency && dependency.status !== "complete");

          if (
            task.status !== "waiting-for-qa" ||
            task.blockers.length > 0 ||
            hasOpenDependency
          ) {
            return false;
          }
        }

        if (taskBlockerFilter === "needs-fabrication" && task.linkedManufacturingIds.length === 0) {
          return false;
        }

        if (taskBlockerFilter === "needs-purchase" && task.linkedPurchaseIds.length === 0) {
          return false;
        }

        if (taskBlockerFilter === "unassigned" && task.ownerId) {
          return false;
        }

        if (taskSubsystemFilter !== "all" && task.subsystemId !== taskSubsystemFilter) {
          return false;
        }

        if (taskOwnerFilter !== "all" && task.ownerId !== taskOwnerFilter) {
          return false;
        }

        if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) {
          return false;
        }

        if (!search) {
          return true;
        }

        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "";
        const ownerName = task.ownerId ? (membersById[task.ownerId]?.name ?? "") : "";
        const mechanismName = task.mechanismId ? (mechanismsById[task.mechanismId]?.name ?? "") : "";

        return `${task.title} ${task.summary} ${subsystemName} ${ownerName} ${mechanismName}`
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [
    activeTaskSubteamTasks,
    activePersonFilter,
    membersById,
    mechanismsById,
    subsystemsById,
    taskOwnerFilter,
    taskPriorityFilter,
    taskArchiveFilter,
    taskBlockerFilter,
    taskLoggedHoursById,
    taskById,
    taskSearch,
    taskStatusFilter,
    taskSubsystemFilter,
  ]);

  const taskSummary = useMemo(() => {
    const blocked = filteredTaskQueue.filter((task) => task.blockers.length > 0).length;
    const waiting = filteredTaskQueue.filter(
      (task) => task.status === "waiting-for-qa",
    ).length;
    const complete = filteredTaskQueue.filter((task) => task.status === "complete").length;
    const loggedHours = filteredTaskQueue.reduce(
      (sum, task) => sum + (taskLoggedHoursById[task.id] ?? task.actualHours),
      0,
    );
    const overEstimate = filteredTaskQueue.filter((task) => {
      const taskLoggedHours = taskLoggedHoursById[task.id] ?? task.actualHours;
      return task.estimatedHours > 0 && taskLoggedHours > task.estimatedHours;
    }).length;
    const readyNow = filteredTaskQueue.filter((task) => {
      const hasOpenDependency = task.dependencyIds
        .map((dependencyId) => taskById[dependencyId])
        .some((dependency) => dependency && dependency.status !== "complete");

      return (
        task.status !== "complete" &&
        task.status !== "waiting-for-qa" &&
        task.blockers.length === 0 &&
        !hasOpenDependency &&
        Boolean(task.ownerId)
      );
    }).length;
    const readyForQa = filteredTaskQueue.filter((task) => {
      const hasOpenDependency = task.dependencyIds
        .map((dependencyId) => taskById[dependencyId])
        .some((dependency) => dependency && dependency.status !== "complete");

      return (
        task.status === "waiting-for-qa" &&
        task.blockers.length === 0 &&
        !hasOpenDependency
      );
    }).length;

    return [
      { label: "Visible tasks", value: String(filteredTaskQueue.length) },
      { label: "Ready now", value: String(readyNow) },
      { label: "Ready QA", value: String(readyForQa) },
      { label: "Blocked", value: String(blocked) },
      { label: "Waiting QA", value: String(waiting) },
      { label: "Logged", value: `${loggedHours.toFixed(1)}h` },
      { label: "Over est.", value: String(overEstimate) },
      { label: "Complete", value: String(complete) },
    ] satisfies SummaryChipData[];
  }, [filteredTaskQueue, taskById, taskLoggedHoursById]);

  const filteredMilestones = useMemo(() => {
    const search = milestoneSearch.trim().toLowerCase();

    return [...events]
      .filter((event) =>
        milestoneTypeFilter === "all" ? true : event.type === milestoneTypeFilter,
      )
      .filter((event) => {
        if (!search) {
          return true;
        }

        const relatedSubsystemNames = event.relatedSubsystemIds
          .map((subsystemId) => subsystemsById[subsystemId]?.name ?? "")
          .join(" ")
          .toLowerCase();

        return (
          event.title.toLowerCase().includes(search) ||
          event.description.toLowerCase().includes(search) ||
          relatedSubsystemNames.includes(search)
        );
      })
      .sort((left, right) => {
        const leftValue =
          milestoneSortField === "title"
            ? left.title.toLowerCase()
            : milestoneSortField === "type"
              ? EVENT_TYPE_STYLES[left.type].label
              : left.startDateTime;
        const rightValue =
          milestoneSortField === "title"
            ? right.title.toLowerCase()
            : milestoneSortField === "type"
              ? EVENT_TYPE_STYLES[right.type].label
              : right.startDateTime;

        if (leftValue < rightValue) {
          return milestoneSortOrder === "asc" ? -1 : 1;
        }

        if (leftValue > rightValue) {
          return milestoneSortOrder === "asc" ? 1 : -1;
        }

        return 0;
      });
  }, [
    events,
    milestoneSearch,
    milestoneSortField,
    milestoneSortOrder,
    milestoneTypeFilter,
    subsystemsById,
  ]);

  const milestoneSummary = useMemo(() => {
    const externalCount = filteredMilestones.filter((milestone) => milestone.isExternal).length;

    return [
      { label: "Milestones", value: String(filteredMilestones.length) },
      { label: "External", value: String(externalCount) },
    ] satisfies SummaryChipData[];
  }, [filteredMilestones]);

  const eventOptions = useMemo(() => {
    return events.map((event) => ({
      id: event.id,
      name: `${event.title} (${formatDateTime(event.startDateTime)})`,
    }));
  }, [events]);

  const timelineTasks = useMemo(() => {
    return [...activeTaskSubteamTasks]
      .filter((task) => {
        if (activePersonFilter === "all") {
          return true;
        }

        return task.ownerId === activePersonFilter || task.mentorId === activePersonFilter;
      })
      .filter((task) =>
        timelineSubsystemFilter === "all" ? true : task.subsystemId === timelineSubsystemFilter,
      )
      .filter((task) =>
        timelineMilestoneFilter === "all" ? true : task.targetEventId === timelineMilestoneFilter,
      )
      .filter((task) => taskArchiveFilter === "all" || task.status !== "complete")
      .sort((left, right) =>
      left.dueDate.localeCompare(right.dueDate),
    );
  }, [activeTaskSubteamTasks, activePersonFilter, taskArchiveFilter, timelineMilestoneFilter, timelineSubsystemFilter]);

  const filteredWorkLogs = useMemo(() => {
    const search = workLogSearch.trim().toLowerCase();

    const filtered = workLogsForDisplay.filter((workLog) => {
      const task = taskById[workLog.taskId];

      if (
        activePersonFilter !== "all" &&
        !workLog.participantIds.includes(activePersonFilter)
      ) {
        return false;
      }

      if (workLogSubsystemFilter !== "all" && task?.subsystemId !== workLogSubsystemFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const participantNames = workLog.participantIds
        .map((participantId) => membersById[participantId]?.name ?? "")
        .join(" ");
      const taskText = `${task?.title ?? ""} ${task?.summary ?? ""}`;
      const subsystemText = task ? (subsystemsById[task.subsystemId]?.name ?? "") : "";

      return `${workLog.notes} ${taskText} ${participantNames} ${subsystemText}`
        .toLowerCase()
        .includes(search);
    });

    return filtered.sort((left, right) => {
      if (workLogSortMode === "oldest") {
        return left.date.localeCompare(right.date);
      }

      if (workLogSortMode === "longest") {
        return right.hours - left.hours || right.date.localeCompare(left.date);
      }

      if (workLogSortMode === "shortest") {
        return left.hours - right.hours || right.date.localeCompare(left.date);
      }

      return right.date.localeCompare(left.date);
    });
  }, [
    activePersonFilter,
    membersById,
    subsystemsById,
    taskById,
    workLogsForDisplay,
    workLogSearch,
    workLogSortMode,
    workLogSubsystemFilter,
  ]);

  const workLogSummary = useMemo(() => {
    const participantIds = new Set<string>();
    const taskIds = new Set<string>();
    const totalHours = filteredWorkLogs.reduce((sum, workLog) => {
      taskIds.add(workLog.taskId);
      workLog.participantIds.forEach((participantId) => participantIds.add(participantId));
      return sum + workLog.hours;
    }, 0);

    const summary: SummaryChipData[] = [
      { label: "Entries", value: String(filteredWorkLogs.length) },
      { label: "Tracked hours", value: `${totalHours.toFixed(1)}h` },
      { label: "People", value: String(participantIds.size) },
      { label: "Tasks", value: String(taskIds.size) },
    ];

    if (visiblePendingWorkLogDrafts.length > 0) {
      summary.push({
        label: "Drafts",
        value: String(visiblePendingWorkLogDrafts.length),
      });
    }

    if (failedWorkLogDraftCount > 0) {
      summary.push({
        label: "Sync failed",
        value: String(failedWorkLogDraftCount),
      });
    }

    return summary;
  }, [failedWorkLogDraftCount, filteredWorkLogs, visiblePendingWorkLogDrafts.length]);

  const visibleManufacturingProcess: ManufacturingItem["process"] =
    manufacturingView === "cnc"
      ? "cnc"
      : manufacturingView === "prints"
        ? "3d-print"
        : "fabrication";

  const manufacturingMaterialOptions = useMemo(() => {
    const uniqueMaterials = Array.from(
      new Set(manufacturingItems.map((item) => item.material)),
    ).sort((left, right) => left.localeCompare(right));

    return uniqueMaterials.map((material) => ({ id: material, name: material }));
  }, [manufacturingItems]);

  const filteredManufacturing = useMemo(() => {
    const search = manufacturingSearch.trim().toLowerCase();

    return manufacturingItems
      .filter((item) => item.process === visibleManufacturingProcess)
      .filter((item) => {
        if (activePersonFilter !== "all" && item.requestedById !== activePersonFilter) {
          return false;
        }

        if (
          manufacturingSubsystemFilter !== "all" &&
          item.subsystemId !== manufacturingSubsystemFilter
        ) {
          return false;
        }

        if (
          manufacturingRequesterFilter !== "all" &&
          item.requestedById !== manufacturingRequesterFilter
        ) {
          return false;
        }

        if (manufacturingStatusFilter !== "all" && item.status !== manufacturingStatusFilter) {
          return false;
        }

        if (manufacturingArchiveFilter === "active" && item.status === "complete") {
          return false;
        }

        if (manufacturingArchiveFilter === "archived" && item.status !== "complete") {
          return false;
        }

        if (manufacturingMaterialFilter !== "all" && item.material !== manufacturingMaterialFilter) {
          return false;
        }

        if (!search) {
          return true;
        }

        const subsystemName = subsystemsById[item.subsystemId]?.name ?? "";
        const requesterName = item.requestedById
          ? (membersById[item.requestedById]?.name ?? "")
          : "";

        return `${item.title} ${item.material} ${subsystemName} ${requesterName}`
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [
    activePersonFilter,
    manufacturingItems,
    manufacturingMaterialFilter,
    manufacturingArchiveFilter,
    manufacturingRequesterFilter,
    manufacturingSearch,
    manufacturingStatusFilter,
    manufacturingSubsystemFilter,
    membersById,
    subsystemsById,
    visibleManufacturingProcess,
  ]);

  const manufacturingSummary = useMemo(() => {
    const completeCount = filteredManufacturing.filter(
      (item) => item.status === "complete",
    ).length;
    const qaCount = filteredManufacturing.filter((item) => item.status === "qa").length;
    const reviewedCount = filteredManufacturing.filter(
      (item) => item.mentorReviewed,
    ).length;

    return [
      { label: "Queue", value: String(filteredManufacturing.length) },
      { label: "In QA", value: String(qaCount) },
      { label: "Mentor reviewed", value: String(reviewedCount) },
      { label: "Complete", value: String(completeCount) },
    ] satisfies SummaryChipData[];
  }, [filteredManufacturing]);

  const purchaseVendorOptions = useMemo(() => {
    const vendors = Array.from(
      new Set(purchaseItems.map((item) => item.vendor)),
    ).sort((left, right) => left.localeCompare(right));

    return vendors.map((vendor) => ({ id: vendor, name: vendor }));
  }, [purchaseItems]);

  const materialRollups = useMemo(() => {
    const rows: MaterialRollup[] = [];

    for (const materialName of manufacturingMaterialOptions.map((option) => option.id)) {
      const relatedManufacturing = manufacturingItems.filter(
        (item) => item.material === materialName,
      );
      const relatedPurchases = purchaseItems.filter((item) => {
        const text = `${item.title} ${item.vendor} ${item.linkLabel}`.toLowerCase();
        return materialName
          .toLowerCase()
          .split(" ")
          .some((token) => token.length > 3 && text.includes(token));
      });

      const openDemand = relatedManufacturing
        .filter((item) => item.status !== "complete")
        .reduce((sum, item) => sum + item.quantity, 0);
      const supplied = relatedPurchases
        .filter((item) => item.status === "delivered" || item.status === "purchased")
        .reduce((sum, item) => sum + item.quantity, 0);
      const openPurchases = relatedPurchases.filter(
        (item) => item.status !== "delivered",
      );
      const openPurchaseQuantity = openPurchases.reduce((sum, item) => sum + item.quantity, 0);
      const reorderPoint = Math.max(1, Math.ceil(openDemand / 2));
      const onHand = Math.max(0, supplied - Math.ceil(openDemand * 0.35));
      const suggestedOrderQuantity = Math.max(
        0,
        reorderPoint + openDemand - onHand - openPurchaseQuantity,
      );
      const category = inferMaterialCategory(materialName);
      const vendor = relatedPurchases[0]?.vendor ?? "Mixed";

      rows.push({
        id: materialName.toLowerCase().replace(/\s+/g, "-"),
        name: materialName,
        category,
        onHand,
        reorderPoint,
        openDemand,
        openPurchaseCount: openPurchases.length,
        openPurchaseQuantity,
        suggestedOrderQuantity,
        vendor,
        stock: onHand <= reorderPoint ? "low" : "ok",
      });
    }

    return rows.sort((left, right) => left.name.localeCompare(right.name));
  }, [manufacturingMaterialOptions, manufacturingItems, purchaseItems]);

  const filteredMaterialRollups = useMemo(() => {
    const search = materialsSearch.trim().toLowerCase();

    return materialRollups.filter((row) => {
      if (materialsCategoryFilter !== "all" && row.category !== materialsCategoryFilter) {
        return false;
      }

      if (materialsStockFilter !== "all" && row.stock !== materialsStockFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      return `${row.name} ${row.vendor} ${row.category}`.toLowerCase().includes(search);
    });
  }, [materialRollups, materialsCategoryFilter, materialsSearch, materialsStockFilter]);

  const partInstancesWithStatus = useMemo(() => {
    return partInstances.map((partInstance) => ({
      partInstance,
      status: derivePartLifecycleStatus(partInstance, tasks),
    }));
  }, [partInstances, tasks]);

  const filteredPartDefinitions = useMemo(() => {
    const search = partsSearch.trim().toLowerCase();

    return partDefinitions.filter((partDefinition) => {
      if (!search) {
        return true;
      }

      return `${partDefinition.name} ${partDefinition.partNumber} ${partDefinition.type} ${partDefinition.source}`
        .toLowerCase()
        .includes(search);
    });
  }, [partsSearch, partDefinitions]);

  const filteredPartInstances = useMemo(() => {
    const search = partsSearch.trim().toLowerCase();

    return partInstancesWithStatus.filter(({ partInstance, status }) => {
      if (partsSubsystemFilter !== "all" && partInstance.subsystemId !== partsSubsystemFilter) {
        return false;
      }

      if (partsStatusFilter !== "all" && status !== partsStatusFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const definition = partDefinitionsById[partInstance.partDefinitionId];
      const mechanismName = partInstance.mechanismId
        ? (mechanismsById[partInstance.mechanismId]?.name ?? "")
        : "";

      return `${partInstance.name} ${definition?.name ?? ""} ${definition?.partNumber ?? ""} ${mechanismName}`
        .toLowerCase()
        .includes(search);
    });
  }, [
    mechanismsById,
    partDefinitionsById,
    partInstancesWithStatus,
    partsSearch,
    partsStatusFilter,
    partsSubsystemFilter,
  ]);

  const filteredPurchases = useMemo(() => {
    const search = purchaseSearch.trim().toLowerCase();

    return purchaseItems.filter((item) => {
      if (activePersonFilter !== "all" && item.requestedById !== activePersonFilter) {
        return false;
      }

      if (purchaseSubsystemFilter !== "all" && item.subsystemId !== purchaseSubsystemFilter) {
        return false;
      }

      if (purchaseRequesterFilter !== "all" && item.requestedById !== purchaseRequesterFilter) {
        return false;
      }

      if (purchaseStatusFilter !== "all" && item.status !== purchaseStatusFilter) {
        return false;
      }

      if (purchaseArchiveFilter === "active" && item.status === "delivered") {
        return false;
      }

      if (purchaseArchiveFilter === "archived" && item.status !== "delivered") {
        return false;
      }

      if (purchaseVendorFilter !== "all" && item.vendor !== purchaseVendorFilter) {
        return false;
      }

      if (
        purchaseApprovalFilter !== "all" &&
        (purchaseApprovalFilter === "approved"
          ? !item.approvedByMentor
          : item.approvedByMentor)
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const requesterName = item.requestedById
        ? (membersById[item.requestedById]?.name ?? "")
        : "";
      const subsystemName = subsystemsById[item.subsystemId]?.name ?? "";

      return `${item.title} ${item.vendor} ${requesterName} ${subsystemName}`
        .toLowerCase()
        .includes(search);
    });
  }, [
    activePersonFilter,
    membersById,
    purchaseItems,
    purchaseArchiveFilter,
    purchaseApprovalFilter,
    purchaseRequesterFilter,
    purchaseSearch,
    purchaseStatusFilter,
    purchaseSubsystemFilter,
    purchaseVendorFilter,
    subsystemsById,
  ]);

  const subsystemCountsById = useMemo(() => {
    const counts = Object.fromEntries(
      subsystems.map((subsystem) => [
        subsystem.id,
        {
          blockedTasks: 0,
          health: "good" as const,
          mechanisms: 0,
          openPurchases: 0,
          openTasks: 0,
          overdueTasks: 0,
          qaFindings: 0,
          waitingQa: 0,
          risks: subsystem.risks.length,
          tasks: 0,
        },
      ]),
    ) as Record<string, SubsystemCounts>;
    const today = localTodayDate();

    for (const mechanism of mechanisms) {
      if (counts[mechanism.subsystemId]) {
        counts[mechanism.subsystemId].mechanisms += 1;
      }
    }

    for (const task of tasks) {
      const bucket = counts[task.subsystemId];
      if (!bucket) {
        continue;
      }

      bucket.tasks += 1;
      if (task.status !== "complete") {
        bucket.openTasks += 1;
      }
      if (task.status !== "complete" && task.blockers.length > 0) {
        bucket.blockedTasks += 1;
      }
      if (task.status !== "complete" && task.dueDate < today) {
        bucket.overdueTasks += 1;
      }
      if (task.status === "waiting-for-qa") {
        bucket.waitingQa += 1;
      }
    }

    for (const purchase of purchaseItems) {
      const bucket = counts[purchase.subsystemId];
      if (bucket && purchase.status !== "delivered") {
        bucket.openPurchases += 1;
      }
    }

    for (const review of qaReviews) {
      if (review.result === "pass") {
        continue;
      }

      const taskId = getQaReviewTaskId(review);
      const task = taskId ? taskById[taskId] : null;
      const bucket = task ? counts[task.subsystemId] : null;
      if (bucket) {
        bucket.qaFindings += 1;
      }
    }

    for (const bucket of Object.values(counts)) {
      if (
        bucket.blockedTasks > 0 ||
        bucket.overdueTasks > 0 ||
        bucket.qaFindings > 0 ||
        bucket.risks > 1
      ) {
        bucket.health = "risk";
      } else if (bucket.waitingQa > 0 || bucket.openPurchases > 0 || bucket.risks > 0) {
        bucket.health = "watch";
      }
    }

    return counts;
  }, [mechanisms, purchaseItems, qaReviews, subsystems, taskById, tasks]);

  const filteredSubsystems = useMemo(() => {
    const search = subsystemSearch.trim().toLowerCase();

    return subsystems.filter((subsystem) => {
      if (!search) {
        return true;
      }

      const leadName = subsystem.responsibleEngineerId
        ? (membersById[subsystem.responsibleEngineerId]?.name ?? "")
        : "";
      const mentorNames = subsystem.mentorIds
        .map((mentorId) => membersById[mentorId]?.name ?? "")
        .join(" ");
      const mechanismNames = mechanisms
        .filter((mechanism) => mechanism.subsystemId === subsystem.id)
        .map((mechanism) => mechanism.name)
        .join(" ");

      return `${subsystem.name} ${subsystem.description} ${leadName} ${mentorNames} ${mechanismNames} ${subsystem.risks.join(" ")}`
        .toLowerCase()
        .includes(search);
    });
  }, [mechanisms, membersById, subsystemSearch, subsystems]);

  const selectedSubsystem =
    filteredSubsystems.find((subsystem) => subsystem.id === selectedSubsystemId) ?? null;

  const riskRows = useMemo(() => {
    const subsystemRisks = subsystems.flatMap((subsystem) =>
      subsystem.risks.map((risk, index) => ({
        id: `${subsystem.id}-${index}`,
        title: risk,
        detail: subsystem.description,
        subsystemId: subsystem.id,
        source: "Subsystem",
        priority: "medium" as const,
      })),
    );
    const blockerRisks = tasks
      .filter((task) => task.blockers.length > 0 && task.status !== "complete")
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        detail: task.blockers.join(" | "),
        subsystemId: task.subsystemId,
        source: "Task blocker",
        priority: mapTaskPriorityToRiskPriority(task.priority),
      }));
    const qaRisks = qaReviews
      .filter((review) => review.result === "iteration-worthy" || review.result === "minor-fix")
      .map((review) => {
        const taskId = getQaReviewTaskId(review);
        const task = taskId ? taskById[taskId] : null;

        return {
          id: `qa-${review.id}`,
          title: review.subjectTitle,
          detail: review.notes,
          subsystemId: task?.subsystemId ?? "",
          source: review.result === "iteration-worthy" ? "Iteration" : "QA finding",
          priority: review.result === "iteration-worthy" ? "high" as const : "medium" as const,
        };
      });

    return [...blockerRisks, ...qaRisks, ...subsystemRisks].sort((left, right) => {
      const priorityDelta = RISK_PRIORITY_RANK[left.priority] - RISK_PRIORITY_RANK[right.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const sourceDelta = left.source.localeCompare(right.source);
      if (sourceDelta !== 0) {
        return sourceDelta;
      }

      return left.title.localeCompare(right.title);
    });
  }, [qaReviews, subsystems, taskById, tasks]);

  const reportSummary = useMemo(() => {
    const iterationCount = qaReviews.filter((review) => review.result === "iteration-worthy").length;
    return [
      { label: "Help requests", value: String(helpRequests.length) },
      { label: "QA requests", value: String(qaRequests.length) },
      { label: "QA reports", value: String(qaReviews.length) },
      { label: "Event reports", value: String(eventReports.length) },
      { label: "Iterations", value: String(iterationCount) },
    ] satisfies SummaryChipData[];
  }, [eventReports.length, helpRequests.length, qaRequests.length, qaReviews]);

  const riskSummary = useMemo(() => {
    const highCount = riskRows.filter((risk) => risk.priority === "high").length;
    return [
      { label: "Open risks", value: String(riskRows.length) },
      { label: "High", value: String(highCount) },
      { label: "Subsystem risks", value: String(subsystems.reduce((sum, subsystem) => sum + subsystem.risks.length, 0)) },
    ] satisfies SummaryChipData[];
  }, [riskRows, subsystems]);

  const rosterStudents = members.filter(
    (member) => member.role === "student" || member.role === "lead",
  );
  const rosterMentors = members.filter(
    (member) => member.role === "mentor" || member.role === "admin",
  );
  const rosterAdmins = members.filter((member) => member.role === "admin");
  const rosterExternal = members.filter((member) => member.role === "external");
  const homeActionItems = useMemo(() => {
    const today = localTodayDate();
    const dueSoonDate = shiftDateByDays(today, 3);

    const taskActions = tasks
      .filter((task) => task.status !== "complete")
      .flatMap((task) => {
        const subsystemName = subsystemsById[task.subsystemId]?.name ?? "Unknown subsystem";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";
        const openDependencies = task.dependencyIds
          .map((dependencyId) => taskById[dependencyId])
          .filter((dependency): dependency is Task => Boolean(dependency))
          .filter((dependency) => dependency.status !== "complete");
        const actions = [];

        if (task.blockers.length > 0) {
          actions.push({
            detail: `${subsystemName} - ${ownerName} - ${task.blockers.join(" | ")}`,
            id: `blocked-${task.id}`,
            label: "Blocked task",
            onPressTargetId: task.id,
            priority: "critical" as const,
            source: "task" as const,
            title: task.title,
          });
        } else if (task.dueDate < today) {
          actions.push({
            detail: `${subsystemName} - ${ownerName} - was due ${formatDate(task.dueDate)}`,
            id: `overdue-${task.id}`,
            label: "Overdue",
            onPressTargetId: task.id,
            priority: "critical" as const,
            source: "task" as const,
            title: task.title,
          });
        } else if (task.status === "waiting-for-qa") {
          actions.push({
            detail: `${subsystemName} - ${ownerName} - needs a QA decision`,
            id: `qa-${task.id}`,
            label: "Waiting QA",
            onPressTargetId: task.id,
            priority: "high" as const,
            source: "task" as const,
            title: task.title,
          });
        } else if (openDependencies.length > 0) {
          actions.push({
            detail: `${subsystemName} - ${ownerName} - waiting on ${openDependencies.map((dependency) => dependency.title).join(", ")}`,
            id: `dependencies-${task.id}`,
            label: "Dependency wait",
            onPressTargetId: task.id,
            priority: "high" as const,
            source: "task" as const,
            title: task.title,
          });
        } else if (task.dueDate <= dueSoonDate) {
          actions.push({
            detail: `${subsystemName} - ${ownerName} - due ${formatDate(task.dueDate)}`,
            id: `due-soon-${task.id}`,
            label: "Due soon",
            onPressTargetId: task.id,
            priority: "medium" as const,
            source: "task" as const,
            title: task.title,
          });
        }

        return actions;
      });

    const manufacturingActions = manufacturingItems
      .filter((item) => item.status !== "complete")
      .filter((item) => item.dueDate <= dueSoonDate || item.status === "qa")
      .map((item) => ({
        detail: `${subsystemsById[item.subsystemId]?.name ?? "Unknown subsystem"} - ${item.material} - Qty ${item.quantity}`,
        id: `manufacturing-${item.id}`,
        label: item.status === "qa" ? "Manufacturing QA" : "Manufacturing due",
        onPressTargetId: item.id,
        priority: item.status === "qa" || item.dueDate < today ? "high" as const : "medium" as const,
        source: "manufacturing" as const,
        title: item.title,
      }));

    const purchaseActions = purchaseItems
      .filter((item) => item.status === "requested" || item.status === "approved")
      .map((item) => ({
        detail: `${subsystemsById[item.subsystemId]?.name ?? "Unknown subsystem"} - ${item.vendor} - Qty ${item.quantity}`,
        id: `purchase-${item.id}`,
        label: item.status === "approved" ? "Ready to buy" : "Purchase request",
        onPressTargetId: item.id,
        priority: item.status === "approved" ? "high" as const : "medium" as const,
        source: "purchase" as const,
        title: item.title,
      }));

    const priorityRank = { critical: 0, high: 1, medium: 2 };

    return [...taskActions, ...manufacturingActions, ...purchaseActions]
      .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])
      .slice(0, 8);
  }, [manufacturingItems, membersById, purchaseItems, subsystemsById, taskById, tasks]);
  const homeInventoryNeeds = useMemo(
    () =>
      [...purchaseItems]
        .filter((item) => item.status === "requested" || item.status === "approved")
        .sort((left, right) => {
          const statusRank = { approved: 0, requested: 1 } as Record<string, number>;
          const statusDelta = statusRank[left.status] - statusRank[right.status];
          if (statusDelta !== 0) {
            return statusDelta;
          }

          return right.estimatedCost - left.estimatedCost;
        })
        .slice(0, 5),
    [purchaseItems],
  );
  const homePriorityTasks = useMemo(() => {
    const priorityRank: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return [...tasks]
      .filter((task) => task.status !== "complete")
      .sort((left, right) => {
        const blockerDelta =
          Number(right.blockers.length > 0) - Number(left.blockers.length > 0);
        if (blockerDelta !== 0) {
          return blockerDelta;
        }

        const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return left.dueDate.localeCompare(right.dueDate);
      })
      .slice(0, 5);
  }, [tasks]);
  const homeTaskSummary = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== "complete");
    const blockedTasks = openTasks.filter((task) => task.blockers.length > 0);
    const dueToday = openTasks.filter((task) => task.dueDate <= isoToday());
    const waitingQa = openTasks.filter((task) => task.status === "waiting-for-qa");

    return [
      { label: "Open", value: String(openTasks.length) },
      { label: "Blocked", value: String(blockedTasks.length) },
      { label: "Due now", value: String(dueToday.length) },
      { label: "Waiting QA", value: String(waitingQa.length) },
    ] satisfies SummaryChipData[];
  }, [tasks]);
  const homeMeetingExport = useMemo(() => {
    const rows = [
      ["Type", "Title", "Owner/Requester", "Subsystem", "Status", "Due/Detail"],
      ...homePriorityTasks.map((task) => [
        "Task",
        task.title,
        task.ownerId ? (membersById[task.ownerId]?.name ?? "Unassigned") : "Unassigned",
        subsystemsById[task.subsystemId]?.name ?? "Unknown",
        STATUS_LABELS[task.status],
        task.dueDate,
      ]),
      ...homeInventoryNeeds.map((purchase) => [
        "Purchase",
        purchase.title,
        purchase.requestedById
          ? (membersById[purchase.requestedById]?.name ?? "Unassigned")
          : "Unassigned",
        subsystemsById[purchase.subsystemId]?.name ?? "Unknown",
        purchase.status,
        `Qty ${purchase.quantity} - ${purchase.vendor}`,
      ]),
      ...manufacturingItems
        .filter((item) => item.status !== "complete")
        .slice(0, 8)
        .map((item) => [
          "Manufacturing",
          item.title,
          item.requestedById
            ? (membersById[item.requestedById]?.name ?? "Unassigned")
            : "Unassigned",
          subsystemsById[item.subsystemId]?.name ?? "Unknown",
          item.status,
          `${item.dueDate} - ${item.material} x${item.quantity}`,
        ]),
    ];

    return rows.map((row) => row.map(csvCell).join(",")).join("\n");
  }, [homeInventoryNeeds, homePriorityTasks, manufacturingItems, membersById, subsystemsById]);
  const meetingAttendance = useMemo(
    () =>
      [...members]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((member) => ({
          member,
          status: attendanceStatusByMemberId[member.id] ?? "maybe",
        })),
    [attendanceStatusByMemberId, members],
  );
  const attendanceSummary = useMemo(() => {
    const presentCount = meetingAttendance.filter(({ status }) => status === "yes").length;
    const maybeCount = meetingAttendance.filter(({ status }) => status === "maybe").length;
    const outCount = meetingAttendance.filter(({ status }) => status === "no").length;

    return [
      { label: "Present", value: String(presentCount) },
      { label: "Maybe", value: String(maybeCount) },
      { label: "Out", value: String(outCount) },
      { label: "Total", value: String(meetingAttendance.length) },
    ] satisfies SummaryChipData[];
  }, [meetingAttendance]);
  const attendancePreview = meetingAttendance
    .filter(({ status }) => status !== "no")
    .slice(0, 10);

  const activeTabLabel =
    activeTab === "home"
      ? "Home"
      : (navigationItems.find((item) => item.key === activeTab)?.label ?? "Home");
  const activeSubtabOptions = useMemo(() => {
    if (activeTab === "tasks") {
      return TASK_VIEW_OPTIONS;
    }

    if (activeTab === "manufacturing") {
      return MANUFACTURING_VIEW_OPTIONS;
    }

    if (activeTab === "inventory") {
      return INVENTORY_VIEW_OPTIONS;
    }

    return [];
  }, [activeTab]);
  const activeSubtabValue =
    activeTab === "tasks"
      ? taskView
      : activeTab === "manufacturing"
        ? manufacturingView
        : activeTab === "inventory"
          ? inventoryView
          : null;
  const activeSubtabIndex =
    activeSubtabValue === null
      ? -1
      : activeSubtabOptions.findIndex((option) => option.value === activeSubtabValue);
  const hasSubtabPages = activeSubtabOptions.length > 1;
  const syncStatusLabel =
    backendStatus === "connected"
      ? isSyncing
        ? "Syncing"
        : "Backend live"
      : backendStatus === "connecting"
        ? "Connecting"
        : syncError === getMobileAuthErrorMessage("network-unavailable")
          ? "Network unavailable"
          : "Backend offline";
  const appResponsiveStyles = useMemo(
    () => ({
      topbar: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
        marginHorizontal: responsiveMetrics.gutter,
        paddingHorizontal: responsiveMetrics.panelPadding,
        paddingVertical: responsiveMetrics.isVeryCompact ? 8 : 10,
      },
      iconButton: {
        backgroundColor: themeColors.canvas,
        borderColor: themeColors.border,
        minHeight: responsiveMetrics.controlHeight,
        paddingHorizontal: responsiveMetrics.chipPaddingHorizontal,
      },
      iconButtonLabel: {
        color: themeColors.navyInk,
        fontSize: scaleFont(12, responsiveMetrics),
      },
      brandEyebrow: {
        color: themeColors.subtleText,
        fontSize: scaleFont(11, responsiveMetrics),
      },
      brandTitle: {
        color: themeColors.ink,
        fontSize: scaleFont(isCompactLayout ? 16 : 18, responsiveMetrics),
      },
      userChipLabel: {
        fontSize: scaleFont(12, responsiveMetrics),
      },
      shellIconLabel: {
        color: themeColors.navyInk,
        fontSize: scaleFont(14, responsiveMetrics),
      },
      primaryAction: {
        minHeight: responsiveMetrics.controlHeight,
        paddingHorizontal: responsiveMetrics.chipPaddingHorizontal + 4,
      },
      primaryActionLabel: {
        fontSize: scaleFont(13, responsiveMetrics),
      },
      rowCard: {
        backgroundColor: themeColors.canvas,
        borderColor: themeColors.border,
        padding: responsiveMetrics.cardPadding,
      },
      rowTitle: {
        color: themeColors.ink,
        fontSize: scaleFont(15, responsiveMetrics),
      },
      rowSubtitle: {
        color: themeColors.subtleText,
        fontSize: scaleFont(13, responsiveMetrics),
        lineHeight: scaleFont(18, responsiveMetrics),
      },
      rowBody: {
        color: themeColors.ink,
        fontSize: scaleFont(14, responsiveMetrics),
        lineHeight: scaleFont(20, responsiveMetrics),
      },
      metaLine: {
        color: themeColors.subtleText,
        fontSize: scaleFont(13, responsiveMetrics),
        lineHeight: scaleFont(18, responsiveMetrics),
      },
      editTag: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
        color: themeColors.subtleText,
      },
      navTab: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      },
      navTabActive: {
        backgroundColor: themeColors.navySurface,
        borderColor: themeColors.blue,
      },
      navLabel: {
        color: themeColors.ink,
      },
      navLabelActive: {
        color: themeColors.navyInk,
      },
      navBubble: {
        backgroundColor: themeColors.canvas,
      },
      navCount: {
        backgroundColor: themeColors.canvas,
      },
      overlayCard: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      },
      navDrawer: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
        padding: responsiveMetrics.isVeryCompact ? 12 : responsiveMetrics.panelPadding,
        width: Math.min(width - responsiveMetrics.gutter * 2, 336),
      },
      settingsRow: {
        backgroundColor: themeColors.canvas,
        borderColor: themeColors.border,
      },
      settingsRowActive: {
        backgroundColor: themeColors.navySurface,
        borderColor: themeColors.blue,
      },
      settingsSubmenu: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      },
      settingsSubmenuRowActive: {
        backgroundColor: themeColors.navySurface,
      },
      settingsIconButton: {
        backgroundColor: themeColors.canvas,
        borderColor: themeColors.border,
      },
      tableHeaderText: {
        color: themeColors.subtleText,
      },
      calloutBox: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      },
      calloutTitle: {
        color: themeColors.orangeInk,
      },
      calloutBody: {
        color: themeColors.ink,
      },
      subsectionLabel: {
        color: themeColors.ink,
      },
      rosterSection: {
        backgroundColor: themeColors.canvas,
        borderColor: themeColors.border,
      },
      memberRow: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      },
      memberRowSelected: {
        backgroundColor: themeColors.navySurface,
        borderColor: themeColors.blue,
      },
      memberAvatar: {
        backgroundColor: themeColors.navySurface,
      },
      quickActionButton: {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      },
      quickActionButtonLabel: {
        color: themeColors.navyInk,
        fontSize: scaleFont(12, responsiveMetrics),
      },
    }),
    [isCompactLayout, responsiveMetrics, themeColors, width],
  );
  const editTagStyle = [styles.editTag, appResponsiveStyles.editTag];
  const closeNavigationMenu = useCallback(() => setIsNavMenuVisible(false), []);
  const openNavigationMenu = useCallback(() => setIsNavMenuVisible(true), []);
  const selectNavigationTab = useCallback((tab: ViewTab) => {
    setActiveTab(tab);
    setIsNavMenuVisible(false);
  }, []);
  const selectSubtabByIndex = useCallback(
    (nextIndex: number) => {
      const nextOption = activeSubtabOptions[nextIndex];
      if (!nextOption) {
        return;
      }

      if (activeTab === "tasks") {
        setTaskView(nextOption.value as TaskViewTab);
        return;
      }

      if (activeTab === "manufacturing") {
        setManufacturingView(nextOption.value as ManufacturingViewTab);
        return;
      }

      if (activeTab === "inventory") {
        setInventoryView(nextOption.value as InventoryViewTab);
      }
    },
    [activeSubtabOptions, activeTab],
  );
  const subtabSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          if (!hasSubtabPages) {
            return false;
          }

          const horizontalDistance = Math.abs(gesture.dx);
          return (
            horizontalDistance > SUBTAB_SWIPE_ACTIVATION_DISTANCE &&
            horizontalDistance > Math.abs(gesture.dy) + 20
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          if (!hasSubtabPages || Math.abs(gesture.dx) < SUBTAB_SWIPE_COMMIT_DISTANCE) {
            return;
          }

          if (activeSubtabIndex < 0) {
            return;
          }

          const direction = gesture.dx < 0 ? 1 : -1;
          const nextIndex = Math.max(
            0,
            Math.min(activeSubtabOptions.length - 1, activeSubtabIndex + direction),
          );

          if (nextIndex !== activeSubtabIndex) {
            selectSubtabByIndex(nextIndex);
          }
        },
      }),
    [
      activeSubtabIndex,
      activeSubtabOptions.length,
      hasSubtabPages,
      selectSubtabByIndex,
    ],
  );
  const navigationOpenSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          const horizontalDistance = Math.abs(gesture.dx);
          return (
            horizontalDistance > SWIPE_ACTIVATION_DISTANCE &&
            horizontalDistance > Math.abs(gesture.dy) + 8
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dx) >= SWIPE_COMMIT_DISTANCE) {
            openNavigationMenu();
          }
        },
      }),
    [openNavigationMenu],
  );
  const navigationCloseSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => {
          const horizontalDistance = Math.abs(gesture.dx);
          return (
            horizontalDistance > SWIPE_ACTIVATION_DISTANCE &&
            horizontalDistance > Math.abs(gesture.dy) + 8
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dx) >= SWIPE_COMMIT_DISTANCE) {
            closeNavigationMenu();
          }
        },
      }),
    [closeNavigationMenu],
  );

  useEffect(() => {
    void loadPublicAuthConfig();
  }, [loadPublicAuthConfig]);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(
      () => undefined,
    );
  }, []);

  useEffect(() => {
    workLogTimerRef.current = workLogTimer;
  }, [workLogTimer]);

  useEffect(() => {
    let didCancel = false;

    void restorePersistedWorkLogTimerReminder().then((restoredTimer) => {
      if (didCancel || workLogTimerRef.current) {
        return;
      }

      if (!restoredTimer) {
        void cancelWorkLogTimerReminders();
        void clearPersistedWorkLogTimerState();
        return;
      }

      const restoredReminderNotificationIds =
        restoredTimer.isPaused === true ? [] : restoredTimer.reminderNotificationIds;
      const restoredWorkLogTimer = {
        elapsedMs: restoredTimer.elapsedMs,
        id: restoredTimer.id,
        isPaused: restoredTimer.isPaused === true,
        reminderNotificationIds: restoredReminderNotificationIds,
        startedAt: restoredTimer.startedAt,
      };
      workLogTimerRef.current = restoredWorkLogTimer;
      setWorkLogTimer(restoredWorkLogTimer);
      setWorkLogTimerTick(Date.now());

      if (restoredTimer.isPaused === true) {
        void cancelWorkLogTimerReminders(restoredTimer.reminderNotificationIds);
        void persistWorkLogTimerState(restoredWorkLogTimer);
      }
    });

    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    if (activePersonFilter === "all") {
      return;
    }

    if (!members.some((member) => member.id === activePersonFilter)) {
      setActivePersonFilter("all");
    }
  }, [activePersonFilter, members]);

  useEffect(() => {
    setAttendanceStatusByMemberId((current) =>
      Object.fromEntries(
        members.map((member) => [member.id, current[member.id] ?? "maybe"]),
      ),
    );
  }, [members]);

  useEffect(() => {
    if (selectedMemberId && !members.some((member) => member.id === selectedMemberId)) {
      setSelectedMemberId(null);
    }
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (selectedSubsystemId && !subsystems.some((subsystem) => subsystem.id === selectedSubsystemId)) {
      setSelectedSubsystemId(subsystems[0]?.id ?? "");
    }
  }, [selectedSubsystemId, subsystems]);

  useEffect(() => {
    if (!workLogTimer || workLogTimer.isPaused) {
      return undefined;
    }

    const timerId = setInterval(() => setWorkLogTimerTick(Date.now()), TIMER_TICK_MS);

    return () => clearInterval(timerId);
  }, [workLogTimer]);

  const workLogTimerElapsedMs = getWorkLogTimerElapsedMs(
    workLogTimer,
    workLogTimerTick,
  );
  const workTimerElapsedLabel = formatTimerElapsed(workLogTimerElapsedMs);

  const openCreateTaskEditor = () => {
    const today = localTodayDate();

    setActiveTaskId(null);
    setTaskDraft(
      buildTaskDraft({
        subsystemId: taskSubsystemOptions[0]?.id ?? "",
        disciplineId:
          TASK_SUBTEAM_DISCIPLINE_IDS[activeTaskSubteam][0] ?? disciplines[0]?.id ?? "",
        ownerId: members[0]?.id ?? "",
        mentorId:
          members.find((member) => member.role === "mentor" || member.role === "admin")?.id ??
          members[0]?.id ??
          "",
        startDate: today,
        dueDate: today,
      }),
    );
    setTaskEditorError(null);
    setTaskDependencySearch("");
    setTaskEditorMode("create");
  };

  const openTaskQueueFromTask = (task: Task) => {
    const nextSubteam = getTaskSubteamForDiscipline(task.disciplineId, activeTaskSubteam);

    setActiveTaskSubteam(nextSubteam);
    setTaskView("queue");
    setTaskSearch("");
    setTaskSubsystemFilter("all");
    setTaskOwnerFilter("all");
    setTaskStatusFilter("all");
    setTaskPriorityFilter("all");
    setTaskBlockerFilter("all");
    setTaskArchiveFilter("active");
    setActiveTab("tasks");
  };

  const openInventoryPurchases = () => {
    setInventoryView("purchases");
    setActiveTab("inventory");
  };

  const openEditTaskEditor = (task: Task) => {
    setActiveTaskId(task.id);
    setTaskDraft(buildTaskDraft(task));
    setTaskEditorError(null);
    setTaskDependencySearch("");
    setTaskEditorMode("edit");
  };

  const openDuplicateTaskEditor = (task: Task) => {
    setActiveTaskId(null);
    setTaskDraft(
      buildTaskDraft({
        ...task,
        id: "",
        title: `Copy of ${task.title}`,
        dueDate: isoToday(),
        status: "not-started",
        blockers: [],
        actualHours: 0,
        isBlocked: false,
      }),
    );
    setTaskEditorError(null);
    setTaskDependencySearch("");
    setTaskEditorMode("create");
  };

  const shiftTaskDueDates = async (tasksToShift: Task[], dayDelta: number) => {
    const openTasksToShift = tasksToShift.filter((task) => task.status !== "complete");

    if (openTasksToShift.length === 0 || dayDelta === 0) {
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        openTasksToShift.some((taskToShift) => taskToShift.id === task.id)
          ? { ...task, dueDate: shiftDateByDays(task.dueDate, dayDelta) }
          : task,
      ),
    );
    setIsSyncing(true);
    setSyncError(null);

    try {
      await Promise.all(
        openTasksToShift.map((task) =>
          requestJson(
            apiBaseUrl,
            `/api/tasks/${task.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                title: task.title,
                summary: task.summary,
                subsystemId: task.subsystemId,
                disciplineId: task.disciplineId,
                mechanismId: task.mechanismId,
                partInstanceId: task.partInstanceId,
                targetEventId: task.targetEventId,
                ownerId: task.ownerId,
                mentorId: task.mentorId,
                dueDate: shiftDateByDays(task.dueDate, dayDelta),
                priority: task.priority,
                status: task.status,
                dependencyIds: task.dependencyIds,
                checklistItems: task.checklistItems ?? [],
                blockers: task.blockers,
                linkedManufacturingIds: task.linkedManufacturingIds,
                linkedPurchaseIds: task.linkedPurchaseIds,
                estimatedHours: task.estimatedHours,
                actualHours: task.actualHours,
              }),
            },
            apiToken,
          ),
        ),
      );
      await refreshWorkspaceFromServer(apiToken);
      setBackendStatus("connected");
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      setBackendStatus("offline");
      setSyncError(getClientErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  };

  const closeTaskEditor = () => {
    setTaskEditorMode(null);
    setActiveTaskId(null);
    setTaskEditorError(null);
    setTaskDependencySearch("");
  };

  const addTaskDependency = (dependencyId: string) => {
    setTaskDraft((current) => {
      if (dependencyId === activeTaskId) {
        return current;
      }

      if (
        activeTaskId &&
        taskDependsOnTarget(dependencyId, activeTaskId, taskById)
      ) {
        return current;
      }

      const dependencyIds = splitList(current.dependencyIdsText).filter(
        (currentDependencyId) => currentDependencyId !== activeTaskId,
      );

      if (dependencyIds.includes(dependencyId)) {
        return current;
      }

      return {
        ...current,
        dependencyIdsText: [...dependencyIds, dependencyId].join(", "),
      };
    });
  };

  const removeTaskDependency = (dependencyId: string) => {
    setTaskDraft((current) => ({
      ...current,
      dependencyIdsText: splitList(current.dependencyIdsText)
        .filter((currentDependencyId) => currentDependencyId !== dependencyId)
        .join(", "),
    }));
  };

  const saveTaskDraft = async () => {
    const isEdit = taskEditorMode === "edit" && activeTaskId;
    const existingTask = isEdit ? taskById[activeTaskId] : null;
    const blockers = splitList(taskDraft.blockersText);
    const checklistItems = splitList(taskDraft.checklistItemsText);
    const dependencyIds = splitList(taskDraft.dependencyIdsText)
      .filter((dependencyId) => taskById[dependencyId])
      .filter((dependencyId) => dependencyId !== activeTaskId);
    const title = taskDraft.title.trim();
    const summary = taskDraft.summary.trim();
    const parsedEstimatedHours = Number(taskDraft.estimatedHours);

    const missingFields = [
      !title ? "title" : null,
      !summary ? "summary" : null,
      !taskDraft.subsystemId ? "subsystem" : null,
      !taskDraft.ownerId ? "owner" : null,
      Number.isNaN(parsedEstimatedHours) || parsedEstimatedHours < 0 ? "estimated hours" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setTaskEditorError(`Add ${missingFields.join(", ")} before saving this task.`);
      return;
    }

    if (activeTaskId) {
      const circularDependencies = dependencyIds.filter((dependencyId) =>
        taskDependsOnTarget(dependencyId, activeTaskId, taskById),
      );

      if (circularDependencies.length > 0) {
        const dependencyNames = circularDependencies
          .map((dependencyId) => taskById[dependencyId]?.title ?? dependencyId)
          .join(", ");
        setTaskEditorError(
          `Remove circular dependencies before saving: ${dependencyNames}.`,
        );
        return;
      }
    }

    setTaskEditorError(null);
    const status = getAutoTaskStatus(
      {
        blockers,
        dependencyIds,
        ownerId: taskDraft.ownerId,
        status: taskDraft.status,
      },
      taskById,
    );

    const payload = mapTaskPayloadToServer({
      title,
      summary,
      subsystemId: taskDraft.subsystemId,
      disciplineId:
        taskDraft.disciplineId || disciplines[0]?.id || "mechanical",
      mechanismId: taskDraft.mechanismId,
      partInstanceId: taskDraft.partInstanceId,
      targetEventId: taskDraft.targetEventId,
      ownerId: taskDraft.ownerId,
      mentorId: taskDraft.mentorId || null,
      startDate: taskDraft.startDate || undefined,
      dueDate: taskDraft.dueDate || isoToday(),
      priority: taskDraft.priority,
      status,
      dependencyIds,
      checklistItems,
      blockers,
      linkedManufacturingIds: existingTask?.linkedManufacturingIds ?? [],
      linkedPurchaseIds: existingTask?.linkedPurchaseIds ?? [],
      estimatedHours: parsedEstimatedHours,
      actualHours: existingTask?.actualHours ?? 0,
    });

    const ok = await runMutation(
      isEdit ? `/api/tasks/${activeTaskId}` : "/api/tasks",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok) {
      setActiveTaskSubteam(getTaskSubteamForDiscipline(taskDraft.disciplineId, activeTaskSubteam));
      closeTaskEditor();
    }
  };

  const openCreateMilestoneEditor = () => {
    setMilestoneEditorMode("create");
    setActiveMilestoneId(null);
    setMilestoneDraft(buildMilestoneDraft());
    setMilestoneStartDate(localTodayDate());
    setMilestoneStartTime("18:00");
    setMilestoneEndDate("");
    setMilestoneEndTime("");
    setMilestoneError(null);
  };

  const openCreateDeadlineEditor = () => {
    setDeadlineTitle("");
    setDeadlineDate(localTodayDate());
    setDeadlineError(null);
    setDeadlineEditorVisible(true);
  };

  const openEditMilestoneEditor = (event: Event) => {
    setMilestoneEditorMode("edit");
    setActiveMilestoneId(event.id);
    setMilestoneDraft({
      title: event.title,
      type: event.type,
      isExternal: event.isExternal,
      description: event.description,
      relatedSubsystemIdsText: event.relatedSubsystemIds.join(", "),
    });
    setMilestoneStartDate(datePortion(event.startDateTime));
    setMilestoneStartTime(timePortion(event.startDateTime));
    setMilestoneEndDate(event.endDateTime ? datePortion(event.endDateTime) : "");
    setMilestoneEndTime(event.endDateTime ? timePortion(event.endDateTime) : "");
    setMilestoneError(null);
  };

  const closeMilestoneEditor = () => {
    setMilestoneEditorMode(null);
    setActiveMilestoneId(null);
    setMilestoneError(null);
  };

  const closeDeadlineEditor = () => {
    setDeadlineEditorVisible(false);
    setDeadlineTitle("");
    setDeadlineDate("");
    setDeadlineError(null);
  };

  const saveMilestoneDraft = async () => {
    const title = milestoneDraft.title.trim();
    const startDate = milestoneStartDate.trim();
    const startTime = milestoneStartTime.trim() || "12:00";
    const endDate = milestoneEndDate.trim();
    const endTime = milestoneEndTime.trim();
    const hasEnd = endDate.length > 0 || endTime.length > 0;
    const resolvedEndDate = endDate || startDate;
    const resolvedEndTime = endTime || startTime;
    const missingFields = [
      !title ? "title" : null,
      !isValidDateInput(startDate) ? "start date" : null,
      !isValidTimeInput(startTime) ? "start time" : null,
      hasEnd && !isValidDateInput(resolvedEndDate) ? "end date" : null,
      hasEnd && !isValidTimeInput(resolvedEndTime) ? "end time" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setMilestoneError(`Add valid ${missingFields.join(", ")} before saving this milestone.`);
      return;
    }

    const parsedSubsystemIds = splitList(milestoneDraft.relatedSubsystemIdsText)
      .filter((subsystemId) => subsystemsById[subsystemId]);
    const projectIds = Array.from(
      new Set(
        parsedSubsystemIds
          .map((subsystemId) => subsystemsById[subsystemId]?.projectId)
          .filter((projectId): projectId is string => Boolean(projectId)),
      ),
    );

    const startDateTime = buildDateTime(startDate, startTime);
    const endDateTime = hasEnd
      ? buildDateTime(resolvedEndDate, resolvedEndTime)
      : null;

    if (endDateTime && compareDateTimes(endDateTime, startDateTime) < 0) {
      setMilestoneError("End date/time must be after start date/time.");
      return;
    }

    setMilestoneError(null);

    const isEdit = milestoneEditorMode === "edit" && activeMilestoneId;
    const payload: {
      title: string;
      type: ReturnType<typeof mapEventTypeToMilestoneType>;
      startDateTime: string;
      endDateTime: string | null;
      isExternal: boolean;
      description: string;
      relatedSubsystemIds: string[];
      projectIds: string[];
    } = {
      title,
      type: mapEventTypeToMilestoneType(milestoneDraft.type),
      startDateTime,
      endDateTime,
      isExternal: milestoneDraft.isExternal,
      description: milestoneDraft.description.trim(),
      relatedSubsystemIds: parsedSubsystemIds,
      projectIds,
    };

    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await requestJson<MilestoneMutationResponse>(
        apiBaseUrl,
        isEdit ? `/api/milestones/${activeMilestoneId}` : "/api/milestones",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
        apiToken,
      );

      await refreshWorkspaceFromServer(apiToken);
      setEvents((currentEvents) =>
        applyMilestoneSubsystemLinks(
          currentEvents,
          response.item,
          isEdit ? activeMilestoneId : null,
          parsedSubsystemIds,
        ),
      );
      setBackendStatus("connected");
      closeMilestoneEditor();
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      setBackendStatus("offline");
      setSyncError(getClientErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  };

  const saveDeadlineDraft = async () => {
    const title = deadlineTitle.trim();

    if (!title || !deadlineDate.trim()) {
      setDeadlineError("Deadline title and day are required.");
      return;
    }

    const ok = await runMutation("/api/milestones", {
      method: "POST",
      body: JSON.stringify({
        title,
        type: "deadline",
        startDateTime: buildDateTime(deadlineDate, "12:00"),
        endDateTime: null,
        isExternal: false,
        description: "",
        projectIds: [],
      }),
    });

    if (ok) {
      closeDeadlineEditor();
    }
  };

  const deleteMilestoneDraft = async () => {
    if (!activeMilestoneId) {
      return;
    }

    const ok = await runMutation(`/api/milestones/${activeMilestoneId}`, {
      method: "DELETE",
    });

    if (ok) {
      closeMilestoneEditor();
    }
  };

  const deleteTaskDraft = async () => {
    if (!activeTaskId) {
      return;
    }

    const ok = await runMutation(`/api/tasks/${activeTaskId}`, {
      method: "DELETE",
    });

    if (ok) {
      closeTaskEditor();
    }
  };

  const clearTaskBlockers = async (task: Task, resolutionNote: string) => {
    const trimmedNote = resolutionNote.trim();
    if (!trimmedNote) {
      return;
    }

    const resolutionEntry = `Blockers cleared ${isoToday()}: ${trimmedNote}`;
    const nextSummary = `${task.summary.trim()}\n\n${resolutionEntry}`;
    const status = getAutoTaskStatus(
      { ...task, blockers: [] },
      taskById,
    );

    setTasks((current) =>
      current.map((candidate) =>
        candidate.id === task.id
          ? { ...candidate, blockers: [], isBlocked: false, status, summary: nextSummary }
          : candidate,
      ),
    );

    await runMutation(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify(mapTaskPayloadToServer({
        title: task.title,
        summary: nextSummary,
        subsystemId: task.subsystemId,
        disciplineId: task.disciplineId,
        mechanismId: task.mechanismId,
        partInstanceId: task.partInstanceId,
        targetEventId: task.targetEventId,
        ownerId: task.ownerId,
        mentorId: task.mentorId,
        dueDate: task.dueDate,
        priority: task.priority,
        status,
        dependencyIds: task.dependencyIds,
        checklistItems: task.checklistItems ?? [],
        blockers: [],
        linkedManufacturingIds: task.linkedManufacturingIds,
        linkedPurchaseIds: task.linkedPurchaseIds,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
      })),
    });
  };

  const startTask = async (task: Task) => {
    const currentTaskById = taskByIdRef.current;
    const status = getAutoTaskStatus(task, currentTaskById);

    if (status !== "in-progress" || task.status === "in-progress") {
      return;
    }

    setTasks((current) =>
      current.map((candidate) =>
        candidate.id === task.id ? { ...candidate, status } : candidate,
      ),
    );

    await runMutation(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: task.title,
        summary: task.summary,
        subsystemId: task.subsystemId,
        disciplineId: task.disciplineId,
        mechanismId: task.mechanismId,
        partInstanceId: task.partInstanceId,
        targetEventId: task.targetEventId,
        ownerId: task.ownerId,
        mentorId: task.mentorId,
        startDate: task.startDate || undefined,
        dueDate: task.dueDate,
        priority: task.priority,
        status,
        dependencyIds: task.dependencyIds,
        checklistItems: task.checklistItems ?? [],
        blockers: task.blockers,
        linkedManufacturingIds: task.linkedManufacturingIds,
        linkedPurchaseIds: task.linkedPurchaseIds,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
      }),
    });
  };
  startTaskRef.current = startTask;

  const requestTaskQa = async (task: Task) => {
    const mentorId =
      task.mentorId ||
      members.find((member) => member.role === "mentor" || member.role === "admin")?.id ||
      task.ownerId ||
      members[0]?.id ||
      "";
    const hasOpenDependency = task.dependencyIds
      .map((dependencyId) => taskById[dependencyId])
      .some((dependency) => dependency && dependency.status !== "complete");

    if (
      !mentorId ||
      task.status !== "in-progress" ||
      task.blockers.length > 0 ||
      hasOpenDependency
    ) {
      return;
    }

    setTasks((current) =>
      current.map((candidate) =>
        candidate.id === task.id
          ? { ...candidate, mentorId, status: "waiting-for-qa" }
          : candidate,
      ),
    );

    const ok = await runMutation(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: task.title,
        summary: task.summary,
        subsystemId: task.subsystemId,
        disciplineId: task.disciplineId,
        mechanismId: task.mechanismId,
        partInstanceId: task.partInstanceId,
        targetEventId: task.targetEventId,
        ownerId: task.ownerId,
        mentorId,
        dueDate: task.dueDate,
        priority: task.priority,
        status: "waiting-for-qa",
        dependencyIds: task.dependencyIds,
        checklistItems: task.checklistItems ?? [],
        blockers: task.blockers,
        linkedManufacturingIds: task.linkedManufacturingIds,
        linkedPurchaseIds: task.linkedPurchaseIds,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
      }),
    });

    if (ok) {
      setQaRequests((current) => [
        {
          id: `qa-request-local-${Date.now()}`,
          taskId: task.id,
          subject: task.title,
          mentorId,
          requestedById: signedInMember?.id ?? null,
          createdAt: new Date().toISOString(),
          status: "requested",
        },
        ...current,
      ]);
    } else {
      setTasks((current) =>
        current.map((candidate) =>
          candidate.id === task.id && candidate.status === "waiting-for-qa"
            ? { ...candidate, mentorId: task.mentorId, status: task.status }
            : candidate,
        ),
      );
    }
  };

  const openCreateWorkLogEditor = (taskId?: string) => {
    const selectedTaskId = taskId && taskById[taskId] ? taskId : tasks[0]?.id ?? "";

    setActiveWorkLogId(null);
    setWorkLogError(null);
    setWorkLogDraft(
      buildWorkLogDraft({
        taskId: selectedTaskId,
        date: isoToday(),
        participantIds: members[0]?.id ? [members[0].id] : [],
      }),
    );
    setWorkLogEditorMode("create");
  };

  const startWorkLogTimer = () => {
    if (workLogTimer) {
      return;
    }

    const timerId = `work-log-timer-${Date.now()}`;
    const nextTimer = {
      id: timerId,
      elapsedMs: 0,
      isPaused: false,
      reminderNotificationIds: [],
      startedAt: Date.now(),
    };

    workLogTimerRef.current = nextTimer;
    setWorkLogTimer(nextTimer);
    setWorkLogTimerTick(nextTimer.startedAt);
    void startWorkLogLiveActivity(nextTimer);
    void persistWorkLogTimerState(nextTimer);
    void cancelWorkLogTimerReminders()
      .then(() => schedulePersistedWorkLogTimerReminders(nextTimer))
      .then((notificationIds) => {
        setWorkLogTimer((currentTimer) => {
          if (
            !currentTimer ||
            currentTimer.id !== timerId ||
            currentTimer.isPaused ||
            currentTimer.startedAt === null
          ) {
            void cancelWorkLogTimerReminders(notificationIds);
            workLogTimerRef.current = currentTimer;
            return currentTimer;
          }

          const timerWithReminders = {
            ...currentTimer,
            reminderNotificationIds: notificationIds,
          };

          void persistWorkLogTimerState({
            elapsedMs: timerWithReminders.elapsedMs,
            id: timerWithReminders.id,
            isPaused: timerWithReminders.isPaused,
            reminderNotificationIds: timerWithReminders.reminderNotificationIds,
            startedAt: currentTimer.startedAt,
          });
          workLogTimerRef.current = timerWithReminders;
          return timerWithReminders;
        });
      });
  };

  const pauseWorkLogTimer = () => {
    if (!workLogTimer || workLogTimer.isPaused) {
      return;
    }

    const elapsedMs = getWorkLogTimerElapsedMs(workLogTimer);
    const nextTimer = {
      id: workLogTimer.id,
      elapsedMs,
      isPaused: true,
      reminderNotificationIds: [],
      startedAt: null,
    };

    workLogTimerRef.current = nextTimer;
    setWorkLogTimer(nextTimer);
    void persistWorkLogTimerState(nextTimer);
    void cancelWorkLogTimerReminders(workLogTimer.reminderNotificationIds);
    void updateWorkLogLiveActivity(nextTimer);
  };

  const openWorkLogFromTimer = () => {
    if (!workLogTimer) {
      return;
    }

    const elapsedMs = getWorkLogTimerElapsedMs(workLogTimer);

    setActiveWorkLogId(null);
    setWorkLogDraft(
      buildWorkLogDraft({
        taskId: tasks[0]?.id ?? "",
        date: isoToday(),
        hours: Number(formatHoursFromTimer(elapsedMs)),
        participantIds: members[0]?.id ? [members[0].id] : [],
      }),
    );
    workLogTimerRef.current = null;
    setWorkLogTimer(null);
    void clearPersistedWorkLogTimerState();
    void cancelWorkLogTimerReminders(workLogTimer.reminderNotificationIds);
    void endWorkLogLiveActivity();
    setWorkLogEditorMode("create");
  };

  const clearWorkLogTimer = () => {
    workLogTimerRef.current = null;
    setWorkLogTimer((currentTimer) => {
      if (currentTimer) {
        void cancelWorkLogTimerReminders(currentTimer.reminderNotificationIds);
      }

      return null;
    });
    void clearPersistedWorkLogTimerState();
    void endWorkLogLiveActivity();
  };

  const openEditWorkLogEditor = (workLog: WorkLog) => {
    setActiveWorkLogId(workLog.id);
    setWorkLogDraft(buildWorkLogDraft(workLog));
    setWorkLogError(null);
    setWorkLogEditorMode("edit");
  };

  const closeWorkLogEditor = () => {
    setWorkLogEditorMode(null);
    setActiveWorkLogId(null);
    setWorkLogError(null);
  };

  const saveWorkLogDraft = async () => {
    const participants = splitList(workLogDraft.participantIdsText).filter((participantId) =>
      members.some((member) => member.id === participantId),
    );
    const parsedHours = Number(workLogDraft.hours);
    const notes = workLogDraft.notes.trim();

    const missingFields = [
      !workLogDraft.taskId || !taskById[workLogDraft.taskId] ? "task" : null,
      Number.isNaN(parsedHours) || parsedHours <= 0 ? "hours" : null,
      participants.length === 0 ? "participants" : null,
      !notes ? "notes" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setWorkLogError(`Add ${missingFields.join(", ")} before saving this work log.`);
      return;
    }

    setWorkLogError(null);

    const payload = {
      taskId: workLogDraft.taskId,
      date: workLogDraft.date || isoToday(),
      hours: parsedHours,
      participantIds: participants,
      notes,
    };

    const isEdit = workLogEditorMode === "edit" && activeWorkLogId;
    if (isEdit) {
      const localDraft = pendingWorkLogDraftsRef.current.find(
        (draft) => draft.id === activeWorkLogId,
      );

      if (localDraft) {
        const nextFingerprint = buildWorkLogDraftFingerprint(payload);
        const didChangeLocalDraftPayload = nextFingerprint !== localDraft.fingerprint;
        const remainingDrafts = removePendingWorkLogDraft(
          pendingWorkLogDraftsRef.current,
          localDraft.id,
        );
        const result = enqueuePendingWorkLogDraft(
          remainingDrafts,
          payload,
          new Date(),
          {
            ownerKey: localDraft.ownerKey ?? activeWorkLogDraftOwnerKey,
            ...(didChangeLocalDraftPayload
              ? { status: "pending" as const }
              : {
                  attemptCount: localDraft.attemptCount,
                  error: localDraft.error,
                  status:
                    localDraft.status === "syncing" ? "pending" : localDraft.status,
                }),
          },
        );
        await persistPendingWorkLogDrafts(result.drafts);
        closeWorkLogEditor();
        return;
      }

      const ok = await runMutation(`/api/work-logs/${activeWorkLogId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (ok) {
        const loggedTask = taskById[payload.taskId];
        if (loggedTask) {
          await startTask(loggedTask);
        }

        closeWorkLogEditor();
      }

      return;
    }

    const fingerprint = buildWorkLogDraftFingerprint(payload);
    if (
      pendingWorkLogDraftsRef.current.some(
        (draft) =>
          draft.fingerprint === fingerprint &&
          isWorkLogDraftOwnedBy(draft, activeWorkLogDraftOwnerKey),
      )
    ) {
      setSyncError("Work log draft is already saved locally and waiting to sync.");
      closeWorkLogEditor();
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    let serverCreateSucceeded = false;
    try {
      await requestJson<WorkLogMutationResponse>(
        apiBaseUrl,
        "/api/work-logs",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        apiToken,
      );
      serverCreateSucceeded = true;
      const refreshedPayload = await refreshWorkspaceFromServer(apiToken);
      const draftSyncError = await syncPendingWorkLogDrafts(
        apiToken,
        ensureArray(refreshedPayload.workLogs),
        activeWorkLogDraftOwnerKey,
      );
      setBackendStatus(draftSyncError ? "offline" : "connected");
      setSyncError(draftSyncError);

      const loggedTask = taskById[workLogDraft.taskId];
      if (loggedTask) {
        await startTask(loggedTask);
      }

      closeWorkLogEditor();
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      if (serverCreateSucceeded) {
        setBackendStatus("offline");
        setSyncError(getClientErrorMessage(error));
        closeWorkLogEditor();
        return;
      }

      if (!shouldQueueWorkLogDraftAfterError(error)) {
        setBackendStatus("offline");
        setSyncError(getClientErrorMessage(error));
        return;
      }

      const message = getClientErrorMessage(error);
      const result = enqueuePendingWorkLogDraft(
        pendingWorkLogDraftsRef.current,
        payload,
        new Date(),
        {
          attemptCount: 1,
          error: message,
          ownerKey: activeWorkLogDraftOwnerKey,
          status: "failed",
        },
      );
      await persistPendingWorkLogDrafts(result.drafts);
      setBackendStatus("offline");
      setSyncError(
        result.didCreate
          ? "Work log saved locally. It will sync when the backend is reachable."
          : "Work log draft is already saved locally and waiting to sync.",
      );
      closeWorkLogEditor();
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteWorkLogDraft = async () => {
    if (!activeWorkLogId) {
      return;
    }

    const localDraft = pendingWorkLogDraftsRef.current.find(
      (draft) => draft.id === activeWorkLogId,
    );

    if (localDraft) {
      await persistPendingWorkLogDrafts(
        removePendingWorkLogDraft(pendingWorkLogDraftsRef.current, localDraft.id),
      );
      closeWorkLogEditor();
      return;
    }

    const ok = await runMutation(`/api/work-logs/${activeWorkLogId}`, {
      method: "DELETE",
    });

    if (ok) {
      closeWorkLogEditor();
    }
  };

  const openCreateManufacturingEditor = () => {
    const process =
      manufacturingView === "cnc"
        ? "cnc"
        : manufacturingView === "prints"
          ? "3d-print"
          : "fabrication";
    const requesterId = signedInMember?.id ?? members[0]?.id ?? "";

    setActiveManufacturingId(null);
    setManufacturingError(null);
    setManufacturingDraft(
      buildManufacturingDraft(process, {
        subsystemId: subsystems[0]?.id ?? "",
        requestedById: requesterId,
        dueDate: isoToday(),
      }),
    );
    setManufacturingEditorMode("create");
  };

  const openEditManufacturingEditor = (item: ManufacturingItem) => {
    setActiveManufacturingId(item.id);
    setManufacturingDraft(buildManufacturingDraft(item.process, item));
    setManufacturingError(null);
    setManufacturingEditorMode("edit");
  };

  const closeManufacturingEditor = () => {
    setManufacturingEditorMode(null);
    setActiveManufacturingId(null);
    setManufacturingError(null);
  };

  const saveManufacturingDraft = async () => {
    const parsedQty = Number(manufacturingDraft.quantity);
    const parsedQaReviewCount = Number(manufacturingDraft.qaReviewCount);
    const title = manufacturingDraft.title.trim();
    const material = manufacturingDraft.material.trim();
    const missingFields = [
      !title ? "title" : null,
      !manufacturingDraft.subsystemId ? "subsystem" : null,
      !manufacturingDraft.requestedById ? "requester" : null,
      !material ? "material" : null,
      Number.isNaN(parsedQty) || parsedQty <= 0 ? "quantity" : null,
      Number.isNaN(parsedQaReviewCount) || parsedQaReviewCount < 0 ? "QA review count" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setManufacturingError(`Add ${missingFields.join(", ")} before saving this manufacturing item.`);
      return;
    }

    setManufacturingError(null);

    const payload = {
      title,
      subsystemId: manufacturingDraft.subsystemId,
      requestedById: manufacturingDraft.requestedById,
      process: manufacturingDraft.process,
      dueDate: manufacturingDraft.dueDate || isoToday(),
      material,
      quantity: parsedQty,
      status: manufacturingDraft.status,
      mentorReviewed: manufacturingDraft.mentorReviewed,
      batchLabel: manufacturingDraft.batchLabel.trim() || undefined,
      qaReviewCount: parsedQaReviewCount,
    };

    const isEdit = manufacturingEditorMode === "edit" && activeManufacturingId;
    const ok = await runMutation(
      isEdit ? `/api/manufacturing/${activeManufacturingId}` : "/api/manufacturing",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok) {
      closeManufacturingEditor();
    }
  };

  const deleteManufacturingDraft = async () => {
    if (!activeManufacturingId) {
      return;
    }

    const ok = await runMutation(`/api/manufacturing/${activeManufacturingId}`, {
      method: "DELETE",
    });

    if (ok) {
      closeManufacturingEditor();
    }
  };

  const patchManufacturingItem = async (
    item: ManufacturingItem,
    patch: Partial<Pick<ManufacturingItem, "mentorReviewed" | "status">>,
  ) => {
    const nextItem = { ...item, ...patch };

    setManufacturingItems((current) =>
      current.map((manufacturingItem) =>
        manufacturingItem.id === item.id ? nextItem : manufacturingItem,
      ),
    );

    await runMutation(`/api/manufacturing/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: nextItem.title,
        subsystemId: nextItem.subsystemId,
        requestedById: nextItem.requestedById,
        process: nextItem.process,
        dueDate: nextItem.dueDate,
        material: nextItem.material,
        quantity: nextItem.quantity,
        status: nextItem.status,
        mentorReviewed: nextItem.mentorReviewed,
        batchLabel: nextItem.batchLabel,
        qaReviewCount: nextItem.qaReviewCount,
      }),
    });
  };

  const openCreatePurchaseEditor = () => {
    setActivePurchaseId(null);
    setPurchaseError(null);
    setPurchaseDraft(
      buildPurchaseDraft({
        subsystemId: subsystems[0]?.id ?? "",
        requestedById: members[0]?.id ?? "",
      }),
    );
    setPurchaseEditorMode("create");
  };

  const openMaterialRestockEditor = (row: MaterialRollup) => {
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

    setActivePurchaseId(null);
    setPurchaseError(null);
    setPurchaseDraft(
      buildPurchaseDraft({
        title: `Restock ${row.name}`,
        subsystemId: relatedManufacturingItem?.subsystemId ?? subsystems[0]?.id ?? "",
        requestedById: signedInMember?.id ?? members[0]?.id ?? "",
        quantity: Math.max(row.suggestedOrderQuantity, row.reorderPoint),
        vendor: row.vendor === "Mixed" ? "" : row.vendor,
        linkLabel: relatedPurchase?.linkLabel ?? "",
        status: "requested",
      }),
    );
    setPurchaseEditorMode("create");
  };

  const openEditPurchaseEditor = (item: PurchaseItem) => {
    setActivePurchaseId(item.id);
    setPurchaseDraft(buildPurchaseDraft(item));
    setPurchaseError(null);
    setPurchaseEditorMode("edit");
  };

  const closePurchaseEditor = () => {
    setPurchaseEditorMode(null);
    setActivePurchaseId(null);
    setPurchaseError(null);
  };

  const savePurchaseDraft = async () => {
    const parsedQty = Number(purchaseDraft.quantity);
    const parsedEstimate = Number(purchaseDraft.estimatedCost);
    const parsedFinal = purchaseDraft.finalCost.trim() ? Number(purchaseDraft.finalCost) : undefined;
    const title = purchaseDraft.title.trim();
    const vendor = purchaseDraft.vendor.trim();
    const linkLabel = purchaseDraft.linkLabel.trim();
    const invalidFinalCost =
      purchaseDraft.finalCost.trim() &&
      (typeof parsedFinal !== "number" || Number.isNaN(parsedFinal) || parsedFinal < 0);
    const missingFields = [
      !title ? "title" : null,
      !purchaseDraft.subsystemId ? "subsystem" : null,
      !purchaseDraft.requestedById ? "requester" : null,
      !vendor ? "vendor" : null,
      Number.isNaN(parsedQty) || parsedQty <= 0 ? "quantity" : null,
      Number.isNaN(parsedEstimate) || parsedEstimate < 0 ? "estimated cost" : null,
      invalidFinalCost ? "final cost" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setPurchaseError(`Add ${missingFields.join(", ")} before saving this purchase.`);
      return;
    }

    setPurchaseError(null);

    const payload = {
      title,
      subsystemId: purchaseDraft.subsystemId,
      requestedById: purchaseDraft.requestedById,
      quantity: parsedQty,
      vendor,
      linkLabel: linkLabel || "n/a",
      estimatedCost: parsedEstimate,
      finalCost:
        typeof parsedFinal === "number" && !Number.isNaN(parsedFinal) ? parsedFinal : undefined,
      approvedByMentor: purchaseDraft.approvedByMentor,
      status: purchaseDraft.status,
    };

    const isEdit = purchaseEditorMode === "edit" && activePurchaseId;
    const ok = await runMutation(
      isEdit ? `/api/purchases/${activePurchaseId}` : "/api/purchases",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok) {
      closePurchaseEditor();
    }
  };

  const deletePurchaseDraft = async () => {
    if (!activePurchaseId) {
      return;
    }

    const ok = await runMutation(`/api/purchases/${activePurchaseId}`, {
      method: "DELETE",
    });

    if (ok) {
      closePurchaseEditor();
    }
  };

  const openCreateMemberEditor = (role: MemberRole = "student") => {
    if (!canMentorApprove) {
      return;
    }

    setActiveMemberId(null);
    setMemberError(null);
    setMemberDraft(buildMemberDraft({ role }));
    setMemberEditorMode("create");
  };

  const openEditMemberEditor = (memberId: string) => {
    const member = members.find((candidate) => candidate.id === memberId);
    if (!member) {
      return;
    }

    setActiveMemberId(member.id);
    setMemberError(null);
    setMemberDraft(buildMemberDraft(member));
    setMemberEditorMode("edit");
  };

  const closeMemberEditor = () => {
    setMemberEditorMode(null);
    setActiveMemberId(null);
    setMemberError(null);
  };

  const showProfilePhotoUrlOnlyMessage = () => {
    setMemberError("Paste a hosted image URL below. Mobile file upload is not available yet.");
  };

  const saveMemberDraft = async () => {
    if (!canMentorApprove) {
      setMemberError("Only mentors can invite or edit people.");
      return;
    }

    const name = memberDraft.name.trim();
    const email = memberDraft.email.trim().toLowerCase();
    const duplicateName = members.some(
      (member) =>
        member.id !== activeMemberId &&
        member.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (!name) {
      setMemberError("Add a name before saving this roster member.");
      return;
    }

    if (duplicateName) {
      setMemberError("A roster member with this name already exists.");
      return;
    }

    setMemberError(null);

    const payload = {
      disciplineId: memberDraft.disciplineId || null,
      elevated: memberDraft.role === "lead" || memberDraft.role === "admin",
      email,
      name,
      photoUrl: memberDraft.photoUrl.trim(),
      plannedAttendanceDays: memberDraft.plannedAttendanceDays,
      plannedAttendanceNotes: memberDraft.plannedAttendanceNotes.trim(),
      plannedWeeklyAttendanceHours: Math.max(
        0,
        Number(memberDraft.plannedWeeklyAttendanceHours) || 0,
      ),
      role: memberDraft.role,
    };

    const isEdit = memberEditorMode === "edit" && activeMemberId;
    const ok = await runMutation(
      isEdit ? `/api/members/${activeMemberId}` : "/api/members",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok) {
      closeMemberEditor();
    }
  };

  const deleteMemberDraft = async () => {
    if (!activeMemberId) {
      return;
    }

    const ok = await runMutation(`/api/members/${activeMemberId}`, {
      method: "DELETE",
    });

    if (ok) {
      closeMemberEditor();
    }
  };

  const openCreateSubsystemEditor = () => {
    setActiveSubsystemId(null);
    setSubsystemError(null);
    setSubsystemDraft(
      buildSubsystemDraft({
        responsibleEngineerId: members[0]?.id ?? "",
      }),
    );
    setSubsystemEditorMode("create");
  };

  const openEditSubsystemEditor = (subsystem: Subsystem) => {
    setActiveSubsystemId(subsystem.id);
    setSubsystemError(null);
    setSubsystemDraft(buildSubsystemDraft(subsystem));
    setSubsystemEditorMode("edit");
  };

  const closeSubsystemEditor = () => {
    setSubsystemEditorMode(null);
    setActiveSubsystemId(null);
    setSubsystemError(null);
  };

  const saveSubsystemDraft = async () => {
    const mentors = splitList(subsystemDraft.mentorIdsText).filter((mentorId) =>
      members.some((member) => member.id === mentorId),
    );
    const risks = splitList(subsystemDraft.risksText);
    const name = subsystemDraft.name.trim();
    const description = subsystemDraft.description.trim();
    const missingFields = [
      !name ? "name" : null,
      !description ? "description" : null,
      !subsystemDraft.responsibleEngineerId || !membersById[subsystemDraft.responsibleEngineerId]
        ? "responsible engineer"
        : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setSubsystemError(`Add ${missingFields.join(", ")} before saving this subsystem.`);
      return;
    }

    setSubsystemError(null);

    const payload = {
      name,
      description,
      parentSubsystemId: null,
      responsibleEngineerId: subsystemDraft.responsibleEngineerId,
      mentorIds: mentors,
      risks,
    };

    const isEdit = subsystemEditorMode === "edit" && activeSubsystemId;
    const ok = await runMutation(
      isEdit ? `/api/subsystems/${activeSubsystemId}` : "/api/subsystems",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok) {
      closeSubsystemEditor();
    }
  };

  const deleteSubsystemDraft = async () => {
    if (!activeSubsystemId) {
      return;
    }

    const ok = await runMutation(`/api/subsystems/${activeSubsystemId}`, {
      method: "DELETE",
    });

    if (ok) {
      closeSubsystemEditor();
    }
  };

  const openCreatePartDefinitionEditor = () => {
    setActivePartDefinitionId(null);
    setPartDefinitionError(null);
    setPartDefinitionDraft(buildPartDefinitionDraft());
    setPartDefinitionEditorMode("create");
  };

  const openEditPartDefinitionEditor = (partDefinitionId: string) => {
    const partDefinition = partDefinitions.find((candidate) => candidate.id === partDefinitionId);
    if (!partDefinition) {
      return;
    }

    setActivePartDefinitionId(partDefinition.id);
    setPartDefinitionError(null);
    setPartDefinitionDraft(buildPartDefinitionDraft(partDefinition));
    setPartDefinitionEditorMode("edit");
  };

  const closePartDefinitionEditor = () => {
    setPartDefinitionEditorMode(null);
    setActivePartDefinitionId(null);
    setPartDefinitionError(null);
  };

  const createPartAcquisitionWork = async (
    partName: string,
    acquisitionMethod: AcquisitionMethod,
  ) => {
    if (acquisitionMethod === "stock") {
      return;
    }

    const subsystemId = subsystems[0]?.id ?? "";
    const requesterId = signedInMember?.id ?? members[0]?.id ?? "";
    const ownerId = requesterId;
    const mentorId =
      members.find((member) => member.role === "mentor" || member.role === "admin")?.id ??
      requesterId;
    const dueDate = isoToday();

    if (!subsystemId || !requesterId || !ownerId || !mentorId) {
      return;
    }

    if (acquisitionMethod === "manufacture") {
      await runMutation("/api/manufacturing", {
        method: "POST",
        body: JSON.stringify({
          title: `Make ${partName}`,
          subsystemId,
          requestedById: requesterId,
          process: "cnc",
          dueDate,
          material: partDefinitionDraft.source,
          quantity: 1,
          status: "requested",
          mentorReviewed: false,
          batchLabel: undefined,
          qaReviewCount: 0,
        }),
      });
    } else {
      await runMutation("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          title: `Buy ${partName}`,
          subsystemId,
          requestedById: requesterId,
          quantity: 1,
          vendor: partDefinitionDraft.source,
          linkLabel: "n/a",
          estimatedCost: 0,
          approvedByMentor: false,
          status: "requested",
        }),
      });
    }

    await runMutation("/api/tasks", {
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
        dependencyIds: [],
        checklistItems: [],
        blockers: [],
        linkedManufacturingIds: [],
        linkedPurchaseIds: [],
        estimatedHours: 0,
        actualHours: 0,
      })),
    });
  };

  const savePartDefinitionDraft = async () => {
    const partName = partDefinitionDraft.name.trim();
    const partNumber = partDefinitionDraft.partNumber.trim();
    const revision = partDefinitionDraft.revision.trim();
    const source = partDefinitionDraft.source.trim();
    const missingFields = [
      !partName ? "name" : null,
      !partNumber ? "part number" : null,
      !revision ? "revision" : null,
      !source ? "source" : null,
      !partDefinitionDraft.acquisitionMethod ? "acquisition method" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setPartDefinitionError(`Add ${missingFields.join(", ")} before saving this part definition.`);
      return;
    }

    setPartDefinitionError(null);

    const payload = {
      name: partName,
      partNumber,
      revision,
      type: partDefinitionDraft.source === "Onshape" ? "custom" : "cots",
      source,
      description: "",
    };

    const isEdit = partDefinitionEditorMode === "edit" && activePartDefinitionId;
    const ok = await runMutation(
      isEdit
        ? `/api/part-definitions/${activePartDefinitionId}`
        : "/api/part-definitions",
      {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    if (ok) {
      if (!isEdit) {
        await createPartAcquisitionWork(partName, partDefinitionDraft.acquisitionMethod);
      }

      closePartDefinitionEditor();
    }
  };

  const deletePartDefinitionDraft = async () => {
    if (!activePartDefinitionId) {
      return;
    }

    const ok = await runMutation(`/api/part-definitions/${activePartDefinitionId}`, {
      method: "DELETE",
    });

    if (ok) {
      closePartDefinitionEditor();
    }
  };

  const openCreateQaReportEditor = (taskId = tasks[0]?.id ?? "", qaRequestId?: string) => {
    const request = qaRequestId ? qaRequests.find((candidate) => candidate.id === qaRequestId) : null;

    setQaReportDraft({
      taskId,
      participantIdsText: request?.requestedById ?? signedInMember?.id ?? members[0]?.id ?? "",
      result: "pass",
      mentorApproved: Boolean(canMentorApprove),
      notes: "",
      evidenceNotes: "",
      followUpTaskTitle: "",
    });
    setActiveQaRequestId(request?.id ?? null);
    setQaReportError(null);
    setQaReportEditorMode("create");
  };

  const closeQaReportEditor = () => {
    setQaReportEditorMode(null);
    setActiveQaRequestId(null);
    setQaReportError(null);
  };

  const createQaRequest = (subject: string, mentorId: string, taskId?: string | null) => {
    const trimmedSubject = subject.trim();
    const task = taskId ? taskById[taskId] : null;
    const requestSubject = trimmedSubject || task?.title.trim() || "";

    if (!requestSubject || !membersById[mentorId]) {
      return;
    }

    setQaRequests((current) => [
      {
        id: `qa-request-local-${Date.now()}`,
        taskId: task?.id ?? null,
        subject: requestSubject,
        mentorId,
        requestedById: signedInMember?.id ?? null,
        createdAt: new Date().toISOString(),
        status: "requested",
      },
      ...current,
    ]);
  };

  const requestHelp = (input: HelpRequestInput) => {
    if (!rosterMentors.some((mentor) => mentor.id === input.mentorId)) {
      return false;
    }

    const request = buildHelpRequest({
      ...input,
      requestedById: input.requestedById ?? signedInMember?.id ?? null,
    });

    if (!request) {
      return false;
    }

    setHelpRequests((current) => [request, ...current]);
    return true;
  };

  const saveQaReportDraft = async () => {
    const task = taskById[qaReportDraft.taskId];
    const participants = splitList(qaReportDraft.participantIdsText).filter(
      (participantId) => membersById[participantId],
    );

    const missingFields = [
      !task ? "task" : null,
      participants.length === 0 ? "participants" : null,
      !qaReportDraft.notes.trim() ? "notes" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setQaReportError(`Add ${missingFields.join(", ")} before saving this QA report.`);
      return;
    }

    if (task && qaReportDraft.result === "pass" && !isTaskReadyForQaPass(task, taskById)) {
      setQaReportError(
        "A pass report can only complete a task that is waiting for QA with no blockers or unfinished dependencies.",
      );
      return;
    }

    setQaReportError(null);
    const linkedQaRequest =
      (activeQaRequestId
        ? qaRequests.find((request) => request.id === activeQaRequestId)
        : null) ??
      qaRequests.find((request) => request.taskId === task.id);
    const nextQaReview: QaReview = {
      id: `qa-local-${Date.now()}`,
      taskId: task.id,
      subjectId: task.id,
      subjectType: "task",
      subjectTitle: task.title,
      participantIds: participants,
      requestedById: linkedQaRequest?.requestedById ?? null,
      mentorId: linkedQaRequest?.mentorId ?? task.mentorId,
      result: qaReportDraft.result,
      mentorApproved: qaReportDraft.mentorApproved,
      notes: qaReportDraft.notes.trim(),
      evidenceNotes: qaReportDraft.evidenceNotes.trim(),
    };

    if (qaReportDraft.result !== "pass") {
      const followUpTitle =
        qaReportDraft.followUpTaskTitle.trim() ||
        (qaReportDraft.result === "iteration-worthy"
          ? `Iterate after QA: ${task.title}`
          : `Fix QA finding: ${task.title}`);
      const followUpSummary = [
        `Created from QA on "${task.title}".`,
        `Result: ${qaReportDraft.result}.`,
        qaReportDraft.notes.trim(),
        qaReportDraft.evidenceNotes.trim() ? `Evidence: ${qaReportDraft.evidenceNotes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const followUpTask = {
        title: followUpTitle,
        summary: followUpSummary,
        subsystemId: task.subsystemId,
        disciplineId: task.disciplineId,
        mechanismId: task.mechanismId,
        partInstanceId: task.partInstanceId,
        targetEventId: task.targetEventId,
        ownerId: task.ownerId,
        mentorId: task.mentorId,
        dueDate: isoToday(),
        priority: qaReportDraft.result === "iteration-worthy" ? "high" : "medium",
        status: "not-started",
        dependencyIds: [],
        checklistItems: [],
        blockers: [],
        linkedManufacturingIds: task.linkedManufacturingIds,
        linkedPurchaseIds: task.linkedPurchaseIds,
        estimatedHours: 0,
        actualHours: 0,
      } satisfies Omit<Task, "id" | "isBlocked">;
      const localFollowUpTask: Task = {
        ...followUpTask,
        id: `task-local-qa-${Date.now()}`,
        isBlocked: false,
      };

      setTasks((current) => [localFollowUpTask, ...current]);
      await runMutation("/api/tasks", {
        method: "POST",
        body: JSON.stringify(followUpTask),
      });
    }

    if (qaReportDraft.result === "pass") {
      const completedTasks = tasks.map((candidate) =>
        candidate.id === task.id ? { ...candidate, status: "complete" as TaskStatus } : candidate,
      );
      const completedTaskById = Object.fromEntries(
        completedTasks.map((candidate) => [candidate.id, candidate]),
      ) as Record<string, Task>;
      const nextTasks = completedTasks.map((candidate) =>
        candidate.id === task.id
          ? candidate
          : { ...candidate, status: getAutoTaskStatus(candidate, completedTaskById) },
      );
      const changedStatusTasks = nextTasks.filter(
        (candidate) => taskById[candidate.id]?.status !== candidate.status,
      );

      setTasks(nextTasks);

      for (const changedTask of changedStatusTasks) {
        await runMutation(`/api/tasks/${changedTask.id}`, {
          method: "PATCH",
          body: JSON.stringify(buildTaskMutationPayload(changedTask)),
        });
      }
    }

    if (qaReportDraft.result === "iteration-worthy") {
      setTasks((current) =>
        current.map((candidate) =>
          candidate.id === task.id
            ? (() => {
                const nextBlockers = Array.from(
                  new Set([...candidate.blockers, "QA identified iteration-worthy follow-up."]),
                );

                return {
                  ...candidate,
                  blockers: nextBlockers,
                  isBlocked: nextBlockers.length > 0,
                  status: candidate.status === "complete" ? "waiting-for-qa" : candidate.status,
                };
              })()
            : candidate,
        ),
      );
    }

    setQaReviews((current) => [nextQaReview, ...current]);
    setQaRequests((current) =>
      current.filter(
        (request) =>
          request.id !== linkedQaRequest?.id &&
          request.taskId !== task.id,
      ),
    );
    closeQaReportEditor();
  };

  const openCreateEventReportEditor = (eventId = events[0]?.id ?? "") => {
    setEventReportDraft({
      eventId,
      summary: "",
      findingText: "",
      followUpTaskTitle: "",
    });
    setEventReportError(null);
    setEventReportEditorMode("create");
  };

  const closeEventReportEditor = () => {
    setEventReportEditorMode(null);
    setEventReportError(null);
  };

  const saveEventReportDraft = async () => {
    const event = eventsById[eventReportDraft.eventId];

    const missingFields = [
      !event ? "event" : null,
      !eventReportDraft.summary.trim() ? "summary" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setEventReportError(`Add ${missingFields.join(", ")} before saving this event report.`);
      return;
    }

    setEventReportError(null);
    const nextEventReport: EventReportDraft = {
      eventId: event.id,
      summary: eventReportDraft.summary.trim(),
      findingText: eventReportDraft.findingText.trim(),
      followUpTaskTitle: eventReportDraft.followUpTaskTitle.trim(),
    };

    const followUpTitle = eventReportDraft.followUpTaskTitle.trim();
    if (followUpTitle) {
      const subsystemId = event.relatedSubsystemIds[0] ?? subsystems[0]?.id ?? "";
      const ownerId = signedInMember?.id ?? members[0]?.id ?? "";
      const mentorId =
        members.find((member) => member.role === "mentor" || member.role === "admin")?.id ??
        ownerId;

      if (subsystemId && ownerId && mentorId) {
        const followUpTask = {
          title: followUpTitle,
          summary: eventReportDraft.findingText.trim() || `Follow up from ${event.title}.`,
          subsystemId,
          disciplineId: disciplines[0]?.id || "mechanical",
          mechanismId: null,
          partInstanceId: null,
          targetEventId: event.id,
          ownerId,
          mentorId,
          dueDate: isoToday(),
          priority: "medium",
          status: "not-started",
          dependencyIds: [],
          checklistItems: [],
          blockers: [],
          linkedManufacturingIds: [],
          linkedPurchaseIds: [],
          estimatedHours: 0,
          actualHours: 0,
        } satisfies Omit<Task, "id" | "isBlocked">;
        const localFollowUpTask: Task = {
          ...followUpTask,
          id: `task-local-event-${Date.now()}`,
          isBlocked: false,
        };

        setTasks((current) => [localFollowUpTask, ...current]);
        await runMutation("/api/tasks", {
          method: "POST",
          body: JSON.stringify(followUpTask),
        });
      }
    }

    setEventReports((current) => [nextEventReport, ...current]);
    closeEventReportEditor();
  };

  const resetWorkspaceData = () => {
    setActivePersonFilter("all");
    setIsPersonMenuVisible(false);
    setIsSeasonMenuVisible(false);
    closeTaskEditor();
    closeWorkLogEditor();
    closeMilestoneEditor();
    closeDeadlineEditor();
    closeManufacturingEditor();
    closePurchaseEditor();
    closeMemberEditor();
    closeSubsystemEditor();
    closePartDefinitionEditor();
    closeQaReportEditor();
    closeEventReportEditor();
    clearWorkLogTimer();
    void syncFromBackend();
  };

  const clearWorkspaceForNewSeason = () => {
    setMembers((current) => current.filter((member) => member.role === "student"));
    setSubsystems([]);
    setDisciplines([]);
    setMechanisms([]);
    setTasks([]);
    setEvents([]);
    setWorkLogs([]);
    setManufacturingItems([]);
    setPurchaseItems([]);
    setPartDefinitions([]);
    setPartInstances([]);
    setQaReviews([]);
    setHelpRequests([]);
    setEventReports([]);
    clearWorkLogTimer();
    setActiveTab("home");
    setActivePersonFilter("all");
    setSelectedMemberId(null);
  };

  const createSeason = () => {
    const nextSeasonNumber = seasons.length + 1;
    const seasonId = `season-${Date.now()}`;
    const seasonLabel = nextSeasonNumber === 1 ? "New Season" : `New Season ${nextSeasonNumber}`;

    setSeasons((current) => [...current, { id: seasonId, label: seasonLabel }]);
    setActiveSeasonId(seasonId);
    setIsSeasonMenuVisible(false);
    clearWorkspaceForNewSeason();
  };

  const deleteSeason = (seasonId: string) => {
    setSeasons((current) => {
      const nextSeasons = current.filter((season) => season.id !== seasonId);

      if (activeSeasonId === seasonId) {
        setActiveSeasonId(nextSeasons[0]?.id ?? "");
      }

      return nextSeasons;
    });
  };

  const signOut = () => {
    setApiToken(null);
    setSessionUser(null);
    setHasAuthenticated(false);
    setAuthCode("");
    setAuthEmail("");
    setAuthError(null);
    setAuthNotice(null);
    setIsAuthenticating(false);
    setIsGoogleSignInPending(false);
    setHasRequestedEmailCode(false);
    setIsPersonMenuVisible(false);
    setIsSeasonMenuVisible(false);
    setIsNavMenuVisible(false);
    setIsProjectOverlayVisible(false);
    setActivePersonFilter("all");
    setSelectedMemberId(null);
    setSyncError(null);
    setHelpRequests([]);
    closeTaskEditor();
    closeWorkLogEditor();
    closeMilestoneEditor();
    closeDeadlineEditor();
    closeManufacturingEditor();
    closePurchaseEditor();
    closeMemberEditor();
    closeSubsystemEditor();
    closePartDefinitionEditor();
    closeQaReportEditor();
    closeEventReportEditor();
    clearWorkLogTimer();
  };

  const screenProps = {
    activeTaskSubteam,
    activeTaskSubteamLabel,
    appResponsiveStyles,
    attendancePreview,
    attendanceSummary,
    canMentorApprove,
    clearTaskBlockers,
    disciplinesById,
    editTagStyle,
    eventOptions,
    eventReports,
    events,
    eventsById,
    filteredManufacturing,
    filteredMaterialRollups,
    filteredMilestones,
    filteredPartDefinitions,
    filteredPartInstances,
    filteredPurchases,
    filteredSubsystems,
    filteredTaskQueue,
    filteredWorkLogs,
    helpRequests,
    homeActionItems,
    homeInventoryNeeds,
    homeMeetingExport,
    homePriorityTasks,
    homeTaskSummary,
    inventoryView,
    isCompactLayout,
    isLandscapeCardLayout,
    isLandscapeTimelineLayout,
    isSyncing,
    manufacturingItems,
    manufacturingArchiveFilter,
    manufacturingMaterialFilter,
    manufacturingMaterialOptions,
    manufacturingRequesterFilter,
    manufacturingSearch,
    manufacturingStatusFilter,
    manufacturingSubsystemFilter,
    manufacturingSummary,
    manufacturingView,
    materialsCategoryFilter,
    materialsSearch,
    materialsStockFilter,
    mechanisms,
    mechanismsById,
    meetingAttendance,
    members,
    membersById,
    milestoneSearch,
    milestoneSortField,
    milestoneSortOrder,
    milestoneSummary,
    milestoneTypeFilter,
    openCreateDeadlineEditor,
    createQaRequest,
    openCreateEventReportEditor,
    openCreateManufacturingEditor,
    openCreateMemberEditor,
    openCreateMilestoneEditor,
    openCreatePartDefinitionEditor,
    openCreatePurchaseEditor,
    openCreateQaReportEditor,
    openCreateSubsystemEditor,
    openCreateTaskEditor,
    openCreateWorkLogEditor,
    openWorkLogFromTimer,
    openEditManufacturingEditor,
    openEditMemberEditor,
    openEditMilestoneEditor,
    openEditPartDefinitionEditor,
    openEditPurchaseEditor,
    openEditSubsystemEditor,
    openEditTaskEditor,
    openEditWorkLogEditor,
    openDuplicateTaskEditor,
    openInventoryPurchases,
    openMaterialRestockEditor,
    openTaskQueueFromTask,
    partDefinitions,
    partDefinitionsById,
    partInstancesById,
    partInstancesWithStatus,
    partsSearch,
    partsStatusFilter,
    partsSubsystemFilter,
    patchManufacturingItem,
    purchaseApprovalFilter,
    purchaseArchiveFilter,
    purchaseItems,
    purchaseRequesterFilter,
    purchaseSearch,
    purchaseStatusFilter,
    purchaseSubsystemFilter,
    purchaseVendorFilter,
    purchaseVendorOptions,
    qaRequests,
    qaReviews,
    reportSummary,
    requestHelp,
    riskRows,
    riskSummary,
    rosterAdmins,
    rosterExternal,
    rosterMentors,
    rosterStudents,
    requestTaskQa,
    selectedMemberId,
    selectedSubsystem,
    setActiveTab,
    setActiveTaskSubteam,
    setAttendanceStatusByMemberId,
    setManufacturingArchiveFilter,
    setManufacturingMaterialFilter,
    setManufacturingRequesterFilter,
    setManufacturingSearch,
    setManufacturingStatusFilter,
    setManufacturingSubsystemFilter,
    setMaterialsCategoryFilter,
    setMaterialsSearch,
    setMaterialsStockFilter,
    setMilestoneSearch,
    setMilestoneSortField,
    setMilestoneSortOrder,
    setMilestoneTypeFilter,
    setPartsSearch,
    setPartsStatusFilter,
    setPartsSubsystemFilter,
    setPurchaseApprovalFilter,
    setPurchaseArchiveFilter,
    setPurchaseRequesterFilter,
    setPurchaseSearch,
    setPurchaseStatusFilter,
    setPurchaseSubsystemFilter,
    setPurchaseVendorFilter,
    setSelectedMemberId,
    setSelectedSubsystemId,
    setSubsystemSearch,
    setTaskArchiveFilter,
    setTaskBlockerFilter,
    setTaskOwnerFilter,
    setTaskPriorityFilter,
    setTaskSearch,
    setTaskStatusFilter,
    setTaskSubsystemFilter,
    setTaskView,
    setTimelineMilestoneFilter,
    setTimelineSubsystemFilter,
    setWorkLogSearch,
    setWorkLogSortMode,
    setWorkLogSubsystemFilter,
    shiftTaskDueDates,
    startWorkLogTimer,
    subsystemCountsById,
    subsystemSearch,
    subsystems,
    subsystemsById,
    syncFromBackend,
    startTask,
    taskArchiveFilter,
    taskBlockerFilter,
    taskById,
    taskOwnerFilter,
    taskPriorityFilter,
    taskSearch,
    taskStatusFilter,
    taskSubsystemFilter,
    taskLoggedHoursById,
    taskSummary,
    taskView,
    tasks,
    themeColors,
    timelineMilestoneFilter,
    timelineSubsystemFilter,
    timelineTasks,
    workLogSearch,
    workLogs,
    workLogSortMode,
    workLogSubsystemFilter,
    workLogSummary,
    workTimerElapsedLabel,
    workTimerIsActive: Boolean(workLogTimer),
    workTimerIsPaused: Boolean(workLogTimer?.isPaused),
    pauseWorkLogTimer,
  };
  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen {...screenProps} />;
      case "attendance":
        return <AttendanceScreen {...screenProps} />;
      case "tasks":
        return <TasksScreen {...screenProps} />;
      case "worklogs":
        return <WorkLogsScreen {...screenProps} />;
      case "manufacturing":
        return <ManufacturingScreen {...screenProps} />;
      case "inventory":
        return <InventoryScreen {...screenProps} />;
      case "subsystems":
        return <SubsystemsScreen {...screenProps} />;
      case "reports":
        return <ReportsScreen {...screenProps} />;
      case "risks":
        return <RisksScreen {...screenProps} />;
      default:
        return <RosterScreen {...screenProps} />;
    }
  };

  const renderEditorModals = () => {
    const taskOptions = tasks.map((task) => ({ id: task.id, name: task.title }));
    const memberOptions = members.map((member) => ({ id: member.id, name: member.name }));
    const subsystemOptions = taskSubsystemOptions;
    const disciplineOptions = disciplines.map((discipline) => ({
      id: discipline.id,
      name: discipline.name,
    }));
    const mechanismOptions = mechanisms
      .filter((mechanism) => mechanism.subsystemId === taskDraft.subsystemId)
      .map((mechanism) => ({
        id: mechanism.id,
        name: mechanism.name,
      }));
    const mechanismAndTaskPartOptions = taskDraft.mechanismId
      ? partInstances
          .filter((partInstance) => partInstance.mechanismId === taskDraft.mechanismId)
          .map((partInstance) => ({
            id: partInstance.id,
            name: `${partInstance.name} (${partDefinitionsById[partInstance.partDefinitionId]?.name ?? "part"})`,
          }))
      : [];

    return (
      <>
        <EditorModal
          onCancel={closeTaskEditor}
          onDelete={taskEditorMode === "edit" ? deleteTaskDraft : undefined}
          onSave={saveTaskDraft}
          saveLabel={taskEditorMode === "edit" ? "Update task" : "Create task"}
          title={taskEditorMode === "edit" ? "Edit task" : "Create task"}
          visible={Boolean(taskEditorMode)}
        >
          {taskEditorError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing task details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {taskEditorError}
              </Text>
            </View>
          ) : null}
          {taskDependencyReadinessMessage ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Waiting on dependencies
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {taskDependencyReadinessMessage}
              </Text>
            </View>
          ) : null}
          <View style={isLandscapeCardLayout ? styles.taskEditorLandscapeGrid : styles.taskEditorStack}>
            <View style={[styles.taskEditorStack, isLandscapeCardLayout && styles.taskEditorLandscapeColumn]}>
              <ModalField
                label="Title"
                onChangeText={(value) => setTaskDraft((current) => ({ ...current, title: value }))}
                placeholder="Task title"
                value={taskDraft.title}
              />
              <ModalField
                label="Summary"
                multiline
                onChangeText={(value) => setTaskDraft((current) => ({ ...current, summary: value }))}
                placeholder="Task summary"
                value={taskDraft.summary}
              />
              <ModalField
                label="Start date (YYYY-MM-DD)"
                onChangeText={(value) => setTaskDraft((current) => ({ ...current, startDate: value }))}
                placeholder={isoToday()}
                value={taskDraft.startDate}
              />
              <ModalField
                label="End date required (YYYY-MM-DD)"
                onChangeText={(value) => setTaskDraft((current) => ({ ...current, dueDate: value }))}
                placeholder="2026-04-24"
                value={taskDraft.dueDate}
              />
              <DropdownField
                clearLabel="No subsystem"
                label="Subsystem"
                onChange={(value) =>
                  setTaskDraft((current) => {
                    const subsystemId = value;
                    const nextMechanisms = mechanisms.filter(
                      (mechanism) => mechanism.subsystemId === subsystemId,
                    );
                    const mechanismId = nextMechanisms[0]?.id ?? null;
                    const partInstanceId = mechanismId
                      ? partInstances.find((partInstance) => partInstance.mechanismId === mechanismId)
                          ?.id ?? null
                      : null;

                    return {
                      ...current,
                      subsystemId,
                      mechanismId,
                      partInstanceId,
                    };
                  })
                }
                options={taskSubsystemOptions}
                placeholder="Select subsystem"
                value={taskDraft.subsystemId}
              />
              <DropdownField
                clearLabel="No discipline"
                label="Discipline"
                onChange={(value) =>
                  setTaskDraft((current) => ({ ...current, disciplineId: value }))
                }
                options={disciplineOptions}
                placeholder="Select discipline"
                value={taskDraft.disciplineId}
              />
            </View>

            <View style={[styles.taskEditorStack, isLandscapeCardLayout && styles.taskEditorLandscapeColumn]}>
              <DropdownField
                clearLabel="No mechanism"
                label="Mechanism"
                onChange={(value) =>
                  setTaskDraft((current) => {
                    const mechanismId = value || null;
                    const partInstanceId = mechanismId
                      ? partInstances.find((partInstance) => partInstance.mechanismId === mechanismId)
                          ?.id ?? null
                      : null;

                    return {
                      ...current,
                      mechanismId,
                      partInstanceId,
                    };
                  })
                }
                options={mechanismOptions}
                placeholder="Select mechanism"
                value={taskDraft.mechanismId || ""}
              />
              <DropdownField
                clearLabel="No part instance"
                label="Part instance"
                onChange={(value) =>
                  setTaskDraft((current) => ({
                    ...current,
                    partInstanceId: value || null,
                  }))
                }
                options={mechanismAndTaskPartOptions}
                placeholder="Select part instance"
                value={taskDraft.partInstanceId || ""}
              />
              <DropdownField
                clearLabel="No target event"
                label="Target event"
                onChange={(value) =>
                  setTaskDraft((current) => ({
                    ...current,
                    targetEventId: value || null,
                  }))
                }
                options={eventOptions}
                placeholder="Select target event"
                value={taskDraft.targetEventId || ""}
              />
              <DropdownField
                clearLabel="No owner"
                label="Owner"
                onChange={(value) =>
                  setTaskDraft((current) => ({ ...current, ownerId: value }))
                }
                options={memberOptions}
                placeholder="Select owner"
                value={taskDraft.ownerId}
              />
              <DropdownField
                clearLabel="No mentor"
                label="Mentor"
                onChange={(value) =>
                  setTaskDraft((current) => ({ ...current, mentorId: value }))
                }
                options={memberOptions}
                placeholder="Select mentor"
                value={taskDraft.mentorId}
              />
              <DropdownField
                label="Status"
                onChange={(value) =>
                  setTaskDraft((current) => ({
                    ...current,
                    status: value as TaskStatus,
                  }))
                }
                options={TASK_STATUS_OPTIONS}
                value={taskDraft.status}
              />
              <DropdownField
                label="Priority"
                onChange={(value) =>
                  setTaskDraft((current) => ({
                    ...current,
                    priority: value as TaskPriority,
                  }))
                }
                options={TASK_PRIORITY_OPTIONS}
                value={taskDraft.priority}
              />
              <AdvancedOptions>
                <View style={styles.modalField}>
                  <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>Traceability</Text>
                  <Text style={[styles.modalFieldInput, { backgroundColor: themeColors.canvas, borderColor: themeColors.border, color: themeColors.ink }]}>
                    {`${subsystemsById[taskDraft.subsystemId]?.name ?? "No subsystem"} / `}
                    {`${disciplinesById[taskDraft.disciplineId]?.name ?? "No discipline"} / `}
                    {`${taskDraft.mechanismId ? mechanismsById[taskDraft.mechanismId]?.name : "No mechanism"} / `}
                    {`${taskDraft.partInstanceId ? partInstancesById[taskDraft.partInstanceId]?.name : "No part instance"} / `}
                    {`${taskDraft.targetEventId ? eventsById[taskDraft.targetEventId]?.title : "No event"}`}
                  </Text>
                </View>
                <ModalField
                  label="Estimated hours"
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    setTaskDraft((current) => ({ ...current, estimatedHours: value }))
                  }
                  placeholder="4"
                  value={taskDraft.estimatedHours}
                />
                <ModalField
                  label="Checklist / substeps (comma separated)"
                  multiline
                  onChangeText={(value) =>
                    setTaskDraft((current) => ({ ...current, checklistItemsText: value }))
                  }
                  placeholder="Cut bracket, Deburr, Test fit, Add photo evidence"
                  value={taskDraft.checklistItemsText}
                />
                <View style={styles.modalField}>
                  <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>Dependencies</Text>
                  <View
                    style={[
                      styles.modalFieldInput,
                      { backgroundColor: themeColors.canvas, borderColor: themeColors.border },
                    ]}
                  >
                    {selectedTaskDependencies.length > 0 ? (
                      <View style={styles.quickActionRow}>
                        {selectedTaskDependencies.map((dependency) => (
                          <Pressable
                            key={dependency.id}
                            onPress={() => removeTaskDependency(dependency.id)}
                            style={[
                              styles.quickActionButton,
                              {
                                alignItems: "flex-start",
                                backgroundColor: themeColors.navySurface,
                                borderColor: themeColors.navySurface,
                                gap: 2,
                                maxWidth: "100%",
                              },
                            ]}
                          >
                            <Text
                              numberOfLines={2}
                              style={[styles.quickActionButtonLabel, { color: themeColors.navyInk }]}
                            >
                              {dependency.title}
                            </Text>
                            <Text
                              numberOfLines={2}
                              style={{ color: themeColors.subtleText, fontSize: 11, fontWeight: "700" }}
                            >
                              {`${STATUS_LABELS[dependency.status]} | due ${formatDate(dependency.dueDate)} | ${subsystemsById[dependency.subsystemId]?.name ?? "No subsystem"} | remove`}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ color: themeColors.subtleText }}>No dependencies selected</Text>
                    )}
                  </View>
                  {downstreamTaskDependencies.length > 0 ? (
                    <View
                      style={[
                        styles.modalFieldInput,
                        { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickActionButtonLabel,
                          { color: themeColors.ink, marginBottom: 6 },
                        ]}
                      >
                        Waiting on this task
                      </Text>
                      <View style={styles.quickActionRow}>
                        {downstreamTaskDependencies.map((dependentTask) => (
                          <View
                            key={dependentTask.id}
                            style={[
                              styles.quickActionButton,
                              {
                                alignItems: "flex-start",
                                backgroundColor: themeColors.canvas,
                                borderColor: themeColors.border,
                                gap: 2,
                                maxWidth: "100%",
                              },
                            ]}
                          >
                            <Text
                              numberOfLines={2}
                              style={[styles.quickActionButtonLabel, { color: themeColors.ink }]}
                            >
                              {dependentTask.title}
                            </Text>
                            <Text
                              numberOfLines={2}
                              style={{
                                color: themeColors.subtleText,
                                fontSize: 11,
                                fontWeight: "700",
                              }}
                            >
                              {`${STATUS_LABELS[dependentTask.status]} | due ${formatDate(dependentTask.dueDate)} | ${subsystemsById[dependentTask.subsystemId]?.name ?? "No subsystem"}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  <SearchField
                    onChangeText={setTaskDependencySearch}
                    placeholder="Search dependency tasks"
                    value={taskDependencySearch}
                  />
                  {availableTaskDependencyOptions.length > 0 ? (
                    <View style={styles.quickActionRow}>
                      {availableTaskDependencyOptions.map((dependency) => (
                        <Pressable
                          key={dependency.id}
                          onPress={() => addTaskDependency(dependency.id)}
                          style={[
                            styles.quickActionButton,
                            {
                              alignItems: "flex-start",
                              backgroundColor: themeColors.surface,
                              borderColor: themeColors.border,
                              gap: 2,
                              maxWidth: "100%",
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={2}
                            style={[styles.quickActionButtonLabel, { color: themeColors.ink }]}
                          >
                            {dependency.title}
                          </Text>
                          <Text
                            numberOfLines={2}
                            style={{ color: themeColors.subtleText, fontSize: 11, fontWeight: "700" }}
                          >
                            {`${STATUS_LABELS[dependency.status]} | due ${formatDate(dependency.dueDate)} | ${subsystemsById[dependency.subsystemId]?.name ?? "No subsystem"}`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                <ModalField
                  label="Blockers (comma separated)"
                  onChangeText={(value) =>
                    setTaskDraft((current) => ({ ...current, blockersText: value }))
                  }
                  placeholder="Waiting on batch, cable routing"
                  value={taskDraft.blockersText}
                />
              </AdvancedOptions>
            </View>
          </View>
        </EditorModal>

        <EditorModal
          onCancel={closeDeadlineEditor}
          onSave={saveDeadlineDraft}
          saveLabel="Create deadline"
          title="Create deadline"
          visible={deadlineEditorVisible}
        >
          <ModalField
            label="Title"
            onChangeText={setDeadlineTitle}
            placeholder="Deadline title"
            value={deadlineTitle}
          />
          <ModalField
            label="Day (YYYY-MM-DD)"
            onChangeText={setDeadlineDate}
            placeholder={localTodayDate()}
            value={deadlineDate}
          />
          {deadlineError ? (
            <Text style={{ color: themeColors.orangeInk }}>{deadlineError}</Text>
          ) : null}
        </EditorModal>

        <EditorModal
          onCancel={closeMilestoneEditor}
          onDelete={milestoneEditorMode === "edit" ? deleteMilestoneDraft : undefined}
          onSave={saveMilestoneDraft}
          saveLabel={milestoneEditorMode === "edit" ? "Update milestone" : "Create milestone"}
          title={milestoneEditorMode === "edit" ? "Edit milestone" : "Create milestone"}
          visible={Boolean(milestoneEditorMode)}
        >
          {milestoneError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing milestone details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {milestoneError}
              </Text>
            </View>
          ) : null}
          <ModalField
            label="Title"
            onChangeText={(value) => {
              setMilestoneError(null);
              setMilestoneDraft((current) => ({ ...current, title: value }));
            }}
            placeholder="Milestone title"
            value={milestoneDraft.title}
          />
          <DropdownField
            label="Type"
            onChange={(value) => {
              setMilestoneError(null);
              setMilestoneDraft((current) => ({
                ...current,
                type: value as EventType,
              }));
            }}
            options={EVENT_TYPE_OPTIONS}
            value={milestoneDraft.type}
          />
          <ModalField
            label="Start date (YYYY-MM-DD)"
            onChangeText={(value) => {
              setMilestoneError(null);
              setMilestoneStartDate(value);
            }}
            placeholder={localTodayDate()}
            value={milestoneStartDate}
          />
          <ModalField
            label="Start time (HH:mm)"
            onChangeText={(value) => {
              setMilestoneError(null);
              setMilestoneStartTime(value);
            }}
            placeholder="18:00"
            value={milestoneStartTime}
          />
          <AdvancedOptions>
            <ModalField
              label="End date (optional, YYYY-MM-DD)"
              onChangeText={(value) => {
                setMilestoneError(null);
                setMilestoneEndDate(value);
              }}
              placeholder="2026-04-30"
              value={milestoneEndDate}
            />
            <ModalField
              label="End time (optional, HH:mm)"
              onChangeText={(value) => {
                setMilestoneError(null);
                setMilestoneEndTime(value);
              }}
              placeholder="20:00"
              value={milestoneEndTime}
            />
            <ModalField
              label="Description"
              multiline
              onChangeText={(value) => {
                setMilestoneError(null);
                setMilestoneDraft((current) => ({ ...current, description: value }));
              }}
              placeholder="Milestone details"
              value={milestoneDraft.description}
            />
            <ModalField
              label="Related subsystem IDs (comma separated)"
              onChangeText={(value) => {
                setMilestoneError(null);
                setMilestoneDraft((current) => ({
                  ...current,
                  relatedSubsystemIdsText: value,
                }));
              }}
              placeholder="drive, controls"
              value={milestoneDraft.relatedSubsystemIdsText}
            />
            <ToggleField
              label="External milestone"
              onToggle={(value) => {
                setMilestoneError(null);
                setMilestoneDraft((current) => ({ ...current, isExternal: value }));
              }}
              value={milestoneDraft.isExternal}
            />
          </AdvancedOptions>
        </EditorModal>

        <EditorModal
          onCancel={closeWorkLogEditor}
          onDelete={workLogEditorMode === "edit" ? deleteWorkLogDraft : undefined}
          onSave={saveWorkLogDraft}
          saveLabel={workLogEditorMode === "edit" ? "Update work log" : "Create work log"}
          title={workLogEditorMode === "edit" ? "Edit work log" : "Create work log"}
          visible={Boolean(workLogEditorMode)}
        >
          {workLogError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing work log details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {workLogError}
              </Text>
            </View>
          ) : null}
          <DropdownField
            clearLabel="No task"
            label="Task"
            onChange={(value) => {
              setWorkLogError(null);
              setWorkLogDraft((current) => ({ ...current, taskId: value }));
            }}
            options={taskOptions}
            placeholder="Select task"
            value={workLogDraft.taskId}
          />
          <ModalField
            label="Date (YYYY-MM-DD)"
            onChangeText={(value) => {
              setWorkLogError(null);
              setWorkLogDraft((current) => ({ ...current, date: value }));
            }}
            placeholder="2026-04-24"
            value={workLogDraft.date}
          />
          <ModalField
            label="Hours"
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setWorkLogError(null);
              setWorkLogDraft((current) => ({ ...current, hours: value }));
            }}
            placeholder="2.5"
            value={workLogDraft.hours}
          />
          <ModalField
            label="Participants (member IDs, comma separated)"
            onChangeText={(value) => {
              setWorkLogError(null);
              setWorkLogDraft((current) => ({ ...current, participantIdsText: value }));
            }}
            placeholder="ava,jordan"
            value={workLogDraft.participantIdsText}
          />
          <View style={styles.quickActionRow}>
            {WORKLOG_TEMPLATE_OPTIONS.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => {
                  setWorkLogError(null);
                  setWorkLogDraft((current) => ({
                    ...current,
                    notes: current.notes.trim()
                      ? `${current.notes.trim()}\n\n${template.notes}`
                      : template.notes,
                  }));
                }}
                style={[styles.quickActionButton, appResponsiveStyles.quickActionButton]}
              >
                <Text style={[styles.quickActionButtonLabel, appResponsiveStyles.quickActionButtonLabel]}>
                  {template.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <ModalField
            label="Notes"
            multiline
            onChangeText={(value) => {
              setWorkLogError(null);
              setWorkLogDraft((current) => ({ ...current, notes: value }));
            }}
            placeholder="What was completed"
            value={workLogDraft.notes}
          />
        </EditorModal>

        <EditorModal
          onCancel={closeManufacturingEditor}
          onDelete={manufacturingEditorMode === "edit" ? deleteManufacturingDraft : undefined}
          onSave={saveManufacturingDraft}
          saveLabel={manufacturingEditorMode === "edit" ? "Update item" : "Create item"}
          title={manufacturingEditorMode === "edit" ? "Edit manufacturing item" : "Create manufacturing item"}
          visible={Boolean(manufacturingEditorMode)}
        >
          {manufacturingError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing manufacturing details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {manufacturingError}
              </Text>
            </View>
          ) : null}
          <ModalField
            label="Title"
            onChangeText={(value) => {
              setManufacturingError(null);
              setManufacturingDraft((current) => ({ ...current, title: value }));
            }}
            placeholder="Part title"
            value={manufacturingDraft.title}
          />
          <DropdownField
            clearLabel="No subsystem"
            label="Subsystem"
            onChange={(value) => {
              setManufacturingError(null);
              setManufacturingDraft((current) => ({
                ...current,
                subsystemId: value,
              }));
            }}
            options={subsystemOptions}
            placeholder="Select subsystem"
            value={manufacturingDraft.subsystemId}
          />
          {manufacturingEditorMode === "create" ? (
            <View style={styles.modalField}>
              <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>
                Requester
              </Text>
              <Text
                style={[
                  styles.modalFieldInput,
                  {
                    backgroundColor: themeColors.canvas,
                    borderColor: themeColors.border,
                    color: themeColors.ink,
                  },
                ]}
              >
                {membersById[manufacturingDraft.requestedById]?.name ??
                  signedInMember?.name ??
                  "Signed-in person"}
              </Text>
            </View>
          ) : (
            <>
              <DropdownField
                clearLabel="No requester"
                label="Requester"
                onChange={(value) => {
                  setManufacturingError(null);
                  setManufacturingDraft((current) => ({
                    ...current,
                    requestedById: value,
                  }));
                }}
                options={memberOptions}
                placeholder="Select requester"
                value={manufacturingDraft.requestedById}
              />
              <DropdownField
                label="Process"
                onChange={(value) => {
                  setManufacturingError(null);
                  setManufacturingDraft((current) => ({
                    ...current,
                    process: value as ManufacturingItem["process"],
                  }));
                }}
                options={MANUFACTURING_VIEW_OPTIONS.map((option) => ({
                  id: option.value === "prints" ? "3d-print" : option.value,
                  name: option.label,
                }))}
                value={manufacturingDraft.process}
              />
              <DropdownField
                label="Status"
                onChange={(value) => {
                  setManufacturingError(null);
                  setManufacturingDraft((current) => ({
                    ...current,
                    status: value as ManufacturingItem["status"],
                  }));
                }}
                options={MANUFACTURING_STATUS_OPTIONS}
                value={manufacturingDraft.status}
              />
            </>
          )}
          <ModalField
            label="Material"
            onChangeText={(value) => {
              setManufacturingError(null);
              setManufacturingDraft((current) => ({ ...current, material: value }));
            }}
            placeholder="Material"
            value={manufacturingDraft.material}
          />
          <ModalField
            label="Quantity"
            keyboardType="numeric"
            onChangeText={(value) => {
              setManufacturingError(null);
              setManufacturingDraft((current) => ({ ...current, quantity: value }));
            }}
            placeholder="1"
            value={manufacturingDraft.quantity}
          />
          <ModalField
            label="Due date (YYYY-MM-DD)"
            onChangeText={(value) => {
              setManufacturingError(null);
              setManufacturingDraft((current) => ({ ...current, dueDate: value }));
            }}
            placeholder="2026-04-24"
            value={manufacturingDraft.dueDate}
          />
          <AdvancedOptions>
            <ModalField
              label="Batch label"
              onChangeText={(value) => {
                setManufacturingError(null);
                setManufacturingDraft((current) => ({ ...current, batchLabel: value }));
              }}
              placeholder="B-17"
              value={manufacturingDraft.batchLabel}
            />
            <ModalField
              label="QA review count"
              keyboardType="numeric"
              onChangeText={(value) => {
                setManufacturingError(null);
                setManufacturingDraft((current) => ({ ...current, qaReviewCount: value }));
              }}
              placeholder="0"
              value={manufacturingDraft.qaReviewCount}
            />
            {manufacturingEditorMode === "edit" ? (
              <ToggleField
                label="Mentor reviewed"
                onToggle={(value) => {
                  setManufacturingError(null);
                  setManufacturingDraft((current) => ({ ...current, mentorReviewed: value }));
                }}
                value={manufacturingDraft.mentorReviewed}
              />
            ) : null}
          </AdvancedOptions>
        </EditorModal>

        <EditorModal
          onCancel={closePurchaseEditor}
          onDelete={purchaseEditorMode === "edit" ? deletePurchaseDraft : undefined}
          onSave={savePurchaseDraft}
          saveLabel={purchaseEditorMode === "edit" ? "Update purchase" : "Create purchase"}
          title={purchaseEditorMode === "edit" ? "Edit purchase" : "Create purchase"}
          visible={Boolean(purchaseEditorMode)}
        >
          {purchaseError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing purchase details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {purchaseError}
              </Text>
            </View>
          ) : null}
          <ModalField
            label="Title"
            onChangeText={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({ ...current, title: value }));
            }}
            placeholder="Item title"
            value={purchaseDraft.title}
          />
          <DropdownField
            clearLabel="No subsystem"
            label="Subsystem"
            onChange={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({
                ...current,
                subsystemId: value,
              }));
            }}
            options={subsystemOptions}
            placeholder="Select subsystem"
            value={purchaseDraft.subsystemId}
          />
          <DropdownField
            clearLabel="No requester"
            label="Requester"
            onChange={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({
                ...current,
                requestedById: value,
              }));
            }}
            options={memberOptions}
            placeholder="Select requester"
            value={purchaseDraft.requestedById}
          />
          <DropdownField
            label="Status"
            onChange={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({
                ...current,
                status: value as PurchaseItem["status"],
              }));
            }}
            options={PURCHASE_STATUS_OPTIONS}
            value={purchaseDraft.status}
          />
          <ModalField
            label="Vendor"
            onChangeText={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({ ...current, vendor: value }));
            }}
            placeholder="Vendor"
            value={purchaseDraft.vendor}
          />
          <ModalField
            label="Quantity"
            keyboardType="numeric"
            onChangeText={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({ ...current, quantity: value }));
            }}
            placeholder="1"
            value={purchaseDraft.quantity}
          />
          <ModalField
            label="Estimated cost"
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setPurchaseError(null);
              setPurchaseDraft((current) => ({ ...current, estimatedCost: value }));
            }}
            placeholder="82"
            value={purchaseDraft.estimatedCost}
          />
          <AdvancedOptions>
            <ModalField
              label="Acquisition website"
              onChangeText={(value) => {
                setPurchaseError(null);
                setPurchaseDraft((current) => ({ ...current, linkLabel: value }));
              }}
              placeholder="vendor.com/item"
              value={purchaseDraft.linkLabel}
            />
            <ModalField
              label="Final cost (optional)"
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                setPurchaseError(null);
                setPurchaseDraft((current) => ({ ...current, finalCost: value }));
              }}
              placeholder="61"
              value={purchaseDraft.finalCost}
            />
            <ToggleField
              label="Mentor approved"
              onToggle={(value) => {
                setPurchaseError(null);
                setPurchaseDraft((current) => ({ ...current, approvedByMentor: value }));
              }}
              value={purchaseDraft.approvedByMentor}
            />
          </AdvancedOptions>
        </EditorModal>

        <EditorModal
          onCancel={closePartDefinitionEditor}
          onDelete={
            partDefinitionEditorMode === "edit" ? deletePartDefinitionDraft : undefined
          }
          onSave={savePartDefinitionDraft}
          saveLabel={
            partDefinitionEditorMode === "edit"
              ? "Update part definition"
              : "Create part definition"
          }
          title={
            partDefinitionEditorMode === "edit"
              ? "Edit part definition"
              : "Create part definition"
          }
          visible={Boolean(partDefinitionEditorMode)}
        >
          {partDefinitionError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing part details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {partDefinitionError}
              </Text>
            </View>
          ) : null}
          <ModalField
            label="Name"
            onChangeText={(value) => {
              setPartDefinitionError(null);
              setPartDefinitionDraft((current) => ({ ...current, name: value }));
            }}
            placeholder="Part name"
            value={partDefinitionDraft.name}
          />
          <ModalField
            label="Part number"
            onChangeText={(value) => {
              setPartDefinitionError(null);
              setPartDefinitionDraft((current) => ({ ...current, partNumber: value }));
            }}
            placeholder="DRV-101"
            value={partDefinitionDraft.partNumber}
          />
          <ModalField
            label="Revision"
            onChangeText={(value) => {
              setPartDefinitionError(null);
              setPartDefinitionDraft((current) => ({ ...current, revision: value }));
            }}
            placeholder="A"
            value={partDefinitionDraft.revision}
          />
          <DropdownField
            label="Source"
            onChange={(value) => {
              setPartDefinitionError(null);
              setPartDefinitionDraft((current) => ({
                ...current,
                source: value,
                acquisitionMethod:
                  value === "FRC Supplier" || value === "COTS"
                    ? "purchase"
                    : current.acquisitionMethod,
              }));
            }}
            options={PART_SOURCE_OPTIONS}
            value={partDefinitionDraft.source || "Onshape"}
          />
          {partDefinitionEditorMode === "create" ? (
            <DropdownField
              label="Acquisition method"
              onChange={(value) => {
                setPartDefinitionError(null);
                setPartDefinitionDraft((current) => ({
                  ...current,
                  acquisitionMethod: value as AcquisitionMethod,
                }));
              }}
              options={ACQUISITION_METHOD_OPTIONS}
              value={partDefinitionDraft.acquisitionMethod}
            />
          ) : null}
        </EditorModal>

        <EditorModal
          onCancel={closeMemberEditor}
          onDelete={memberEditorMode === "edit" ? deleteMemberDraft : undefined}
          onSave={saveMemberDraft}
          saveLabel={memberEditorMode === "edit" ? "Update person" : "Create person"}
          title={memberEditorMode === "edit" ? "Edit selected person" : "Add person"}
          visible={Boolean(memberEditorMode)}
        >
          {memberError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing roster details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {memberError}
              </Text>
            </View>
          ) : null}
          <View style={styles.profilePhotoField}>
            <Text style={[styles.modalFieldLabel, { color: themeColors.ink }]}>
              Profile photo
            </Text>
            <View style={[styles.profilePhotoPicker, { borderColor: themeColors.border }]}>
              <Pressable
                accessibilityRole="button"
                onPress={showProfilePhotoUrlOnlyMessage}
                style={styles.profilePhotoChooseButton}
              >
                <Text style={styles.profilePhotoChooseButtonLabel}>Use URL</Text>
              </Pressable>
              <Text style={[styles.profilePhotoFileName, { color: themeColors.ink }]}>
                {getPhotoFileName(memberDraft.photoUrl)}
              </Text>
            </View>
            <ModalField
              label="Profile photo URL"
              onChangeText={(value) => {
                setMemberError(null);
                setMemberDraft((current) => ({ ...current, photoUrl: value }));
              }}
              placeholder="https://example.com/photo.jpg"
              value={memberDraft.photoUrl}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setMemberDraft((current) => ({ ...current, photoUrl: "" }))}
              style={styles.profilePhotoClearButton}
            >
              <Text style={[styles.profilePhotoClearButtonLabel, { color: themeColors.ink }]}>
                Clear file
              </Text>
            </Pressable>
          </View>
          <ModalField
            label="Name"
            onChangeText={(value) => {
              setMemberError(null);
              setMemberDraft((current) => ({ ...current, name: value }));
            }}
            placeholder="Person name"
            value={memberDraft.name}
          />
          <ModalField
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => {
              setMemberError(null);
              setMemberDraft((current) => ({ ...current, email: value }));
            }}
            placeholder="person@mecorobotics.org"
            value={memberDraft.email}
          />
          <DropdownField
            clearLabel="None"
            label="Discipline"
            onChange={(value) => {
              setMemberError(null);
              setMemberDraft((current) => ({ ...current, disciplineId: value }));
            }}
            options={disciplineOptions}
            placeholder="None"
            value={memberDraft.disciplineId}
          />
          <DropdownField
            clearLabel="None"
            label="Discipline"
            onChange={(value) => {
              setMemberError(null);
              setMemberDraft((current) => ({ ...current, disciplineId: value }));
            }}
            options={disciplineOptions}
            placeholder="None"
            value={memberDraft.disciplineId}
          />
          <DropdownField
            label="Role"
            onChange={(value) => {
              const role = value as MemberRole;
              setMemberError(null);
              setMemberDraft((current) => ({
                ...current,
                role,
                elevated: role === "lead" || role === "admin",
              }));
            }}
            options={[
              { id: "student", name: "Student" },
              { id: "lead", name: "Student + subteam lead" },
              { id: "mentor", name: "Mentor" },
              { id: "admin", name: "Admin" },
              { id: "external", name: "External access" },
            ]}
            value={memberDraft.role}
          />
          <ModalField
            keyboardType="numeric"
            label="Planned weekly attendance"
            onChangeText={(value) => {
              setMemberError(null);
              setMemberDraft((current) => ({
                ...current,
                plannedWeeklyAttendanceHours: value,
              }));
            }}
            placeholder="0"
            value={memberDraft.plannedWeeklyAttendanceHours}
          />
          <View style={styles.plannedDaysField}>
            <Text style={[styles.modalFieldLabel, { color: themeColors.ink }]}>
              Planned days
            </Text>
            <View style={styles.plannedDaysRow}>
              {PLANNED_ATTENDANCE_DAY_OPTIONS.map((day) => {
                const isSelected = memberDraft.plannedAttendanceDays.includes(day.id);

                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    key={day.id}
                    onPress={() => {
                      setMemberError(null);
                      setMemberDraft((current) => ({
                        ...current,
                        plannedAttendanceDays: current.plannedAttendanceDays.includes(day.id)
                          ? current.plannedAttendanceDays.filter((value) => value !== day.id)
                          : [...current.plannedAttendanceDays, day.id],
                      }));
                    }}
                    style={styles.plannedDayOption}
                  >
                    <View
                      style={[
                        styles.plannedDayCheckbox,
                        {
                          backgroundColor: isSelected ? themeColors.navySurface : themeColors.canvas,
                          borderColor: isSelected ? themeColors.blue : themeColors.border,
                        },
                      ]}
                    />
                    <Text style={[styles.plannedDayLabel, { color: themeColors.ink }]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <ModalField
            label="Attendance notes"
            multiline
            onChangeText={(value) => {
              setMemberError(null);
              setMemberDraft((current) => ({
                ...current,
                plannedAttendanceNotes: value,
              }));
            }}
            placeholder=""
            value={memberDraft.plannedAttendanceNotes}
          />
        </EditorModal>

        <EditorModal
          onCancel={closeSubsystemEditor}
          onDelete={subsystemEditorMode === "edit" ? deleteSubsystemDraft : undefined}
          onSave={saveSubsystemDraft}
          saveLabel={subsystemEditorMode === "edit" ? "Update subsystem" : "Create subsystem"}
          title={subsystemEditorMode === "edit" ? "Edit subsystem" : "Create subsystem"}
          visible={Boolean(subsystemEditorMode)}
        >
          {subsystemError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing subsystem details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {subsystemError}
              </Text>
            </View>
          ) : null}
          <ModalField
            label="Name"
            onChangeText={(value) => {
              setSubsystemError(null);
              setSubsystemDraft((current) => ({ ...current, name: value }));
            }}
            placeholder="Subsystem name"
            value={subsystemDraft.name}
          />
          <ModalField
            label="Description"
            multiline
            onChangeText={(value) => {
              setSubsystemError(null);
              setSubsystemDraft((current) => ({ ...current, description: value }));
            }}
            placeholder="Subsystem description"
            value={subsystemDraft.description}
          />
          <DropdownField
            clearLabel="No responsible engineer"
            label="Responsible engineer"
            onChange={(value) => {
              setSubsystemError(null);
              setSubsystemDraft((current) => ({
                ...current,
                responsibleEngineerId: value,
              }));
            }}
            options={memberOptions}
            placeholder="Select responsible engineer"
            value={subsystemDraft.responsibleEngineerId}
          />
          <AdvancedOptions>
            <ModalField
              label="Mentor IDs (comma separated)"
              onChangeText={(value) => {
                setSubsystemError(null);
                setSubsystemDraft((current) => ({ ...current, mentorIdsText: value }));
              }}
              placeholder="jordan,riley"
              value={subsystemDraft.mentorIdsText}
            />
            <ModalField
              label="Risks (comma separated)"
              onChangeText={(value) => {
                setSubsystemError(null);
                setSubsystemDraft((current) => ({ ...current, risksText: value }));
              }}
              placeholder="Risk one, risk two"
              value={subsystemDraft.risksText}
            />
          </AdvancedOptions>
        </EditorModal>

        <EditorModal
          onCancel={closeQaReportEditor}
          onSave={saveQaReportDraft}
          saveLabel="Save QA report"
          title="QA report"
          visible={Boolean(qaReportEditorMode)}
        >
          {qaReportError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing QA details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {qaReportError}
              </Text>
            </View>
          ) : null}
          <DropdownField
            clearLabel="No task"
            label="Task"
            onChange={(value) => {
              setQaReportDraft((current) => ({ ...current, taskId: value }));
              setActiveQaRequestId(null);
              setQaReportError(null);
            }}
            options={taskOptions}
            placeholder="Select task"
            value={qaReportDraft.taskId}
          />
          <DropdownField
            label="Result"
            onChange={(value) => {
              setQaReportError(null);
              setQaReportDraft((current) => ({
                ...current,
                result: value as QaReportDraft["result"],
              }));
            }}
            options={QA_RESULT_OPTIONS}
            value={qaReportDraft.result}
          />
          <ModalField
            label="Participants (member IDs, comma separated)"
            onChangeText={(value) => {
              setQaReportDraft((current) => ({ ...current, participantIdsText: value }));
              setQaReportError(null);
            }}
            placeholder="ava,jordan"
            value={qaReportDraft.participantIdsText}
          />
          <ModalField
            label="Notes"
            multiline
            onChangeText={(value) => {
              setQaReportDraft((current) => ({ ...current, notes: value }));
              setQaReportError(null);
            }}
            placeholder="Inspection result, evidence, and follow-up"
            value={qaReportDraft.notes}
          />
          <ModalField
            label="Evidence / references"
            multiline
            onChangeText={(value) => {
              setQaReportDraft((current) => ({ ...current, evidenceNotes: value }));
              setQaReportError(null);
            }}
            placeholder="Photo links, notebook page, test run ID, video, or file reference"
            value={qaReportDraft.evidenceNotes}
          />
          <AdvancedOptions>
            <ModalField
              label="Follow-up task title"
              onChangeText={(value) => {
                setQaReportError(null);
                setQaReportDraft((current) => ({ ...current, followUpTaskTitle: value }));
              }}
              placeholder="Leave blank to create one automatically"
              value={qaReportDraft.followUpTaskTitle}
            />
            <ToggleField
              label="Mentor approved"
              onToggle={(value) => {
                setQaReportError(null);
                setQaReportDraft((current) => ({ ...current, mentorApproved: value }));
              }}
              value={qaReportDraft.mentorApproved}
            />
          </AdvancedOptions>
        </EditorModal>

        <EditorModal
          onCancel={closeEventReportEditor}
          onSave={saveEventReportDraft}
          saveLabel="Save event report"
          title="Event report"
          visible={Boolean(eventReportEditorMode)}
        >
          {eventReportError ? (
            <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
              <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>
                Missing event report details
              </Text>
              <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>
                {eventReportError}
              </Text>
            </View>
          ) : null}
          <DropdownField
            clearLabel="No event"
            label="Milestone / event"
            onChange={(value) => {
              setEventReportDraft((current) => ({ ...current, eventId: value }));
              setEventReportError(null);
            }}
            options={eventOptions}
            placeholder="Select event"
            value={eventReportDraft.eventId}
          />
          <ModalField
            label="Summary"
            multiline
            onChangeText={(value) => {
              setEventReportDraft((current) => ({ ...current, summary: value }));
              setEventReportError(null);
            }}
            placeholder="What happened at the event"
            value={eventReportDraft.summary}
          />
          <AdvancedOptions>
            <ModalField
              label="Finding"
              multiline
              onChangeText={(value) =>
                setEventReportDraft((current) => ({ ...current, findingText: value }))
              }
              placeholder="Issue, observation, or test result"
              value={eventReportDraft.findingText}
            />
            <ModalField
              label="Follow-up task title"
              onChangeText={(value) =>
                setEventReportDraft((current) => ({ ...current, followUpTaskTitle: value }))
              }
              placeholder="Create a task anchored to this milestone"
              value={eventReportDraft.followUpTaskTitle}
            />
          </AdvancedOptions>
        </EditorModal>
      </>
    );
  };

  const renderNavigationMenu = () => (
    <Modal
      animationType="fade"
      onRequestClose={closeNavigationMenu}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={isNavMenuVisible}
    >
      <Pressable
        onPress={closeNavigationMenu}
        style={[styles.navDrawerSafeArea, styles.navDrawerScrim]}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Pressable
            accessibilityRole="menu"
            onPress={() => undefined}
            style={[styles.navDrawer, appResponsiveStyles.navDrawer]}
            {...navigationCloseSwipeResponder.panHandlers}
          >
            <View style={styles.navDrawerHeader}>
              <View style={styles.navDrawerHeaderText}>
                <Text style={[styles.navDrawerTitle, { color: themeColors.ink }]}>
                  Workspace
                </Text>
                <Text style={[styles.navDrawerSubtitle, { color: themeColors.subtleText }]}>
                  {activeTabLabel}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close navigation"
                accessibilityRole="button"
                onPress={closeNavigationMenu}
                style={[styles.navDrawerCloseButton, appResponsiveStyles.iconButton]}
              >
                <Text style={[styles.navDrawerCloseLabel, { color: themeColors.navyInk }]}>
                  X
                </Text>
              </Pressable>
            </View>

            <View style={styles.navDrawerList}>
              {navigationSections.map((section) => (
                <View key={section.title} style={styles.navDrawerSection}>
                  <Text style={[styles.navDrawerSectionLabel, { color: themeColors.subtleText }]}>
                    {section.title}
                  </Text>
                  {section.items.map((item) => {
                    const isActive = activeTab === item.key;

                    return (
                      <Pressable
                        accessibilityRole="menuitem"
                        accessibilityState={{ selected: isActive }}
                        key={item.key}
                        onPress={() => selectNavigationTab(item.key)}
                        style={[
                          styles.navDrawerItem,
                          appResponsiveStyles.navTab,
                          isActive && [styles.navDrawerItemActive, appResponsiveStyles.navTabActive],
                        ]}
                      >
                        <View
                          style={[
                            styles.sidebarIconBubble,
                            appResponsiveStyles.navBubble,
                            isActive && styles.sidebarIconBubbleActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sidebarIconLabel,
                              { color: themeColors.navyInk },
                              isActive && styles.sidebarIconLabelActive,
                            ]}
                          >
                            {item.shortLabel}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.navDrawerItemLabel,
                            { color: themeColors.ink },
                            isActive && { color: themeColors.navyInk },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <View
                          style={[
                            styles.sidebarCountPill,
                            appResponsiveStyles.navCount,
                            isActive && styles.sidebarCountPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sidebarCountLabel,
                              { color: themeColors.ink },
                              isActive && styles.sidebarCountLabelActive,
                            ]}
                          >
                            {item.count}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );

  const renderLoginScreen = () => {
    const hostedDomain = authConfig?.hostedDomain ?? "mecorobotics.org";
    const isEmailCodeFlowAvailable = authConfig?.emailEnabled !== false;
    const loginScale = Math.min(
      1.45,
      Math.max(0.78, Math.min(width / 390, height / 722)),
    );
    const scaleLogin = (value: number) => Math.round(value * loginScale);
    const loginCardHeight = Math.min(height - 8, scaleLogin(722));
    const loginCardWidth = Math.min(width - 48, scaleLogin(334));

    return (
      <View
        style={[
          styles.loginScreen,
          isDarkModeEnabled ? styles.loginScreenDark : styles.loginScreenLight,
        ]}
      >
        <StatusBar
          backgroundColor={isDarkModeEnabled ? "#10284d" : colors.grey}
          style={isDarkModeEnabled ? "light" : "dark"}
          translucent={false}
        />
        <SafeAreaView
          style={[
            styles.loginSafeArea,
            isDarkModeEnabled ? styles.loginScreenDark : styles.loginScreenLight,
          ]}
        >
          <View
            style={[
              styles.loginCard,
              isDarkModeEnabled ? styles.loginCardDark : styles.loginCardLight,
              {
                borderRadius: scaleLogin(29),
                minHeight: loginCardHeight,
                paddingBottom: scaleLogin(28),
                paddingHorizontal: scaleLogin(28),
                paddingTop: scaleLogin(28),
                width: loginCardWidth,
              },
            ]}
          >
            <View style={styles.loginBadgeShadow}>
              <Image
                accessibilityLabel="Team MECO 8324 logo"
                resizeMode="contain"
                source={require("./assets/meco-shield.png")}
                style={[
                  styles.loginLogoImage,
                  { height: scaleLogin(334), width: scaleLogin(304) },
                ]}
              />
            </View>

            {isEmailCodeFlowAvailable ? (
              <>
                <Text
                  style={[
                    styles.loginTitle,
                    {
                      fontSize: scaleLogin(28),
                      marginBottom: scaleLogin(16),
                      marginTop: scaleLogin(14),
                    },
                  ]}
                >
                  Sign in with email
                </Text>

                <View
                  style={[
                    styles.loginEmailRow,
                    isDarkModeEnabled ? styles.loginEmailRowDark : styles.loginEmailRowLight,
                    {
                      minHeight: scaleLogin(50),
                      paddingLeft: scaleLogin(18),
                      paddingRight: scaleLogin(8),
                    },
                  ]}
                >
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!isAuthenticating && !hasRequestedEmailCode}
                    keyboardType="email-address"
                    onChangeText={(value) => {
                      setAuthEmail(value);
                      setAuthCode("");
                      setAuthNotice(null);
                      setHasRequestedEmailCode(false);
                    }}
                    placeholder={`you@${hostedDomain}`}
                    placeholderTextColor="#f1f5ff"
                    returnKeyType="next"
                    style={[
                      styles.loginEmailInput,
                      { fontSize: scaleLogin(13), paddingVertical: scaleLogin(12) },
                    ]}
                    textContentType="emailAddress"
                    value={authEmail}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={isAuthenticating}
                    onPress={() => {
                      if (hasRequestedEmailCode) {
                        setAuthCode("");
                        setAuthError(null);
                        setAuthNotice(null);
                        setHasRequestedEmailCode(false);
                        return;
                      }

                      void signInWithEmail();
                    }}
                    style={[
                      styles.loginSendButton,
                      styles.loginInlineSendButton,
                      {
                        minHeight: scaleLogin(36),
                        minWidth: scaleLogin(78),
                        paddingHorizontal: scaleLogin(10),
                      },
                    ]}
                  >
                    <Text style={[styles.loginSendButtonText, { fontSize: scaleLogin(12) }]}>
                      {hasRequestedEmailCode ? "Change" : isAuthenticating ? "Sending" : "Send Code"}
                    </Text>
                  </Pressable>
                </View>

                {hasRequestedEmailCode ? (
                  <View
                    style={[
                      styles.loginCodeRow,
                      isDarkModeEnabled ? styles.loginEmailRowDark : styles.loginEmailRowLight,
                      {
                        marginTop: scaleLogin(10),
                        minHeight: scaleLogin(50),
                        paddingLeft: scaleLogin(18),
                        paddingRight: scaleLogin(8),
                      },
                    ]}
                  >
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="one-time-code"
                      autoCorrect={false}
                      editable={!isAuthenticating}
                      keyboardType="default"
                      onChangeText={setAuthCode}
                      onSubmitEditing={signInWithEmail}
                      placeholder="Code"
                      placeholderTextColor="#f1f5ff"
                      returnKeyType="go"
                      style={[
                        styles.loginEmailInput,
                        { fontSize: scaleLogin(13), paddingVertical: scaleLogin(12) },
                      ]}
                      textContentType="oneTimeCode"
                      value={authCode}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={isAuthenticating}
                      onPress={signInWithEmail}
                      style={[
                        styles.loginSendButton,
                        styles.loginInlineSendButton,
                        {
                          minHeight: scaleLogin(36),
                          minWidth: scaleLogin(78),
                          paddingHorizontal: scaleLogin(10),
                        },
                      ]}
                    >
                      <Text style={[styles.loginSendButtonText, { fontSize: scaleLogin(12) }]}>
                        {isAuthenticating ? "Checking" : "Verify"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : null}

            {authNotice ? (
              <Text style={[styles.loginNoticeText, { fontSize: scaleLogin(14) }]}>
                {authNotice}
              </Text>
            ) : null}
            {authError ? (
              <Text
                style={[
                  styles.loginErrorText,
                  {
                    color: isDarkModeEnabled ? "#fecdd3" : colors.black,
                    fontSize: scaleLogin(14),
                  },
                ]}
              >
                {authError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isAuthenticating || isAuthConfigUnavailable}
              onPress={signInWithGoogle}
              style={({ pressed }) => [
                styles.loginGoogleButton,
                {
                  gap: scaleLogin(8),
                  marginTop: "auto",
                  minHeight: scaleLogin(42),
                  paddingHorizontal: scaleLogin(8),
                },
                pressed && styles.loginGoogleButtonPressed,
              ]}
            >
              <View
                style={[
                  styles.loginAvatar,
                  { height: scaleLogin(22), width: scaleLogin(22) },
                ]}
              >
                <Text style={[styles.loginAvatarText, { fontSize: scaleLogin(12) }]}>A</Text>
              </View>
              <Text style={[styles.loginGoogleText, { fontSize: scaleLogin(13) }]}>
                {isAuthConfigUnavailable
                  ? "Auth unavailable"
                  : isAuthenticating
                    ? "Signing in"
                    : "Sign in with Google"}
              </Text>
              <View
                style={[
                  styles.loginGoogleMark,
                  { height: scaleLogin(38), width: scaleLogin(38) },
                ]}
              >
                <Image
                  accessibilityLabel="Google logo"
                  resizeMode="contain"
                  source={require("./assets/google-g.png")}
                  style={[
                    styles.loginGoogleMarkImage,
                    { height: scaleLogin(26), width: scaleLogin(26) },
                  ]}
                />
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  };

  const renderProjectOverlay = () => (
    <Modal
      animationType="fade"
      onRequestClose={() => setIsProjectOverlayVisible(false)}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={isProjectOverlayVisible}
    >
      <Pressable
        onPress={() => setIsProjectOverlayVisible(false)}
        style={styles.overlayScrim}
      >
        <Pressable onPress={() => undefined} style={[styles.overlayCard, appResponsiveStyles.overlayCard]}>
          <View style={styles.overlayHeader}>
            <View style={[styles.projectMark, { backgroundColor: themeColors.navySurface }]}>
              <Text style={[styles.projectMarkLabel, { color: themeColors.navyInk }]}>RB</Text>
            </View>
            <View style={styles.overlayHeaderCopy}>
              <Text style={[styles.overlayTitle, { color: themeColors.ink }]}>MECO Mission Control</Text>
              <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>Robot project selector</Text>
            </View>
          </View>

          <Text style={[styles.overlayBody, { color: themeColors.ink }]}>
            Tap this project chip from the top bar to inspect or edit the active robot
            workspace without leaving the current view.
          </Text>

          <View style={styles.overlayActionRow}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setActiveTab("subsystems");
                setIsProjectOverlayVisible(false);
              }}
              style={styles.overlayActionButton}
            >
              <Text style={styles.overlayActionLabel}>Edit robot</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setActiveTab("subsystems");
                setIsProjectOverlayVisible(false);
              }}
              style={[
                styles.overlaySecondaryButton,
                { backgroundColor: themeColors.canvas, borderColor: themeColors.border },
              ]}
            >
              <Text style={[styles.overlaySecondaryLabel, { color: themeColors.navyInk }]}>Switch project</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderAttendanceModal = () => (
    <Modal
      animationType="fade"
      onRequestClose={() => setIsAttendanceModalVisible(false)}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={isAttendanceModalVisible}
    >
      <View style={[styles.modalScrim, isCompactLayout && styles.modalScrimCompact]}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
            isCompactLayout && styles.modalCardCompact,
          ]}
        >
          <Text style={[styles.modalTitle, { color: themeColors.ink }]}>
            Meeting attendance
          </Text>
          <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
            Everyone for this meeting, sorted alphabetically.
          </Text>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {meetingAttendance.map(({ member, status }) => (
              <View
                key={member.id}
                style={[styles.attendanceRow, appResponsiveStyles.rowCard]}
              >
                <View style={styles.queueRowPrimaryText}>
                  <Text style={[styles.queueRowTitle, appResponsiveStyles.rowTitle]}>
                    {member.name}
                  </Text>
                  <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
                    {capitalize(member.role)}
                  </Text>
                </View>
                <AttendanceStatusMark status={status} />
              </View>
            ))}
          </ScrollView>

          <View style={[styles.modalActions, isCompactLayout && styles.modalActionsCompact]}>
            <Pressable
              onPress={() => setIsAttendanceModalVisible(false)}
              style={[
                styles.modalSaveButton,
                isCompactLayout && styles.modalActionButtonCompact,
              ]}
            >
              <Text style={styles.modalSaveButtonLabel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPersonMenu = () => (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        setIsPersonMenuVisible(false);
        setIsSeasonMenuVisible(false);
      }}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      transparent
      visible={isPersonMenuVisible}
    >
      <Pressable
        onPress={() => {
          setIsPersonMenuVisible(false);
          setIsSeasonMenuVisible(false);
        }}
        style={styles.overlayScrim}
      >
        <Pressable onPress={() => undefined} style={[styles.overlayCard, appResponsiveStyles.overlayCard]}>
          <View style={styles.overlayHeader}>
            <View style={[styles.personMark, { backgroundColor: themeColors.navySurface }]}>
              <Text style={[styles.personMarkLabel, { color: themeColors.navyInk }]}>
                {signedInEmailInitial}
              </Text>
            </View>
            <View style={styles.overlayHeaderCopy}>
              <Text style={[styles.overlayTitle, { color: themeColors.ink }]}>Personal settings</Text>
              <Text style={[styles.overlaySubtitle, { color: themeColors.subtleText }]}>{syncStatusLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={signOut}
              style={styles.overlayHeaderAction}
            >
              <Text style={[styles.overlayHeaderActionLabel, { color: themeColors.ink }]}>
                Sign out
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setThemeOverride(themeMode === "dark" ? "light" : "dark")}
            style={[
              styles.settingsRow,
              appResponsiveStyles.settingsRow,
              isDarkModeEnabled && [styles.settingsRowActive, appResponsiveStyles.settingsRowActive],
            ]}
          >
            <View>
              <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>Theme</Text>
            </View>
            <Text style={[styles.settingsRowValue, { color: themeColors.navyInk }]}>
              {themeMode === "dark" ? "Dark" : "Light"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIsSeasonMenuVisible((current) => !current)}
            style={[
              styles.settingsRow,
              appResponsiveStyles.settingsRow,
              isSeasonMenuVisible && [styles.settingsRowActive, appResponsiveStyles.settingsRowActive],
            ]}
          >
            <View>
              <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>Season</Text>
            </View>
            {isSeasonMenuVisible ? (
              <Pressable
                accessibilityLabel="Add new season"
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  createSeason();
                }}
                style={[styles.settingsIconButton, appResponsiveStyles.settingsIconButton]}
              >
                <Text style={[styles.settingsIconButtonLabel, { color: themeColors.navyInk }]}>
                  +
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.settingsRowValue, { color: themeColors.navyInk }]}>
                {seasonModeLabel}
              </Text>
            )}
          </Pressable>

          {isSeasonMenuVisible ? (
            <View style={[styles.settingsSubmenu, appResponsiveStyles.settingsSubmenu]}>
              {seasons.map((option) => {
                const isSelected = activeSeasonId === option.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={option.id}
                    onPress={() => {
                      setActiveSeasonId(option.id);
                      setIsSeasonMenuVisible(false);
                    }}
                    style={[
                      styles.settingsSubmenuRow,
                      isSelected && [
                        styles.settingsSubmenuRowActive,
                        appResponsiveStyles.settingsSubmenuRowActive,
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.settingsSubmenuLabel,
                        { color: themeColors.ink },
                        isSelected && { color: themeColors.navyInk },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Delete ${option.label}`}
                      accessibilityRole="button"
                      onPress={(event) => {
                        event.stopPropagation();
                        deleteSeason(option.id);
                      }}
                      style={[styles.settingsIconButton, appResponsiveStyles.settingsIconButton]}
                    >
                      <Text
                        style={[
                          styles.settingsIconButtonLabel,
                          { color: themeColors.navyInk },
                        ]}
                      >
                        -
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Pressable
            onPress={resetWorkspaceData}
            style={[styles.settingsRow, appResponsiveStyles.settingsRow]}
          >
            <View>
              <Text style={[styles.settingsRowTitle, { color: themeColors.ink }]}>Refresh data</Text>
            </View>
            <Text style={[styles.settingsRowValue, { color: themeColors.navyInk }]}>Run</Text>
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <LocalizationProvider languageOverride={languageOverride}>
      {!hasAuthenticated ? (
        renderLoginScreen()
      ) : (
        <AppThemeProvider value={{ colors: themeColors, mode: themeMode }}>
          <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.canvas }]}>
      <StatusBar style={isDarkModeEnabled ? "light" : "dark"} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={[styles.screen, { backgroundColor: themeColors.canvas }]}
        contentContainerStyle={styles.screenContent}
      >
        <View style={[styles.topbar, appResponsiveStyles.topbar]}>
          <View style={styles.topbarLeft}>
            <Pressable
              accessibilityLabel="Open navigation"
              accessibilityRole="button"
              onPress={openNavigationMenu}
              style={[styles.iconButton, appResponsiveStyles.iconButton]}
            >
              <View style={styles.menuIcon}>
                <View style={[styles.menuIconBar, { backgroundColor: themeColors.navyInk }]} />
                <View style={[styles.menuIconBar, { backgroundColor: themeColors.navyInk }]} />
                <View style={[styles.menuIconBar, { backgroundColor: themeColors.navyInk }]} />
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsProjectOverlayVisible(true)}
              style={styles.brandWrap}
            >
              <Text style={[styles.brandEyebrow, appResponsiveStyles.brandEyebrow]}>
                MECO Mission Control
              </Text>
              {!isCompactLayout ? (
                <Text
                  numberOfLines={1}
                  style={[styles.brandTitle, appResponsiveStyles.brandTitle]}
                >
                  {activeTabLabel}
                </Text>
              ) : null}
              {hasSubtabPages ? (
                <View style={styles.topbarSubtabDots}>
                  {activeSubtabOptions.map((option, index) => {
                    const isActive = index === activeSubtabIndex;

                    return (
                      <View
                        key={option.value}
                        style={[
                          styles.topbarSubtabDot,
                          {
                            backgroundColor: isActive ? themeColors.blue : themeColors.border,
                            opacity: isActive ? 1 : 0.75,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={[styles.topbarRight, isCompactLayout && styles.topbarRightCompact]}>
            <Pressable
              accessibilityLabel={`Open account menu for ${signedInEmailInitial}`}
              accessibilityRole="button"
              onPress={() => {
                setIsSeasonMenuVisible(false);
                setIsPersonMenuVisible(true);
              }}
              style={[
                styles.personButton,
                appResponsiveStyles.iconButton,
                { backgroundColor: themeColors.navySurface, borderColor: themeColors.blue },
              ]}
            >
              <Text style={[styles.personButtonLabel, { color: themeColors.navyInk }]}>
                {signedInEmailInitial}
              </Text>
            </Pressable>
          </View>
        </View>

        {syncError ? (
          <View style={[styles.calloutBox, appResponsiveStyles.calloutBox]}>
            <Text style={[styles.calloutTitle, appResponsiveStyles.calloutTitle]}>Backend sync issue</Text>
            <Text style={[styles.calloutBody, appResponsiveStyles.calloutBody]}>{syncError}</Text>
          </View>
        ) : null}

        <View {...subtabSwipeResponder.panHandlers}>{renderActiveTab()}</View>
      </ScrollView>
      <View style={styles.navSwipeEdge} {...navigationOpenSwipeResponder.panHandlers} />
      {renderAttendanceModal()}
      {renderEditorModals()}
      {renderNavigationMenu()}
      {renderProjectOverlay()}
      {renderPersonMenu()}
          </SafeAreaView>
        </AppThemeProvider>
      )}
    </LocalizationProvider>
  );
}
