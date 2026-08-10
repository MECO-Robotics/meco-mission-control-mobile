import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Platform,
  useColorScheme,
  useWindowDimensions,
} from "react-native";

import {
  EVENT_TYPE_STYLES,
  INVENTORY_VIEW_OPTIONS,
  MANUFACTURING_VIEW_OPTIONS,
  STATUS_LABELS,
  TASK_SUBTEAM_DISCIPLINE_IDS,
  TASK_SUBTEAM_OPTIONS,
  TASK_VIEW_OPTIONS,
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
import { AppThemeProvider } from "./src/ui/themeContext";
import { LocalizationProvider, type LanguageCode } from "./src/i18n";
import {
  ApiNetworkError,
  ApiRequestError,
  classifyMobileAuthError,
  getBackendConnectionErrorMessage,
  getMobileAuthErrorMessage,
  type MobileAuthErrorState,
  requestJson,
  resolveApiBaseUrl,
} from "./src/data/api";
import {
  buildLocalDevSessionUser,
  isLocalDevAuthBypassEnabled,
} from "./src/data/devAuthBypass";
import { buildHelpRequest, type HelpRequestInput } from "./src/data/helpRequests";
import {
  buildOwnedTaskStartPayload,
  claimTaskRequest,
  getDefaultWorkLogParticipantIds,
  getTaskAssignmentConflict,
  getTaskAssignmentConflictMessage,
  getTaskAssignmentState,
  reassignTaskRequest,
  releaseTaskRequest,
} from "./src/data/taskAssignment";
import {
  buildTaskQueueSections,
  getTaskSubteamForDisciplineId,
} from "./src/data/taskQueueOrdering";
import { mecoSnapshot } from "./src/data/mockData";
import type {
  Event,
  MemberRole,
  ManufacturingItem,
  MobileDeviceSessionSummary,
  HelpRequest,
  PlatformBootstrapPayload,
  PublicAuthConfig,
  PurchaseItem,
  QaRequest,
  QaReview,
  MobileSessionResponse,
  SessionResponse,
  SessionUser,
  Subsystem,
  Task,
  TaskPriority,
  TaskStatus,
  WorkLog,
} from "./src/types/domain";
import {
  ATTENDANCE_STATUS_BY_MEMBER_ID,
  AUTH_REQUEST_TIMEOUT_MS,
  INITIAL_SEASONS,
  RISK_PRIORITY_RANK,
  SUBTAB_SWIPE_ACTIVATION_DISTANCE,
  SUBTAB_SWIPE_COMMIT_DISTANCE,
  SWIPE_ACTIVATION_DISTANCE,
  SWIPE_COMMIT_DISTANCE,
  TIMER_TICK_MS,
  applyMilestoneSubsystemLinks,
  backendReachabilityAfterError,
  buildSubsystemOptions,
  buildTaskById,
  buildTaskMutationPayload,
  ensureArray,
  formatHoursFromTimer,
  formatTimerElapsed,
  getAutoTaskStatus,
  getClientErrorMessage,
  getEmailCodeVerificationErrorMessage,
  getOptionalCreatedAt,
  getQaReviewTaskId,
  getWorkLogDraftOwnerKey,
  getWorkLogTimerElapsedMs,
  hasRequiredEmailDomain,
  isTaskReadyForQaPass,
  isValidDateInput,
  isValidTimeInput,
  isWorkLogDraftOwnedBy,
  mapEventTypeToMilestoneType,
  mapMilestonesToEvents,
  mapPendingWorkLogDraftToWorkLog,
  mapTaskPayloadToServer,
  mapTaskPriorityToRiskPriority,
  normalizeRequiredEmailDomain,
  normalizeTaskFromServer,
  normalizeTaskSubsystems,
  parseClientError,
  shiftDateByDays,
  shouldQueueWorkLogDraftAfterError,
  taskDependsOnTarget,
  withSeededSubteamTasks,
  type AttendanceStatus,
  type BackendReachability,
  type MilestoneMutationResponse,
  type SeasonOption,
  type StartTaskOptions,
  type WorkLogMutationResponse,
  type WorkLogTimerState,
} from "./src/app/appModel";
import {
  DEVICE_SESSION_RESTORED_NOTICE,
  normalizeThemeModeFromResponse,
  resolveEmailSignInOperation,
  type EmailCodeStartResponse,
  type ThemePreferenceResponse,
} from "./src/app/authConfigModel";
import { ActiveTabContent } from "./src/app/components/ActiveTabContent";
import { LoginScreen } from "./src/app/components/LoginScreen";
import { WorkspaceShell } from "./src/app/components/WorkspaceShell";
import { DeadlineEditorModal } from "./src/app/editorModals/DeadlineEditorModal";
import { ManufacturingEditorModal } from "./src/app/editorModals/ManufacturingEditorModal";
import { MemberEditorModal } from "./src/app/editorModals/MemberEditorModal";
import { MilestoneEditorModal } from "./src/app/editorModals/MilestoneEditorModal";
import { PartDefinitionEditorModal } from "./src/app/editorModals/PartDefinitionEditorModal";
import { PurchaseEditorModal } from "./src/app/editorModals/PurchaseEditorModal";
import { QaReportEditorModal } from "./src/app/editorModals/QaReportEditorModal";
import { SubsystemEditorModal } from "./src/app/editorModals/SubsystemEditorModal";
import { TaskEditorModal } from "./src/app/editorModals/TaskEditorModal";
import { WorkLogEditorModal } from "./src/app/editorModals/WorkLogEditorModal";

import { appThemes, type AppThemeName } from "./src/theme";
import type { SubsystemCounts, WorkLogListItem } from "./src/screens/types";
import {
  buildWorkLogDraftFingerprint,
  enqueuePendingWorkLogDraft,
  markPendingWorkLogDraftFailed,
  markPendingWorkLogDraftSyncing,
  reconcilePendingWorkLogDrafts,
  removePendingWorkLogDraft,
  type PendingWorkLogDraft,
} from "./src/services/workLogDraftSync";
import {
  loadPendingWorkLogDrafts,
  purgeExpiredWorkLogDrafts,
  savePendingWorkLogDrafts,
} from "./src/services/workLogDraftStorage";
import {
  endWorkLogLiveActivity,
  startWorkLogLiveActivity,
  updateWorkLogLiveActivity,
} from "./src/services/workLogLiveActivity";
import {
  clearPersistedAuthSession,
  getOrCreateAuthDeviceNumber,
  loadPersistedAuthSession,
  savePersistedAuthSession,
  type PersistedAuthSession,
} from "./src/services/authSessionStorage";
import { MobileSessionClient } from "./src/services/mobileSessionClient";
import { revokeThenClearMobileSession } from "./src/services/mobileLogout";
import {
  cancelWorkLogTimerReminders,
  clearPersistedWorkLogTimerState,
  persistWorkLogTimerState,
  restorePersistedWorkLogTimerReminder,
  schedulePersistedWorkLogTimerReminders,
} from "./src/services/workLogTimerNotifications";

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
  const [isRestoringAuthSession, setIsRestoringAuthSession] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<
    "connecting" | "connected" | "offline"
  >("connecting");
  const [backendReachability, setBackendReachability] =
    useState<BackendReachability>("unknown");
  const [syncError, setSyncError] = useState<string | null>(null);
  const mobileSessionRef = useRef<PersistedAuthSession | null>(null);
  const clearIdentityScopedStateRef = useRef<() => void>(() => undefined);
  const isLocalDevBypassAvailable = isLocalDevAuthBypassEnabled();
  const requiredEmailDomain = normalizeRequiredEmailDomain(authConfig?.hostedDomain);
  const isAuthConfigUnavailable = authErrorState === "auth-config-unavailable";
  const isDevBypassAvailable =
    isLocalDevBypassAvailable || authConfig?.devBypassAvailable === true;

  const saveActiveMobileSession = useCallback(
    async (session: PersistedAuthSession | null) => {
      mobileSessionRef.current = session;
      setApiToken(session?.token ?? null);
      setSessionUser(session?.user ?? null);
      if (session) {
        await savePersistedAuthSession(session);
      } else {
        await clearPersistedAuthSession();
      }
    },
    [],
  );

  const endSessionForAuthFailure = useCallback(async (message: string) => {
    mobileSessionRef.current = null;
    setApiToken(null);
    setSessionUser(null);
    setHasAuthenticated(false);
    setAuthCode("");
    setHasRequestedEmailCode(false);
    setIsAuthenticating(false);
    setSyncError(null);
    setAuthNotice(null);
    setAuthErrorState("expired-session");
    setAuthError(message);
    setBackendStatus("connected");
    setBackendReachability("reachable");
    setThemeOverride(null);
    clearIdentityScopedStateRef.current();
    await clearPersistedAuthSession().catch(() => undefined);
  }, []);

  const mobileSessionClient = useMemo(
    () =>
      new MobileSessionClient({
        baseUrl: apiBaseUrl,
        getSession: () => mobileSessionRef.current,
        onSessionExpired: () =>
          endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session")),
        saveSession: saveActiveMobileSession,
      }),
    [apiBaseUrl, endSessionForAuthFailure, saveActiveMobileSession],
  );

  const authenticatedRequestJson = useCallback(
    <T,>(
      path: string,
      init: RequestInit = {},
      timeoutMs?: number,
      fallbackToken: string | null = apiToken,
    ) => {
      if (mobileSessionRef.current) {
        return mobileSessionClient.request<T>(path, init, timeoutMs);
      }
      return requestJson<T>(apiBaseUrl, path, init, fallbackToken, timeoutMs);
    },
    [apiBaseUrl, apiToken, mobileSessionClient],
  );

  const applyThemePreferenceFromServer = useCallback(
    async (token: string | null) => {
      if (!token) {
        setThemeOverride(null);
        return;
      }

      try {
        const preferences = await authenticatedRequestJson<ThemePreferenceResponse>(
          "/api/users/me/preferences",
          undefined,
          undefined,
          token,
        );

        setThemeOverride(normalizeThemeModeFromResponse(preferences.themeMode));
      } catch {
        setThemeOverride(null);
      }
    },
    [authenticatedRequestJson],
  );

  const updateThemePreference = useCallback(
    async (nextThemeMode: AppThemeName, nextAuthToken: string | null) => {
      setThemeOverride(nextThemeMode);

      if (!nextAuthToken) {
        return;
      }

      try {
        await authenticatedRequestJson(
          "/api/users/me/preferences",
          {
            method: "PATCH",
            body: JSON.stringify({ themeMode: nextThemeMode }),
          },
          undefined,
          nextAuthToken,
        );
      } catch {
        // Preference persistence is best-effort; keep local theme preference even if backend sync fails.
      }
    },
    [authenticatedRequestJson],
  );

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
  const [isDeviceSessionsVisible, setIsDeviceSessionsVisible] = useState(false);
  const [deviceSessions, setDeviceSessions] = useState<MobileDeviceSessionSummary[]>([]);
  const [deviceSessionsError, setDeviceSessionsError] = useState<string | null>(null);
  const [isLoadingDeviceSessions, setIsLoadingDeviceSessions] = useState(false);
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
  const hasRestoredAuthSessionRef = useRef(false);
  const startTaskRef = useRef<(task: Task, options?: StartTaskOptions) => Promise<void>>(
    async () => undefined,
  );
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

  const persistPendingWorkLogDrafts = useCallback(
    async (
      drafts: PendingWorkLogDraft[],
      ownerKey: string | null = activeWorkLogDraftOwnerKey,
    ) => {
      pendingWorkLogDraftsRef.current = drafts;
      setPendingWorkLogDrafts(drafts);
      if (ownerKey) {
        await savePendingWorkLogDrafts(ownerKey, drafts);
      }
    },
    [activeWorkLogDraftOwnerKey],
  );

  const applyBootstrapPayload = useCallback((payload: PlatformBootstrapPayload) => {
    const events = ensureArray(payload.events);
    const tasks = ensureArray(payload.tasks).map((task) => normalizeTaskFromServer(task));
    const payloadWorkLogs = ensureArray(payload.workLogs);

    // Keep refs and state in lockstep for async callbacks that need the latest
    // workspace snapshot without retriggering every callback when data changes.
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
      const payload = await authenticatedRequestJson<PlatformBootstrapPayload>(
        "/api/bootstrap",
        undefined,
        undefined,
        token,
      );
      applyBootstrapPayload(payload);
      return payload;
    },
    [applyBootstrapPayload, authenticatedRequestJson],
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
        // Drop local drafts that already exist on the server before attempting
        // uploads; this covers both successful prior syncs and manual refreshes.
        let drafts = reconcilePendingWorkLogDrafts(
          pendingWorkLogDraftsRef.current,
          serverWorkLogs,
          ownerKey,
        );

        if (drafts.length !== pendingWorkLogDraftsRef.current.length) {
          await persistPendingWorkLogDrafts(drafts, ownerKey);
        }

        let didSyncDraft = false;
        let draftSyncError: string | null = null;
        for (const draft of drafts.filter((draft) => isWorkLogDraftOwnedBy(draft, ownerKey))) {
          drafts = markPendingWorkLogDraftSyncing(drafts, draft.id);
          await persistPendingWorkLogDrafts(drafts, ownerKey);

          try {
            await authenticatedRequestJson<WorkLogMutationResponse>(
              "/api/work-logs",
              {
                method: "POST",
                body: JSON.stringify(draft.payload),
              },
              undefined,
              token,
            );

            drafts = removePendingWorkLogDraft(drafts, draft.id);
            didSyncDraft = true;
            await persistPendingWorkLogDrafts(drafts, ownerKey);

            const loggedTask = tasksRef.current.find(
              (task) => task.id === draft.payload.taskId,
            );
            if (loggedTask) {
              // Reuse the normal start-task flow so synced work logs advance task
              // status the same way an online log would.
              await startTaskRef.current(loggedTask, { openWorkLog: false });
            }
          } catch (error) {
            if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
              throw error;
            }

            const message = getClientErrorMessage(error);
            drafts = markPendingWorkLogDraftFailed(drafts, draft.id, message);
            await persistPendingWorkLogDrafts(drafts, ownerKey);
            draftSyncError = draftSyncError ?? message;
          }
        }

        if (drafts.length !== pendingWorkLogDraftsRef.current.length) {
          await persistPendingWorkLogDrafts(drafts, ownerKey);
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
          await persistPendingWorkLogDrafts(reconciledDrafts, ownerKey);
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
    [authenticatedRequestJson, persistPendingWorkLogDrafts, refreshWorkspaceFromServer, sessionUser],
  );

  useEffect(() => {
    tasksRef.current = tasks;
    taskByIdRef.current = buildTaskById(tasks);
  }, [tasks]);

  useEffect(() => {
    let isActive = true;

    if (!activeWorkLogDraftOwnerKey) {
      pendingWorkLogDraftsRef.current = [];
      setPendingWorkLogDrafts([]);
      void purgeExpiredWorkLogDrafts();
      return () => {
        isActive = false;
      };
    }

    void loadPendingWorkLogDrafts(activeWorkLogDraftOwnerKey).then((drafts) => {
      if (!isActive) {
        return;
      }

      const reconciledDrafts = reconcilePendingWorkLogDrafts(
        drafts,
        workLogsRef.current,
      );
      // Reconcile on boot in case a previous run uploaded drafts but exited
      // before local storage was pruned.
      pendingWorkLogDraftsRef.current = reconciledDrafts;
      setPendingWorkLogDrafts(reconciledDrafts);

      if (reconciledDrafts.length !== drafts.length) {
        void savePendingWorkLogDrafts(activeWorkLogDraftOwnerKey, reconciledDrafts);
      }
    });

    return () => {
      isActive = false;
    };
  }, [activeWorkLogDraftOwnerKey]);

  const loadPublicAuthConfig = useCallback(async () => {
    setBackendStatus("connecting");
    setBackendReachability("unknown");
    setSyncError(null);

    try {
      const config = await requestJson<PublicAuthConfig>(
        apiBaseUrl,
        "/api/auth/config",
        undefined,
        undefined,
        AUTH_REQUEST_TIMEOUT_MS,
      );
      setAuthConfig(config);
      setAuthErrorState(null);
      setAuthError(null);
      setBackendStatus("connected");
      setBackendReachability("reachable");
      return config;
    } catch (error) {
      setBackendStatus("offline");
      setBackendReachability(backendReachabilityAfterError(error));
      setAuthConfig({
        enabled: false,
        googleClientId: null,
        hostedDomain: "mecorobotics.org",
        emailEnabled: true,
        devBypassAvailable: false,
      });
      const message =
        error instanceof ApiNetworkError
          ? getBackendConnectionErrorMessage(apiBaseUrl)
          : getClientErrorMessage(error, "auth-config");
      setAuthErrorState("auth-config-unavailable");
      setAuthError(message);
      setSyncError(message);
      return null;
    }
  }, [apiBaseUrl]);

  const finishSignIn = useCallback(
    async (
      token: string | null,
      user: SessionUser,
      mobileSession?: MobileSessionResponse | PersistedAuthSession,
    ) => {
      if (sessionUser && sessionUser.accountId !== user.accountId) {
        clearIdentityScopedStateRef.current();
      }
      setThemeOverride(null);
      setHasAuthenticated(false);
      setIsSyncing(true);
      setSyncError(null);
      setAuthError(null);

      if (mobileSession) {
        const deviceNumber = await getOrCreateAuthDeviceNumber();
        await saveActiveMobileSession({ ...mobileSession, deviceNumber });
      } else {
        mobileSessionRef.current = null;
        setApiToken(token);
        setSessionUser(user);
        await clearPersistedAuthSession().catch(() => undefined);
      }

      try {
        await applyThemePreferenceFromServer(token);
        const payload = await refreshWorkspaceFromServer(token);
        const draftSyncError = await syncPendingWorkLogDrafts(
          token,
          ensureArray(payload.workLogs),
          getWorkLogDraftOwnerKey(user),
        );
        setBackendStatus(draftSyncError ? "offline" : "connected");
        setBackendReachability("reachable");
        setSyncError(draftSyncError);
        setHasAuthenticated(true);
      } catch (error) {
        if (
          (error instanceof ApiRequestError &&
            (error.status === 401 || error.status === 403)) ||
          classifyMobileAuthError(error, "authenticated") === "expired-session"
        ) {
          await endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
          return;
        }

        setBackendStatus("offline");
        setBackendReachability(backendReachabilityAfterError(error));
        setSyncError(parseClientError(error));
        setAuthError(
          "Your session is saved, but workspace data could not be loaded. Check your connection and try again.",
        );
      } finally {
        setIsSyncing(false);
      }
    },
    [
      applyThemePreferenceFromServer,
      endSessionForAuthFailure,
      refreshWorkspaceFromServer,
      saveActiveMobileSession,
      sessionUser,
      syncPendingWorkLogDrafts,
    ],
  );

  const finishLocalDevBypass = useCallback(async () => {
    await finishSignIn(
      null,
      buildLocalDevSessionUser(authEmail, requiredEmailDomain),
    );
  }, [authEmail, finishSignIn, requiredEmailDomain]);

  const signInWithDevBypass = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthErrorState(null);
    setAuthNotice(null);

    try {
      if (isLocalDevBypassAvailable) {
        await finishLocalDevBypass();
        return;
      }

      if (!authConfig?.devBypassAvailable) {
        setAuthError("Development sign-in is not enabled for this workspace.");
        return;
      }

      const session = await requestJson<SessionResponse>(
        apiBaseUrl,
        "/api/auth/dev-bypass",
        { method: "POST" },
      );
      await finishSignIn(session.token, session.user);
    } catch (error) {
      setAuthError(getClientErrorMessage(error));
    } finally {
      setIsAuthenticating(false);
    }
  }, [
    apiBaseUrl,
    authConfig?.devBypassAvailable,
    finishLocalDevBypass,
    finishSignIn,
    isLocalDevBypassAvailable,
  ]);

  useEffect(() => {
    if (hasRestoredAuthSessionRef.current) {
      return;
    }

    hasRestoredAuthSessionRef.current = true;
    let isActive = true;

    async function restorePersistedAuthSession() {
      try {
        const deviceNumber = await getOrCreateAuthDeviceNumber();
        const persistedSession = await loadPersistedAuthSession(deviceNumber);

        if (!isActive || !persistedSession) {
          return;
        }

        // Let the app shell appear immediately while the restored token refreshes
        // workspace data and validates that the backend still accepts it.
        setAuthNotice(DEVICE_SESSION_RESTORED_NOTICE);
        await finishSignIn(
          persistedSession.token,
          persistedSession.user,
          persistedSession,
        );
      } finally {
        if (isActive) {
          setIsRestoringAuthSession(false);
        }
      }
    }

    void restorePersistedAuthSession();

    return () => {
      isActive = false;
    };
  }, [finishSignIn]);

  useEffect(() => {
    const session = mobileSessionRef.current;
    if (!hasAuthenticated || !session) {
      return;
    }

    const refreshAt = Date.parse(session.accessTokenExpiresAt) - 5 * 60 * 1000;
    const delay = Math.max(0, Math.min(refreshAt - Date.now(), 2_147_000_000));
    const timer = setTimeout(() => {
      void mobileSessionClient.refresh().catch(() => undefined);
    }, delay);

    return () => clearTimeout(timer);
  }, [apiToken, hasAuthenticated, mobileSessionClient]);

  const retrySavedSession = useCallback(async () => {
    const session = mobileSessionRef.current;
    if (!session) {
      return;
    }
    setIsAuthenticating(true);
    try {
      await finishSignIn(session.token, session.user, session);
    } finally {
      setIsAuthenticating(false);
    }
  }, [finishSignIn]);

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

    const emailSignInOperation = resolveEmailSignInOperation(
      currentAuthConfig,
      hasRequestedEmailCode,
    );

    if (emailSignInOperation === "email-disabled") {
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
      if (emailSignInOperation === "verify-code") {
        const deviceNumber = await getOrCreateAuthDeviceNumber();
        const session = await requestJson<MobileSessionResponse>(
          apiBaseUrl,
          "/api/auth/mobile/email/verify",
          {
            method: "POST",
            body: JSON.stringify({
              code,
              deviceId: deviceNumber,
              deviceName: Platform.OS === "ios" ? "iOS device" : "Android device",
              email,
            }),
          },
          undefined,
          AUTH_REQUEST_TIMEOUT_MS,
        );
        setAuthCode("");
        await finishSignIn(session.token, session.user, session);
        return;
      }

      if (emailSignInOperation === "auth-unavailable") {
        setAuthError(
          "Authentication service is unavailable. Check the backend auth configuration and try again.",
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
        undefined,
        AUTH_REQUEST_TIMEOUT_MS,
      );
      setHasRequestedEmailCode(true);
      setAuthNotice(
        response.expiresInMinutes
          ? `Code sent to ${response.sentTo ?? email}. It expires in ${response.expiresInMinutes} minutes.`
          : `Code sent to ${response.sentTo ?? email}.`,
      );
    } catch (error) {
      setAuthError(
        hasRequestedEmailCode
          ? getEmailCodeVerificationErrorMessage(error)
          : getClientErrorMessage(error),
      );
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
    setBackendReachability("unknown");
    setSyncError(null);

    try {
      const authConfig = await requestJson<PublicAuthConfig>(
        apiBaseUrl,
        "/api/auth/config",
      );

      let token = "";
      let syncSessionUser = sessionUser;

      if (authConfig.devBypassAvailable) {
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
      setBackendReachability("reachable");
      setSyncError(draftSyncError);
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      setBackendStatus("offline");
      setBackendReachability(backendReachabilityAfterError(error));
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
        await authenticatedRequestJson(path, init);
        // Mutations refresh the full bootstrap snapshot so cross-feature derived
        // data stays consistent after backend-side cascades.
        const payload = await refreshWorkspaceFromServer(apiToken);
        const draftSyncError = await syncPendingWorkLogDrafts(
          apiToken,
          ensureArray(payload.workLogs),
          activeWorkLogDraftOwnerKey,
        );
        setBackendStatus(draftSyncError ? "offline" : "connected");
        setBackendReachability("reachable");
        setSyncError(draftSyncError);
        return true;
      } catch (error) {
        if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
          endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
          return false;
        }

        setBackendStatus("offline");
        setBackendReachability(backendReachabilityAfterError(error));
        setSyncError(getClientErrorMessage(error));
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [
      apiToken,
      activeWorkLogDraftOwnerKey,
      authenticatedRequestJson,
      endSessionForAuthFailure,
      refreshWorkspaceFromServer,
      syncPendingWorkLogDrafts,
    ],
  );

  const runTaskAssignmentMutation = useCallback(
    async (mutation: () => Promise<unknown>) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        await mutation();
        const payload = await refreshWorkspaceFromServer(apiToken);
        const draftSyncError = await syncPendingWorkLogDrafts(
          apiToken,
          ensureArray(payload.workLogs),
          activeWorkLogDraftOwnerKey,
        );
        setBackendStatus(draftSyncError ? "offline" : "connected");
        setBackendReachability("reachable");
        setSyncError(draftSyncError);
        return true;
      } catch (error) {
        if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
          endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
          return false;
        }

        const conflict = getTaskAssignmentConflict(error);
        if (conflict) {
          // Assignment conflicts are expected in shared task queues; refresh
          // before messaging so the UI reflects the current owner.
          let refreshed = false;
          let refreshError: unknown = null;
          try {
            await refreshWorkspaceFromServer(apiToken);
            refreshed = true;
          } catch (error) {
            refreshError = error;
            refreshed = false;
          }
          setBackendStatus(refreshed ? "connected" : "offline");
          setBackendReachability(
            refreshed
              ? "reachable"
              : backendReachabilityAfterError(refreshError),
          );
          setSyncError(
            getTaskAssignmentConflictMessage(
              conflict,
              Object.fromEntries(members.map((member) => [member.id, member])),
              refreshed,
            ),
          );
          return false;
        }

        setBackendStatus("offline");
        setBackendReachability(backendReachabilityAfterError(error));
        setSyncError(getClientErrorMessage(error));
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [
      activeWorkLogDraftOwnerKey,
      apiToken,
      endSessionForAuthFailure,
      members,
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
    return sessionMember;
  }, [sessionMember]);
  const canUseSignedInMemberRoleFallback =
    sessionMember !== null && signedInMember?.id === sessionMember.id;
  const canMentorApprove =
    sessionUser?.role === "mentor" ||
    sessionUser?.role === "admin" ||
    (canUseSignedInMemberRoleFallback &&
      (signedInMember?.role === "mentor" || signedInMember?.role === "admin"));
  const canReassignTasks =
    sessionUser?.role === "lead" ||
    sessionUser?.role === "mentor" ||
    sessionUser?.role === "admin" ||
    (canUseSignedInMemberRoleFallback &&
      (signedInMember?.role === "lead" ||
        signedInMember?.role === "mentor" ||
        signedInMember?.role === "admin"));
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
        count: helpRequests.length + qaRequests.length + qaReviews.length,
      },
      {
        key: "roster",
        label: "Roster",
        shortLabel: "RO",
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

  const filteredTaskQueueCandidates = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();

    return [...tasks]
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
    tasks,
  ]);

  const taskQueueSections = useMemo(() => {
    return buildTaskQueueSections({
      activeTaskSubteam,
      canViewAllQueues: canMentorApprove,
      taskById,
      tasks: filteredTaskQueueCandidates,
    });
  }, [activeTaskSubteam, canMentorApprove, filteredTaskQueueCandidates, taskById]);

  const filteredTaskQueue = useMemo(() => {
    return taskQueueSections.flatMap((section) => section.tasks);
  }, [taskQueueSections]);

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

    const statusRank: Record<string, number> = {
      requested: 0,
      approved: 1,
      purchased: 2,
      shipped: 3,
      delivered: 4,
    };

    return purchaseItems.filter((item) => {
      if (activePersonFilter !== "all" && item.requestedById !== activePersonFilter) {
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
    }).sort((left, right) => {
      const createdDelta = getOptionalCreatedAt(right).localeCompare(getOptionalCreatedAt(left));
      if (createdDelta !== 0) {
        return createdDelta;
      }

      const statusDelta = statusRank[left.status] - statusRank[right.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return left.title.localeCompare(right.title);
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
      { label: "Iterations", value: String(iterationCount) },
    ] satisfies SummaryChipData[];
  }, [helpRequests.length, qaRequests.length, qaReviews]);

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
      { label: "Coming", value: String(presentCount) },
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

          // Require a clearly horizontal gesture so scrolling lists do not
          // accidentally move between subtabs.
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
          // Navigation swipes are intentionally looser than subtab swipes because
          // they start from the page edge and should feel easy to discover.
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
    const nextSubteam = getTaskSubteamForDisciplineId(task.disciplineId, activeTaskSubteam);

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
          authenticatedRequestJson(
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
          ),
        ),
      );
      await refreshWorkspaceFromServer(apiToken);
      setBackendStatus("connected");
      setBackendReachability("reachable");
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      setBackendStatus("offline");
      setBackendReachability(backendReachabilityAfterError(error));
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
      setActiveTaskSubteam(getTaskSubteamForDisciplineId(taskDraft.disciplineId, activeTaskSubteam));
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
      const response = await authenticatedRequestJson<MilestoneMutationResponse>(
        isEdit ? `/api/milestones/${activeMilestoneId}` : "/api/milestones",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
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
      setBackendReachability("reachable");
      closeMilestoneEditor();
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      setBackendStatus("offline");
      setBackendReachability(backendReachabilityAfterError(error));
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

  const claimTask = async (task: Task) => {
    if (!signedInMember || task.status === "complete") {
      return;
    }

    await runTaskAssignmentMutation(() =>
      claimTaskRequest(apiBaseUrl, task.id, false, apiToken, authenticatedRequestJson),
    );
  };

  const releaseTask = async (task: Task) => {
    if (!task.ownerId || task.status === "complete") {
      return;
    }

    await runTaskAssignmentMutation(() =>
      releaseTaskRequest(apiBaseUrl, task.id, apiToken, authenticatedRequestJson),
    );
  };

  const reassignTask = async (task: Task, ownerId: string | null) => {
    if (!canReassignTasks || task.status === "complete") {
      return;
    }

    await runTaskAssignmentMutation(() =>
      reassignTaskRequest(
        apiBaseUrl,
        task.id,
        ownerId,
        apiToken,
        authenticatedRequestJson,
      ),
    );
  };

  const startTask = async (task: Task, options: StartTaskOptions = {}) => {
    const { openWorkLog = true } = options;
    const currentTaskById = taskByIdRef.current;
    const currentTask = currentTaskById[task.id] ?? task;
    const status = getAutoTaskStatus(currentTask, currentTaskById);
    const hasOpenDependencies = currentTask.dependencyIds
      .map((dependencyId) => currentTaskById[dependencyId])
      .some((dependency) => dependency && dependency.status !== "complete");
    const assignmentState = getTaskAssignmentState({
      canReassignTasks,
      hasOpenDependencies,
      membersById,
      signedInMember,
      task: currentTask,
    });

    if (!assignmentState.canStartWork || currentTask.status === "complete") {
      return;
    }

    if (!currentTask.ownerId) {
      const ok = await runTaskAssignmentMutation(() =>
        claimTaskRequest(apiBaseUrl, task.id, true, apiToken, authenticatedRequestJson),
      );
      if (ok && openWorkLog) {
        openCreateWorkLogEditor(task.id);
      }
      return;
    }

    if (status !== "in-progress") {
      return;
    }

    if (task.status === "in-progress") {
      if (openWorkLog) {
        openCreateWorkLogEditor(task.id);
      }
      return;
    }

    setTasks((current) =>
      current.map((candidate) =>
        candidate.id === task.id ? { ...candidate, status } : candidate,
      ),
    );

    const ok = await runMutation(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify(buildOwnedTaskStartPayload(currentTask, status)),
    });
    if (ok && openWorkLog) {
      openCreateWorkLogEditor(task.id);
    }
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
        participantIds: getDefaultWorkLogParticipantIds(signedInMember, members),
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
        participantIds: getDefaultWorkLogParticipantIds(signedInMember, members),
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
          await startTask(loggedTask, { openWorkLog: false });
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

    if (backendStatus === "offline" && backendReachability === "unreachable") {
      const result = enqueuePendingWorkLogDraft(
        pendingWorkLogDraftsRef.current,
        payload,
        new Date(),
        { ownerKey: activeWorkLogDraftOwnerKey },
      );
      await persistPendingWorkLogDrafts(result.drafts);
      setSyncError(
        result.didCreate
          ? "Work log saved locally. It will sync when the backend is reachable."
          : "Work log draft is already saved locally and waiting to sync.",
      );
      closeWorkLogEditor();
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    let serverCreateSucceeded = false;
    try {
      await authenticatedRequestJson<WorkLogMutationResponse>(
        "/api/work-logs",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      serverCreateSucceeded = true;
      const refreshedPayload = await refreshWorkspaceFromServer(apiToken);
      const draftSyncError = await syncPendingWorkLogDrafts(
        apiToken,
        ensureArray(refreshedPayload.workLogs),
        activeWorkLogDraftOwnerKey,
      );
      setBackendStatus(draftSyncError ? "offline" : "connected");
      setBackendReachability("reachable");
      setSyncError(draftSyncError);

      const loggedTask = taskById[workLogDraft.taskId];
      if (loggedTask) {
        await startTask(loggedTask, { openWorkLog: false });
      }

      closeWorkLogEditor();
    } catch (error) {
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session"));
        return;
      }

      if (serverCreateSucceeded) {
        setBackendStatus("offline");
        setBackendReachability("reachable");
        setSyncError(getClientErrorMessage(error));
        closeWorkLogEditor();
        return;
      }

      if (!shouldQueueWorkLogDraftAfterError(error)) {
        setBackendStatus("offline");
        setBackendReachability(backendReachabilityAfterError(error));
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
      setBackendReachability(backendReachabilityAfterError(error));
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

    if (!canMentorApprove) {
      setWorkLogError("Only a mentor or admin can delete a synced work log.");
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
      batchLabel: manufacturingDraft.batchLabel.trim() || undefined,
      qaReviewCount: parsedQaReviewCount,
      ...(manufacturingEditorMode === "create"
        ? { status: "requested", mentorReviewed: false }
        : {}),
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
    if (!activeManufacturingId || !canMentorApprove) {
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
    if (patch.mentorReviewed !== undefined) {
      await runMutation(`/api/manufacturing/${item.id}/review`, {
        method: "PUT",
        body: JSON.stringify({ reviewed: patch.mentorReviewed }),
      });
      return;
    }

    if (patch.status !== undefined) {
      await runMutation(`/api/manufacturing/${item.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ status: patch.status }),
      });
    }
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
        canMentorApprove && typeof parsedFinal === "number" && !Number.isNaN(parsedFinal)
          ? parsedFinal
          : undefined,
      ...(purchaseEditorMode === "create"
        ? { approvedByMentor: false, status: "requested" }
        : {}),
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
    if (!activePurchaseId || !canMentorApprove) {
      return;
    }

    const ok = await runMutation(`/api/purchases/${activePurchaseId}`, {
      method: "DELETE",
    });

    if (ok) {
      closePurchaseEditor();
    }
  };

  const approvePurchaseItem = async (item: PurchaseItem, approved: boolean) => {
    await runMutation(`/api/purchases/${item.id}/approval`, {
      method: "PUT",
      body: JSON.stringify({ approved }),
    });
  };

  const transitionPurchaseItem = async (
    item: PurchaseItem,
    status: PurchaseItem["status"],
  ) => {
    await runMutation(`/api/purchases/${item.id}/transition`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  };

  const openCreateMemberEditor = (role: MemberRole = "student") => {
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
    clearWorkLogTimer();
    void syncFromBackend();
  };

  const clearIdentityScopedState = () => {
    setMembers([]);
    setSubsystems([]);
    setDisciplines([]);
    setMechanisms([]);
    tasksRef.current = [];
    taskByIdRef.current = {};
    setTasks([]);
    setEvents([]);
    workLogsRef.current = [];
    setWorkLogs([]);
    pendingWorkLogDraftsRef.current = [];
    setPendingWorkLogDrafts([]);
    setManufacturingItems([]);
    setPurchaseItems([]);
    setPartDefinitions([]);
    setPartInstances([]);
    setQaReviews([]);
    setQaRequests([]);
    setHelpRequests([]);
    setActivePersonFilter("all");
    setSelectedMemberId(null);
    setIsPersonMenuVisible(false);
    setIsSeasonMenuVisible(false);
    setIsNavMenuVisible(false);
    setIsProjectOverlayVisible(false);
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
    clearWorkLogTimer();
  };
  clearIdentityScopedStateRef.current = clearIdentityScopedState;

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

  const finishLocalSignOut = async (serverSignOutConfirmed: boolean) => {
    mobileSessionRef.current = null;
    await clearPersistedAuthSession().catch(() => undefined);
    setApiToken(null);
    setSessionUser(null);
    setHasAuthenticated(false);
    setThemeOverride(null);
    setAuthCode("");
    setAuthEmail("");
    setAuthError(null);
    setAuthNotice(
      serverSignOutConfirmed
        ? null
        : "Local sign-out completed, but the server could not confirm revocation. Sign in again when connected to manage this device session.",
    );
    setIsAuthenticating(false);
    setHasRequestedEmailCode(false);
    setSyncError(null);
    setIsDeviceSessionsVisible(false);
    setDeviceSessions([]);
    setDeviceSessionsError(null);
    clearIdentityScopedState();
    await purgeExpiredWorkLogDrafts().catch(() => undefined);
  };

  const signOut = async () => {
    const mobileSession = mobileSessionRef.current;
    if (!mobileSession) {
      await finishLocalSignOut(true);
      return;
    }

    await revokeThenClearMobileSession({
      revokeServerState: () =>
        requestJson(
          apiBaseUrl,
          "/api/auth/mobile/logout",
          {
            method: "POST",
            body: JSON.stringify({ refreshToken: mobileSession.refreshToken }),
          },
          mobileSession.token,
          AUTH_REQUEST_TIMEOUT_MS,
        ),
      clearLocalState: finishLocalSignOut,
    });
  };

  const openDeviceSessions = async () => {
    setIsPersonMenuVisible(false);
    setIsDeviceSessionsVisible(true);
    setIsLoadingDeviceSessions(true);
    setDeviceSessionsError(null);
    try {
      const response = await authenticatedRequestJson<{
        sessions: MobileDeviceSessionSummary[];
      }>("/api/auth/mobile/sessions");
      setDeviceSessions(response.sessions);
    } catch (error) {
      setDeviceSessionsError(getClientErrorMessage(error));
    } finally {
      setIsLoadingDeviceSessions(false);
    }
  };

  const revokeDeviceSession = async (sessionId: string) => {
    setDeviceSessionsError(null);
    try {
      await authenticatedRequestJson(`/api/auth/mobile/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (mobileSessionRef.current?.session.id === sessionId) {
        await finishLocalSignOut(true);
        return;
      }
      setDeviceSessions((current) =>
        current.filter((session) => session.id !== sessionId),
      );
    } catch (error) {
      setDeviceSessionsError(getClientErrorMessage(error));
    }
  };

  const revokeAllDeviceSessions = async () => {
    setDeviceSessionsError(null);
    try {
      await authenticatedRequestJson("/api/auth/mobile/logout-all", { method: "POST" });
      await finishLocalSignOut(true);
    } catch (error) {
      setDeviceSessionsError(getClientErrorMessage(error));
    }
  };

  const screenProps = {
    activeTaskSubteam,
    activeTaskSubteamLabel,
    appResponsiveStyles,
    attendancePreview,
    attendanceSummary,
    approvePurchaseItem,
    canMentorApprove,
    canReassignTasks,
    claimTask,
    clearTaskBlockers,
    disciplinesById,
    editTagStyle,
    eventOptions,
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
    reassignTask,
    requestTaskQa,
    releaseTask,
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
    signedInMember,
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
    transitionPurchaseItem,
    taskOwnerFilter,
    taskPriorityFilter,
    taskQueueSections,
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
        <TaskEditorModal
          addTaskDependency={addTaskDependency}
          appResponsiveStyles={appResponsiveStyles}
          availableTaskDependencyOptions={availableTaskDependencyOptions}
          deleteTaskDraft={deleteTaskDraft}
          disciplineOptions={disciplineOptions}
          disciplinesById={disciplinesById}
          downstreamTaskDependencies={downstreamTaskDependencies}
          eventOptions={eventOptions}
          eventsById={eventsById}
          isLandscapeCardLayout={isLandscapeCardLayout}
          mechanismAndTaskPartOptions={mechanismAndTaskPartOptions}
          mechanismOptions={mechanismOptions}
          mechanisms={mechanisms}
          mechanismsById={mechanismsById}
          memberOptions={memberOptions}
          onCancel={closeTaskEditor}
          onSave={saveTaskDraft}
          partInstances={partInstances}
          partInstancesById={partInstancesById}
          removeTaskDependency={removeTaskDependency}
          selectedTaskDependencies={selectedTaskDependencies}
          setTaskDependencySearch={setTaskDependencySearch}
          setTaskDraft={setTaskDraft}
          subsystemsById={subsystemsById}
          taskDependencyReadinessMessage={taskDependencyReadinessMessage}
          taskDependencySearch={taskDependencySearch}
          taskDraft={taskDraft}
          taskEditorError={taskEditorError}
          taskEditorMode={taskEditorMode}
          taskSubsystemOptions={taskSubsystemOptions}
          themeColors={themeColors}
        />

        <DeadlineEditorModal
          deadlineDate={deadlineDate}
          deadlineError={deadlineError}
          deadlineTitle={deadlineTitle}
          onCancel={closeDeadlineEditor}
          onSave={saveDeadlineDraft}
          setDeadlineDate={setDeadlineDate}
          setDeadlineTitle={setDeadlineTitle}
          themeColors={themeColors}
          visible={deadlineEditorVisible}
        />

        <MilestoneEditorModal
          appResponsiveStyles={appResponsiveStyles}
          deleteMilestoneDraft={deleteMilestoneDraft}
          milestoneDraft={milestoneDraft}
          milestoneEditorMode={milestoneEditorMode}
          milestoneEndDate={milestoneEndDate}
          milestoneEndTime={milestoneEndTime}
          milestoneError={milestoneError}
          milestoneStartDate={milestoneStartDate}
          milestoneStartTime={milestoneStartTime}
          onCancel={closeMilestoneEditor}
          onSave={saveMilestoneDraft}
          setMilestoneDraft={setMilestoneDraft}
          setMilestoneEndDate={setMilestoneEndDate}
          setMilestoneEndTime={setMilestoneEndTime}
          setMilestoneError={setMilestoneError}
          setMilestoneStartDate={setMilestoneStartDate}
          setMilestoneStartTime={setMilestoneStartTime}
        />

        <WorkLogEditorModal
          appResponsiveStyles={appResponsiveStyles}
          deleteWorkLogDraft={deleteWorkLogDraft}
          onCancel={closeWorkLogEditor}
          onSave={saveWorkLogDraft}
          setWorkLogDraft={setWorkLogDraft}
          setWorkLogError={setWorkLogError}
          taskOptions={taskOptions}
          workLogDraft={workLogDraft}
          workLogEditorMode={workLogEditorMode}
          workLogError={workLogError}
        />

        <ManufacturingEditorModal
          appResponsiveStyles={appResponsiveStyles}
          canDelete={canMentorApprove}
          deleteManufacturingDraft={deleteManufacturingDraft}
          manufacturingDraft={manufacturingDraft}
          manufacturingEditorMode={manufacturingEditorMode}
          manufacturingError={manufacturingError}
          memberOptions={memberOptions}
          onCancel={closeManufacturingEditor}
          onSave={saveManufacturingDraft}
          requesterName={
            membersById[manufacturingDraft.requestedById]?.name ??
            signedInMember?.name ??
            "Signed-in person"
          }
          setManufacturingDraft={setManufacturingDraft}
          setManufacturingError={setManufacturingError}
          subsystemOptions={subsystemOptions}
          themeColors={themeColors}
        />

        <PurchaseEditorModal
          appResponsiveStyles={appResponsiveStyles}
          canManageProtectedFields={canMentorApprove}
          deletePurchaseDraft={deletePurchaseDraft}
          memberOptions={memberOptions}
          onCancel={closePurchaseEditor}
          onSave={savePurchaseDraft}
          purchaseDraft={purchaseDraft}
          purchaseEditorMode={purchaseEditorMode}
          purchaseError={purchaseError}
          setPurchaseDraft={setPurchaseDraft}
          setPurchaseError={setPurchaseError}
          subsystemOptions={subsystemOptions}
        />

        <PartDefinitionEditorModal
          appResponsiveStyles={appResponsiveStyles}
          deletePartDefinitionDraft={deletePartDefinitionDraft}
          onCancel={closePartDefinitionEditor}
          onSave={savePartDefinitionDraft}
          partDefinitionDraft={partDefinitionDraft}
          partDefinitionEditorMode={partDefinitionEditorMode}
          partDefinitionError={partDefinitionError}
          setPartDefinitionDraft={setPartDefinitionDraft}
          setPartDefinitionError={setPartDefinitionError}
        />

        <MemberEditorModal
          appResponsiveStyles={appResponsiveStyles}
          deleteMemberDraft={deleteMemberDraft}
          disciplineOptions={disciplineOptions}
          memberDraft={memberDraft}
          memberEditorMode={memberEditorMode}
          memberError={memberError}
          onCancel={closeMemberEditor}
          onSave={saveMemberDraft}
          setMemberDraft={setMemberDraft}
          setMemberError={setMemberError}
          showProfilePhotoUrlOnlyMessage={showProfilePhotoUrlOnlyMessage}
          themeColors={themeColors}
        />

        <SubsystemEditorModal
          appResponsiveStyles={appResponsiveStyles}
          deleteSubsystemDraft={deleteSubsystemDraft}
          memberOptions={memberOptions}
          onCancel={closeSubsystemEditor}
          onSave={saveSubsystemDraft}
          setSubsystemDraft={setSubsystemDraft}
          setSubsystemError={setSubsystemError}
          subsystemDraft={subsystemDraft}
          subsystemEditorMode={subsystemEditorMode}
          subsystemError={subsystemError}
        />

        <QaReportEditorModal
          appResponsiveStyles={appResponsiveStyles}
          onCancel={closeQaReportEditor}
          onSave={saveQaReportDraft}
          qaReportDraft={qaReportDraft}
          qaReportEditorMode={qaReportEditorMode}
          qaReportError={qaReportError}
          setActiveQaRequestId={setActiveQaRequestId}
          setQaReportDraft={setQaReportDraft}
          setQaReportError={setQaReportError}
          taskOptions={taskOptions}
        />

      </>
    );
  };

  return (
    <LocalizationProvider languageOverride={languageOverride}>
      {isRestoringAuthSession ? null : !hasAuthenticated ? (
        <LoginScreen
          authCode={authCode}
          authConfig={authConfig}
          authEmail={authEmail}
          authError={authError}
          authNotice={authNotice}
          canRetrySavedSession={Boolean(mobileSessionRef.current)}
          hasRequestedEmailCode={hasRequestedEmailCode}
          height={height}
          isAuthenticating={isAuthenticating}
          isDarkModeEnabled={isDarkModeEnabled}
          isDevBypassAvailable={isDevBypassAvailable}
          retrySavedSession={() => {
            void retrySavedSession();
          }}
          setAuthCode={setAuthCode}
          setAuthEmail={setAuthEmail}
          setAuthError={setAuthError}
          setAuthErrorState={setAuthErrorState}
          setAuthNotice={setAuthNotice}
          setHasRequestedEmailCode={setHasRequestedEmailCode}
          signInWithDevBypass={signInWithDevBypass}
          signInWithEmail={signInWithEmail}
          width={width}
        />
      ) : (
        <AppThemeProvider value={{ colors: themeColors, mode: themeMode }}>
          <WorkspaceShell
            activeSeasonId={activeSeasonId}
            activeSubtabIndex={activeSubtabIndex}
            activeSubtabOptions={activeSubtabOptions}
            activeTab={activeTab}
            activeTabContent={<ActiveTabContent activeTab={activeTab} screenProps={screenProps} />}
            activeTabLabel={activeTabLabel}
            apiToken={apiToken}
            createSeason={createSeason}
            deleteSeason={deleteSeason}
            deviceSessions={deviceSessions}
            deviceSessionsError={deviceSessionsError}
            editorModals={renderEditorModals()}
            hasSubtabPages={hasSubtabPages}
            isAttendanceModalVisible={isAttendanceModalVisible}
            isCompactLayout={isCompactLayout}
            isDarkModeEnabled={isDarkModeEnabled}
            isDeviceSessionsVisible={isDeviceSessionsVisible}
            isLoadingDeviceSessions={isLoadingDeviceSessions}
            isNavMenuVisible={isNavMenuVisible}
            isPersonMenuVisible={isPersonMenuVisible}
            isProjectOverlayVisible={isProjectOverlayVisible}
            isSeasonMenuVisible={isSeasonMenuVisible}
            meetingAttendance={meetingAttendance}
            navigationCloseHandlers={navigationCloseSwipeResponder.panHandlers}
            navigationOpenHandlers={navigationOpenSwipeResponder.panHandlers}
            navigationSections={navigationSections}
            onCloseAttendance={() => setIsAttendanceModalVisible(false)}
            onCloseDeviceSessions={() => setIsDeviceSessionsVisible(false)}
            onCloseNavigation={closeNavigationMenu}
            onClosePersonMenu={() => {
              setIsPersonMenuVisible(false);
              setIsSeasonMenuVisible(false);
            }}
            onCloseProjectOverlay={() => setIsProjectOverlayVisible(false)}
            onOpenNavigation={openNavigationMenu}
            onOpenDeviceSessions={() => {
              void openDeviceSessions();
            }}
            onOpenPersonMenu={() => {
              setIsSeasonMenuVisible(false);
              setIsPersonMenuVisible(true);
            }}
            onOpenProjectOverlay={() => setIsProjectOverlayVisible(true)}
            onOpenSubsystems={() => {
              setActiveTab("subsystems");
              setIsProjectOverlayVisible(false);
            }}
            onResetWorkspaceData={resetWorkspaceData}
            onRevokeAllDeviceSessions={() => {
              void revokeAllDeviceSessions();
            }}
            onRevokeDeviceSession={(sessionId) => {
              void revokeDeviceSession(sessionId);
            }}
            onSelectSeason={(seasonId) => {
              setActiveSeasonId(seasonId);
              setIsSeasonMenuVisible(false);
            }}
            onSelectTab={selectNavigationTab}
            onSignOut={signOut}
            onToggleSeasonMenu={() => setIsSeasonMenuVisible((current) => !current)}
            onUpdateThemePreference={updateThemePreference}
            personInitial={signedInEmailInitial}
            responsiveStyles={appResponsiveStyles}
            seasonModeLabel={seasonModeLabel}
            seasons={seasons}
            signedInEmailInitial={signedInEmailInitial}
            subtabSwipeHandlers={subtabSwipeResponder.panHandlers}
            syncError={syncError}
            syncStatusLabel={syncStatusLabel}
            themeColors={themeColors}
            themeMode={themeMode}
          />
        </AppThemeProvider>
      )}
    </LocalizationProvider>
  );
}
