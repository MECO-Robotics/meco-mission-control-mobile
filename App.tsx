import { useSubsystemBrowse } from "./src/screens/robot/useSubsystemBrowse";
import { useMaterialsBrowse } from "./src/screens/inventory/useMaterialsBrowse";
import { usePartsBrowse } from "./src/screens/inventory/usePartsBrowse";
import { useManufacturingEditor } from "./src/app/editorModals/useManufacturingEditor";
import { usePurchaseEditor } from "./src/app/editorModals/usePurchaseEditor";
import { useMilestoneEditor, type MilestonePayload } from "./src/app/editorModals/useMilestoneEditor";
import { formatHoursFromTimer, getWorkLogTimerElapsedMs, type WorkLogTimerState } from "./src/screens/worklogs/workLogTimer";
import { getAutoTaskStatus, isTaskBlocked, isTaskReadyForQaPass } from "./src/data/taskReadiness";
import { useTaskEditor } from "./src/screens/tasks/useTaskEditor";
import { createWorkLogQueue } from "./src/services/workLogQueue";
import { createTaskState } from "./src/screens/tasks/taskState";
import { getSessionPermissions } from "./src/data/sessionPermissions";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Platform,
  useColorScheme,
  useWindowDimensions,
} from "react-native";

import {
  EVENT_TYPE_STYLES,
  TASK_SUBTEAM_DISCIPLINE_IDS,
  TASK_SUBTEAM_OPTIONS,
} from "./src/ui/constants";
import {
  buildDateTime,
  buildWorkLogDraft,
  formatDate,
  formatDateTime,
  isoToday,
  localTodayDate,
  splitList,
  shiftDateByDays,
} from "./src/ui/helpers";
import { getResponsiveMetrics, scaleFont } from "./src/ui/responsive";
import { styles } from "./src/ui/styles";
import type {
  EditorMode,
  MilestoneSortField,
  QaReportDraft,
  SummaryChipData,
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
  claimTaskRequest,
  getDefaultWorkLogParticipantIds,
  getTaskAssignmentConflict,
  getTaskAssignmentConflictMessage,
  getTaskAssignmentState,
  reassignTaskRequest,
  releaseTaskRequest,
} from "./src/data/taskAssignment";
import {
  getTaskSubteamForDisciplineId,
} from "./src/data/taskQueueOrdering";
import type {
  Discipline,
  Event,
  ManufacturingItem,
  Member,
  Mechanism,
  PartDefinition,
  PartInstance,
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
  TaskBlocker,
  TaskDependency,
  WorkLog,
} from "./src/types/domain";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  RISK_PRIORITY_RANK,
  applyMilestoneSubsystemLinks,
  backendReachabilityAfterError,
  buildSubsystemOptions,
  buildTaskById,
  ensureArray,
  getClientErrorMessage,
  getEmailCodeVerificationErrorMessage,
  getQaReviewTaskId,
  getWorkLogDraftOwnerKey,
  hasRequiredEmailDomain,
  isWorkLogDraftOwnedBy,
  mapMilestonesToEvents,
  mapPendingWorkLogDraftToWorkLog,
  mapTaskPriorityToRiskPriority,
  normalizeRequiredEmailDomain,
  normalizeTaskFromServer,
  parseClientError,
  shouldQueueWorkLogDraftAfterError,
  type BackendReachability,
  type MilestoneMutationResponse,
  type StartTaskOptions,
  type WorkLogMutationResponse,
} from "./src/app/appModel";
import {
  DEVICE_SESSION_RESTORED_NOTICE,
  normalizeThemeModeFromResponse,
  resolveEmailSignInOperation,
  type EmailCodeStartResponse,
  type ThemePreferenceResponse,
} from "./src/app/authConfigModel";
import { useTaskQueue } from "./src/screens/tasks/useTaskQueue";
import { TasksScreen } from "./src/screens/tasks/TasksScreen";
import type { TaskScreenProps } from "./src/screens/tasks/taskScreenTypes";
import { ActiveTabContent } from "./src/app/components/ActiveTabContent";
import { LoginScreen } from "./src/app/components/LoginScreen";
import { WorkspaceShell } from "./src/app/components/WorkspaceShell";
import { DeadlineEditorModal } from "./src/app/editorModals/DeadlineEditorModal";
import { ManufacturingEditorModal } from "./src/app/editorModals/ManufacturingEditorModal";
import { useManufacturingBrowse } from "./src/screens/manufacturing/useManufacturingBrowse";
import { usePurchaseBrowse } from "./src/screens/inventory/usePurchaseBrowse";
import { usePartDefinitionEditor } from "./src/app/editorModals/usePartDefinitionEditor";
import { useSubsystemEditor } from "./src/app/editorModals/useSubsystemEditor";
import { useMemberEditor } from "./src/app/editorModals/useMemberEditor";
import { MemberEditorModal } from "./src/app/editorModals/MemberEditorModal";
import { MilestoneEditorModal } from "./src/app/editorModals/MilestoneEditorModal";
import { PartDefinitionEditorModal } from "./src/app/editorModals/PartDefinitionEditorModal";
import { PurchaseEditorModal } from "./src/app/editorModals/PurchaseEditorModal";
import { QaReportEditorModal } from "./src/app/editorModals/QaReportEditorModal";
import { SubsystemEditorModal } from "./src/app/editorModals/SubsystemEditorModal";
import { TaskEditorModal } from "./src/screens/tasks/TaskEditorModal";
import { WorkLogEditorModal } from "./src/app/editorModals/WorkLogEditorModal";

import { appThemes, type AppThemeName } from "./src/theme";
import type { AttendanceStatus, WorkLogListItem } from "./src/screens/types";
import {
  buildWorkLogDraftFingerprint,
  enqueuePendingWorkLogDraft,
  reconcilePendingWorkLogDrafts,
  removePendingWorkLogDraft,
} from "./src/services/workLogDraftSync";
import {
  purgeExpiredWorkLogDrafts,
} from "./src/services/workLogDraftStorage";
import {
  clearPersistedAuthSession,
  getOrCreateAuthDeviceNumber,
  loadPersistedAuthSession,
  savePersistedAuthSession,
  type PersistedAuthSession,
} from "./src/services/authSessionStorage";
import { ActiveMobileSessionCoordinator } from "./src/services/activeMobileSession";
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
  const authSessionVersionRef = useRef(0);
  const authSessionCoordinatorRef = useRef(
    new ActiveMobileSessionCoordinator({
      clear: clearPersistedAuthSession,
      persist: savePersistedAuthSession,
    }),
  );
  const clearIdentityScopedStateRef = useRef<() => void>(() => undefined);
  const isLocalDevBypassAvailable = isLocalDevAuthBypassEnabled();
  const requiredEmailDomain = normalizeRequiredEmailDomain(authConfig?.hostedDomain);
  const isAuthConfigUnavailable = authErrorState === "auth-config-unavailable";
  const isDevBypassAvailable =
    isLocalDevBypassAvailable || authConfig?.devBypassAvailable === true;

  const endSessionForAuthFailure = useCallback(async (message: string) => {
    authSessionVersionRef.current += 1;
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
    await authSessionCoordinatorRef.current.clear().catch(() => undefined);
  }, []);

  const saveActiveMobileSession = useCallback(
    async (
      session: PersistedAuthSession,
      expectedVersion = authSessionVersionRef.current,
    ) => {
      return authSessionCoordinatorRef.current.commit({
        expectedVersion,
        getVersion: () => authSessionVersionRef.current,
        publish: (nextSession) => {
          mobileSessionRef.current = nextSession;
          setApiToken(nextSession.token);
          setSessionUser(nextSession.user);
        },
        session,
      });
    },
    [],
  );

  const mobileSessionClient = useMemo(
    () =>
      new MobileSessionClient({
        baseUrl: apiBaseUrl,
        getSession: () => mobileSessionRef.current,
        getSessionVersion: () => authSessionVersionRef.current,
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
  const [scheduleView, setScheduleView] = useState<"milestones" | "timeline">("milestones");
  const taskView: TaskViewTab = activeTab === "work-schedule" ? scheduleView : "queue";
  const [activeTaskSubteam, setActiveTaskSubteam] =
    useState<TaskSubteamTab>("programming");
  const [isPersonMenuVisible, setIsPersonMenuVisible] = useState(false);
  const [isDeviceSessionsVisible, setIsDeviceSessionsVisible] = useState(false);
  const [deviceSessions, setDeviceSessions] = useState<MobileDeviceSessionSummary[]>([]);
  const [deviceSessionsError, setDeviceSessionsError] = useState<string | null>(null);
  const [isLoadingDeviceSessions, setIsLoadingDeviceSessions] = useState(false);
  const [attendanceStatusByMemberId, setAttendanceStatusByMemberId] =
    useState<Record<string, AttendanceStatus>>({});
  const [themeOverride, setThemeOverride] = useState<AppThemeName | null>(null);
  const [languageOverride] = useState<LanguageCode | null>(null);
  const [activePersonFilter, setActivePersonFilter] = useState("all");

  const [members, setMembers] = useState<Member[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [taskState] = useState(() => createTaskState([]));
  const tasks = useSyncExternalStore(taskState.subscribe, taskState.getSnapshot);
  const setTasks = taskState.replace;
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
  const [taskBlockers, setTaskBlockers] = useState<TaskBlocker[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const workLogsRef = useRef<WorkLog[]>([]);
  const hasRestoredAuthSessionRef = useRef(false);
  const startTaskRef = useRef<(task: Task, options?: StartTaskOptions) => Promise<void>>(
    async () => undefined,
  );
  const activeWorkLogDraftOwnerKey = useMemo(
    () => getWorkLogDraftOwnerKey(sessionUser),
    [sessionUser],
  );
  const activeMobileSessionId = mobileSessionRef.current?.session.id ?? activeWorkLogDraftOwnerKey;
  const workLogSession = useMemo(() => {
    const version = authSessionVersionRef.current;
    return { id: activeMobileSessionId, queue: createWorkLogQueue(activeWorkLogDraftOwnerKey, undefined, () => authSessionVersionRef.current === version) };
  }, [activeWorkLogDraftOwnerKey, activeMobileSessionId]);
  const workLogQueue = workLogSession.queue;
  const pendingWorkLogDrafts = useSyncExternalStore(workLogQueue.subscribe, workLogQueue.getSnapshot);
  useEffect(() => {
    workLogQueue.activate();
    void workLogQueue.ready().catch((error: unknown) => {
      if (workLogQueue.isActive()) setSyncError(getClientErrorMessage(error));
    });
    return () => workLogQueue.dispose();
  }, [workLogQueue]);
  const [manufacturingItems, setManufacturingItems] = useState<ManufacturingItem[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [partDefinitions, setPartDefinitions] = useState<PartDefinition[]>([]);
  const [partInstances, setPartInstances] = useState<PartInstance[]>([]);
  const [qaReviews, setQaReviews] = useState<QaReview[]>([]);
  const [qaRequests, setQaRequests] = useState<QaRequest[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const systemThemeMode: AppThemeName = systemColorScheme === "dark" ? "dark" : "light";
  const themeMode = themeOverride ?? systemThemeMode;
  const isDarkModeEnabled = themeMode === "dark";
  const themeColors = appThemes[themeMode];

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

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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

  const applyBootstrapPayload = useCallback((payload: PlatformBootstrapPayload) => {
    const events = ensureArray(payload.events);
    const tasks = ensureArray(payload.tasks).map((task) => normalizeTaskFromServer(task));
    const payloadWorkLogs = ensureArray(payload.workLogs);

    // Keep refs and state in lockstep for async callbacks that need the latest
    // workspace snapshot without retriggering every callback when data changes.
    setMembers(ensureArray(payload.members));
    setSubsystems(ensureArray(payload.subsystems));
    setDisciplines(ensureArray(payload.disciplines));
    setMechanisms(ensureArray(payload.mechanisms));
    setTasks(tasks);
    setTaskDependencies(ensureArray(payload.taskDependencies));
    setTaskBlockers(ensureArray(payload.taskBlockers));
    setEvents(events.length > 0 ? events : mapMilestonesToEvents(payload));
    workLogsRef.current = payloadWorkLogs;
    setWorkLogs(payloadWorkLogs);
    setManufacturingItems(ensureArray(payload.manufacturingItems));
    setPurchaseItems(ensureArray(payload.purchaseItems));
    setQaRequests(ensureArray(payload.qaRequests));
    setQaReviews(ensureArray(payload.qaReports).map((report) => ({ ...report,
      subjectId: report.taskId, subjectType: "task",
      subjectTitle: tasks.find((task) => task.id === report.taskId)?.title ?? report.taskId,
    })));
    setHelpRequests(ensureArray(payload.helpRequests));
    setPartDefinitions(ensureArray(payload.partDefinitions));
    setPartInstances(ensureArray(payload.partInstances));
  }, [setTasks]);

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

  const syncPendingWorkLogDrafts = useCallback(async (
    token: string | null, serverWorkLogs: WorkLog[] = workLogsRef.current,
    ownerKey: string | null = activeWorkLogDraftOwnerKey,
  ) => {
    if (ownerKey !== activeWorkLogDraftOwnerKey) return null;
    await workLogQueue.ready();
    if (workLogQueue.getSnapshot().length === 0) return null;
    const result = await workLogQueue.sync(serverWorkLogs, async (draft) => {
      await authenticatedRequestJson<WorkLogMutationResponse>("/api/work-logs", {
        method: "POST", body: JSON.stringify(draft.payload),
      }, undefined, token);
    }, async (draft) => {
      const task = taskState.getSnapshot().find((candidate) => candidate.id === draft.payload.taskId);
      if (task) await startTaskRef.current(task, { openWorkLog: false });
    }, (failure) => classifyMobileAuthError(failure, "authenticated") === "expired-session", getClientErrorMessage);
    if (!result || !workLogQueue.isActive()) return null;
    const payload = await authenticatedRequestJson<PlatformBootstrapPayload>("/api/bootstrap", undefined, undefined, token);
    if (!workLogQueue.isActive()) return null;
    applyBootstrapPayload(payload);
    await workLogQueue.update((current) => reconcilePendingWorkLogDrafts(current, ensureArray(payload.workLogs), ownerKey));
    return result.error;
  }, [activeWorkLogDraftOwnerKey, workLogQueue, authenticatedRequestJson, taskState, applyBootstrapPayload]);

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
        try {
          const deviceNumber = await getOrCreateAuthDeviceNumber();
          const sessionSaved = await saveActiveMobileSession({
            ...mobileSession,
            deviceNumber,
          });
          if (!sessionSaved) {
            setIsSyncing(false);
            return;
          }
        } catch (error) {
          setAuthError(getClientErrorMessage(error));
          setAuthErrorState(classifyMobileAuthError(error));
          setIsSyncing(false);
          return;
        }
      } else {
        authSessionVersionRef.current += 1;
        mobileSessionRef.current = null;
        setApiToken(token);
        setSessionUser(user);
        await authSessionCoordinatorRef.current.clear().catch(() => undefined);
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
      } catch (error) {
        if (isActive) {
          setAuthError(getClientErrorMessage(error));
          setAuthErrorState(classifyMobileAuthError(error));
        }
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

  const completeMutation = useCallback(async () => {
    const payload = await refreshWorkspaceFromServer(apiToken);
    const draftSyncError = await syncPendingWorkLogDrafts(
      apiToken,
      ensureArray(payload.workLogs),
      activeWorkLogDraftOwnerKey,
    );
    setBackendStatus(draftSyncError ? "offline" : "connected");
    setBackendReachability("reachable");
    setSyncError(draftSyncError);
  }, [activeWorkLogDraftOwnerKey, apiToken, refreshWorkspaceFromServer, syncPendingWorkLogDrafts]);

  const runMutation = useCallback(
    async (path: string, init: RequestInit) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        await authenticatedRequestJson(path, init);
        await completeMutation();
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
      authenticatedRequestJson,
      completeMutation,
      endSessionForAuthFailure,
      
    ],
  );

  const runTaskAssignmentMutation = useCallback(
    async (mutation: () => Promise<unknown>) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        await mutation();
        await completeMutation();
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
      apiToken,
      completeMutation,
      endSessionForAuthFailure,
      members,
      refreshWorkspaceFromServer,
    ],
  );

  const membersById = useMemo(() => {
    return Object.fromEntries(
      members.map((member) => [member.id, member]),
    ) as Record<string, (typeof members)[number]>;
  }, [members]);
  const { signedInMember, canMentorApprove, canReassignTasks, canSubmitQa } = useMemo(
    () => getSessionPermissions(sessionUser, members),
    [sessionUser, members],
  );
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
  const taskEditor = useTaskEditor({ mechanisms, partInstances, tasks, taskById, taskDependencies, members, membersById, disciplines,
    subsystemsById, taskSubsystemOptions, activeTaskSubteam, setActiveTaskSubteam,
    request: authenticatedRequestJson, refresh: () => refreshWorkspaceFromServer(apiToken),
  });
  const { openCreateTaskEditor, openEditTaskEditor, openDuplicateTaskEditor, closeTaskEditor } = taskEditor;
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
  const taskLoggedHoursById = useMemo(() => {
    return workLogsForDisplay.reduce<Record<string, number>>((hoursByTaskId, workLog) => {
      hoursByTaskId[workLog.taskId] = (hoursByTaskId[workLog.taskId] ?? 0) + workLog.hours;
      return hoursByTaskId;
    }, {});
  }, [workLogsForDisplay]);

  const taskQueue = useTaskQueue({ tasks, taskLoggedHoursById, activeTaskSubteam,
    canMentorApprove, activePersonFilter, membersById, mechanismsById, subsystemsById });
  const { taskArchiveFilter } = taskQueue.filters;

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
        timelineSubsystemFilter === "all" ? true : task.subsystemIds.includes(timelineSubsystemFilter),
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

      if (workLogSubsystemFilter !== "all" && !task?.subsystemIds.includes(workLogSubsystemFilter)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const participantNames = workLog.participantIds
        .map((participantId) => membersById[participantId]?.name ?? "")
        .join(" ");
      const taskText = `${task?.title ?? ""} ${task?.summary ?? ""}`;
      const subsystemText = task?.subsystemIds.map((id) => subsystemsById[id]?.name ?? "").join(" ") ?? "";

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

  const manufacturingBrowse = useManufacturingBrowse({
    items: manufacturingItems, activePersonFilter, membersById, subsystemsById,
  });
  const purchaseBrowse = usePurchaseBrowse({
    items: purchaseItems, activePersonFilter, membersById, subsystemsById,
  });

  const materialsBrowse = useMaterialsBrowse({ manufacturingItems, purchaseItems });
  const partsBrowse = usePartsBrowse({ partDefinitions, partInstances, tasks, partDefinitionsById, mechanismsById });

  const subsystemBrowse = useSubsystemBrowse({
    subsystems, mechanisms, tasks, purchaseItems, qaReviews, membersById, taskById,
  });

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
        subsystemId: (task.subsystemIds[0] ?? ""),
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
          subsystemId: task?.subsystemIds[0] ?? "",
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
        const subsystemName = subsystemsById[(task.subsystemIds[0] ?? "")]?.name ?? "Unknown subsystem";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";
        const openDependencies = taskDependencies.filter((edge) => edge.taskId === task.id && edge.kind === "task" && edge.dependencyType === "hard")
          .filter((edge) => taskById[edge.refId]?.status !== edge.requiredState)
          .map((edge) => taskById[edge.refId])
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
        } else if (task.isWaitingOnDependency) {
          actions.push({
            detail: `${subsystemName} - ${ownerName} - waiting on ${openDependencies.map((dependency) => dependency.title).join(", ") || "a milestone, part, or unavailable dependency"}`,
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
  }, [manufacturingItems, membersById, purchaseItems, subsystemsById, taskById, taskDependencies, tasks]);
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
      navCount: {
        backgroundColor: themeColors.canvas,
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
    [responsiveMetrics, themeColors],
  );
  const editTagStyle = [styles.editTag, appResponsiveStyles.editTag];
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

  const openTaskQueueFromTask = (task: Task) => {
    const nextSubteam = getTaskSubteamForDisciplineId(task.disciplineId, activeTaskSubteam);

    setActiveTaskSubteam(nextSubteam);
    taskQueue.resetFilters();
    setActiveTab("work-tasks");
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
                dueDate: shiftDateByDays(task.dueDate, dayDelta),
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

  const openCreateDeadlineEditor = () => {
    setDeadlineTitle("");
    setDeadlineDate(localTodayDate());
    setDeadlineError(null);
    setDeadlineEditorVisible(true);
  };

  const closeDeadlineEditor = () => {
    setDeadlineEditorVisible(false);
    setDeadlineTitle("");
    setDeadlineDate("");
    setDeadlineError(null);
  };

  const persistMilestone = async (id: string | null, payload: MilestonePayload) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await authenticatedRequestJson<MilestoneMutationResponse>(
        id ? `/api/milestones/${id}` : "/api/milestones",
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      await refreshWorkspaceFromServer(apiToken);
      setEvents((currentEvents) =>
        applyMilestoneSubsystemLinks(
          currentEvents,
          response.item,
          id,
          payload.relatedSubsystemIds,
        ),
      );
      setBackendStatus("connected");
      setBackendReachability("reachable");
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

  const milestoneEditor = useMilestoneEditor({
    subsystemsById,
    persist: persistMilestone,
    remove: (id) => runMutation(`/api/milestones/${id}`, { method: "DELETE" }),
  });

  const clearTaskBlockers = async (task: Task, resolutionNote: string) => {
    const trimmedNote = resolutionNote.trim();
    if (!trimmedNote) {
      return;
    }

    for (const blocker of taskBlockers.filter((candidate) => candidate.blockedTaskId === task.id && candidate.status === "open")) {
      const ok = await runMutation(`/api/task-blockers/${blocker.id}`, {
        method: "PATCH", body: JSON.stringify({ status: "resolved" }),
      });
      if (!ok) throw new Error("Blocker resolution failed. Refresh and retry.");
    }
    const saved = await runMutation(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({
      summary: `${task.summary.trim()}\n\nBlockers cleared ${isoToday()}: ${trimmedNote}`,
    }) });
    if (!saved) throw new Error("Blockers resolved, but the resolution note failed to save. Retry the note.");
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
    const currentTaskById = buildTaskById(taskState.getSnapshot());
    const currentTask = currentTaskById[task.id] ?? task;
    const status = getAutoTaskStatus(currentTask);
    const assignmentState = getTaskAssignmentState({
      canReassignTasks,
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
      body: JSON.stringify({ status }),
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

    if (
      !mentorId ||
      task.status !== "in-progress" ||
      task.blockers.length > 0 ||
      isTaskBlocked(task)
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
        mentorId,
        status: "waiting-for-qa",
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
    const participants = splitList(workLogDraft.participantIdsText);
    if (participants.some((id) => !membersById[id])) {
      setWorkLogError("Choose participants from the current roster."); return;
    }
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
      const localDraft = workLogQueue.getSnapshot().find(
        (draft) => draft.id === activeWorkLogId,
      );

      if (localDraft) {
        try {
          await workLogQueue.update((current) => enqueuePendingWorkLogDraft(
            removePendingWorkLogDraft(current, localDraft.id), payload, new Date(),
            { ownerKey: activeWorkLogDraftOwnerKey },
          ).drafts);
        } catch (error) { setWorkLogError(getClientErrorMessage(error)); return; }
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
      workLogQueue.getSnapshot().some(
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
      try {
        await workLogQueue.update((current) => enqueuePendingWorkLogDraft(current, payload, new Date(), { ownerKey: activeWorkLogDraftOwnerKey }).drafts);
        setSyncError("Work log saved locally. It will sync when the backend is reachable.");
      } catch (error) { setWorkLogError(getClientErrorMessage(error)); return; }
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
      try {
        await workLogQueue.update((current) => enqueuePendingWorkLogDraft(current, payload, new Date(), {
          ownerKey: activeWorkLogDraftOwnerKey, attemptCount: 1, error: message, status: "failed",
        }).drafts);
        setBackendStatus("offline");
        setBackendReachability(backendReachabilityAfterError(error));
        setSyncError(`Work log saved locally. ${message}`);
      } catch (storageError) { setWorkLogError(getClientErrorMessage(storageError)); return; }
      closeWorkLogEditor();
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteWorkLogDraft = async () => {
    if (!activeWorkLogId) {
      return;
    }

    const localDraft = workLogQueue.getSnapshot().find(
      (draft) => draft.id === activeWorkLogId,
    );

    if (localDraft) {
      await workLogQueue.update((current) => removePendingWorkLogDraft(current, localDraft.id));
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

  const manufacturingEditor = useManufacturingEditor({
    manufacturingView: manufacturingBrowse.filters.view, subsystems, members, signedInMember,
    canMentorApprove, mutate: runMutation,
  });

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

  const purchaseEditor = usePurchaseEditor({
    subsystems, members, signedInMember, manufacturingItems, purchaseItems,
    canMentorApprove, mutate: runMutation,
  });

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

  const memberEditor = useMemberEditor({ members, canMentorApprove, mutate: runMutation });
  const subsystemEditor = useSubsystemEditor({ members, mutate: runMutation });
  const partDefinitionEditor = usePartDefinitionEditor({
    members, subsystems, disciplines, partDefinitions,
    canCreateParts: ["lead", "mentor", "admin"].includes(sessionUser?.role ?? ""),
    mutate: runMutation,
  });

  const openCreateQaReportEditor = (taskId = tasks[0]?.id ?? "", qaRequestId?: string) => {
    if (!canSubmitQa) return;
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
    if (!canSubmitQa) { setQaReportError("Only leads, mentors, and admins can submit QA reports."); return; }
    const task = taskById[qaReportDraft.taskId];
    const participants = splitList(qaReportDraft.participantIdsText);
    if (participants.some((id) => !membersById[id])) {
      setQaReportError("Choose participants from the current roster."); return;
    }

    const missingFields = [
      !task ? "task" : null,
      participants.length === 0 ? "participants" : null,
      !qaReportDraft.notes.trim() ? "notes" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      setQaReportError(`Add ${missingFields.join(", ")} before saving this QA report.`);
      return;
    }

    if (task && qaReportDraft.result === "pass" && !isTaskReadyForQaPass(task)) {
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
    const sessionVersion = authSessionVersionRef.current;
    try {
      const { item } = await authenticatedRequestJson<{ item: NonNullable<PlatformBootstrapPayload["qaReports"]>[number] }>("/api/qa-reports/submit", {
        method: "POST", body: JSON.stringify({
          taskId: task.id, participantIds: participants,
          result: qaReportDraft.result, mentorApproved: qaReportDraft.mentorApproved,
          notes: qaReportDraft.notes.trim(), evidenceNotes: qaReportDraft.evidenceNotes.trim(),
          followUpTaskTitle: qaReportDraft.followUpTaskTitle.trim(),
          qaRequestId: linkedQaRequest?.id ?? null, reviewedAt: isoToday(),
        }),
      });
      if (authSessionVersionRef.current !== sessionVersion) return;
      setQaReviews((current) => [{ ...item, subjectTitle: task.title, subjectType: "task", subjectId: task.id },
        ...current.filter((review) => review.id !== item.id)]);
      closeQaReportEditor();
    } catch (error) {
      if (authSessionVersionRef.current !== sessionVersion) return;
      if (classifyMobileAuthError(error, "authenticated") === "expired-session") {
        endSessionForAuthFailure(getMobileAuthErrorMessage("expired-session")); return;
      }
      setQaReportError(getClientErrorMessage(error));
      return;
    }
    // The command is acknowledged: refresh errors must not invite a duplicate submission.
    try {
      const payload = await authenticatedRequestJson<PlatformBootstrapPayload>("/api/bootstrap");
      if (authSessionVersionRef.current === sessionVersion) applyBootstrapPayload(payload);
    } catch (error) {
      if (authSessionVersionRef.current === sessionVersion) setSyncError(getClientErrorMessage(error));
    }
  };

  const clearIdentityScopedState = () => {
    setMembers([]);
    setSubsystems([]);
    setDisciplines([]);
    setMechanisms([]);
    setTasks([]);
    setTaskDependencies([]);
    setTaskBlockers([]);
    setEvents([]);
    workLogsRef.current = [];
    setWorkLogs([]);
    workLogQueue.dispose();
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
    closeTaskEditor();
    closeWorkLogEditor();
    milestoneEditor.close();
    closeDeadlineEditor();
    manufacturingEditor.close();
    purchaseEditor.close();
    memberEditor.close();
    subsystemEditor.close();
    partDefinitionEditor.close();
    closeQaReportEditor();
    clearWorkLogTimer();
  };
  clearIdentityScopedStateRef.current = clearIdentityScopedState;

  const finishLocalSignOut = async (serverSignOutConfirmed: boolean) => {
    authSessionVersionRef.current += 1;
    mobileSessionRef.current = null;
    await authSessionCoordinatorRef.current.clear().catch(() => undefined);
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

  const taskScreenProps: TaskScreenProps = {
    queue: taskQueue,
    canSubmitQa,
    qaRequests,
    openCreateQaReportEditor,
    activeTaskSubteam,
    events,
    isLandscapeTimelineLayout,
    openCreateDeadlineEditor,
    openCreateTaskEditor,
    openEditTaskEditor,
    setActiveTaskSubteam,
    subsystems,
    taskView,
    themeColors,
    timelineTasks,
    activeTaskSubteamLabel,
    appResponsiveStyles,
    canReassignTasks,
    claimTask,
    clearTaskBlockers,
    disciplinesById,
    editTagStyle,
    eventsById,
    isCompactLayout,
    isLandscapeCardLayout,
    mechanismsById,
    members,
    membersById,
    openCreateWorkLogEditor,
    partInstancesById,
    requestHelp,
    requestTaskQa,
    reassignTask,
    releaseTask,
    rosterMentors,
    rosterStudents,
    signedInMember,
    startTask,
    subsystemsById,
    taskById,
    taskDependencies,
    taskLoggedHoursById,
    qaReviews,
    eventOptions,
    setTimelineMilestoneFilter,
    setTimelineSubsystemFilter,
    timelineMilestoneFilter,
    timelineSubsystemFilter,
    filteredMilestones,
    milestoneSearch,
    milestoneSortField,
    milestoneSortOrder,
    milestoneSummary,
    milestoneTypeFilter,
    openCreateMilestoneEditor: () => milestoneEditor.open(),
    openEditMilestoneEditor: milestoneEditor.open,
    setMilestoneSearch,
    setMilestoneSortField,
    setMilestoneSortOrder,
    setMilestoneTypeFilter,
  };

  const screenProps = {
    manufacturingBrowse,
    purchaseBrowse,
    materialsBrowse,
    partsBrowse,
    subsystemBrowse,
    appResponsiveStyles,
    attendancePreview,
    attendanceSummary,
    approvePurchaseItem,
    canMentorApprove,
    canSubmitQa,
    disciplinesById,
    editTagStyle,
    filteredWorkLogs,
    helpRequests,
    homeActionItems,
    homeTaskSummary,
    isLandscapeCardLayout,
    isSyncing,
    manufacturingItems,
    mechanismsById,
    meetingAttendance,
    members,
    membersById,
    createQaRequest,
    openCreateManufacturingEditor: () => manufacturingEditor.open(),
    openCreateMemberEditor: memberEditor.open,
    openCreatePartDefinitionEditor: partDefinitionEditor.open,
    openCreatePurchaseEditor: () => purchaseEditor.open(),
    openCreateQaReportEditor,
    openCreateSubsystemEditor: () => subsystemEditor.open(),
    openCreateWorkLogEditor,
    openWorkLogFromTimer,
    openEditManufacturingEditor: manufacturingEditor.open,
    openEditMemberEditor: memberEditor.edit,
    openEditPartDefinitionEditor: partDefinitionEditor.edit,
    openEditPurchaseEditor: purchaseEditor.open,
    openEditSubsystemEditor: subsystemEditor.open,
    openEditTaskEditor,
    openEditWorkLogEditor,
    openDuplicateTaskEditor,
    openMaterialRestockEditor: purchaseEditor.restock,
    openTaskQueueFromTask,
    partDefinitionsById,
    patchManufacturingItem,
    purchaseItems,
    qaRequests,
    qaReviews,
    riskRows,
    riskSummary,
    rosterAdmins,
    rosterExternal,
    rosterMentors,
    rosterStudents,
    selectedMemberId,
    setActiveTab,
    setAttendanceStatusByMemberId,
    setSelectedMemberId,
    setWorkLogSearch,
    setWorkLogSortMode,
    setWorkLogSubsystemFilter,
    shiftTaskDueDates,
    startWorkLogTimer,
    subsystems,
    subsystemsById,
    syncFromBackend,
    taskById,
    taskDependencies,
    transitionPurchaseItem,
    tasks,
    themeColors,
    workLogSearch,
    workLogs,
    workLogSortMode,
    workLogSubsystemFilter,
    workLogSummary,
    workLogTimer,
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

    return (
      <>
        <TaskEditorModal
          editor={taskEditor}
          appResponsiveStyles={appResponsiveStyles}
          disciplineOptions={disciplineOptions}
          disciplinesById={disciplinesById}
          eventOptions={eventOptions}
          eventsById={eventsById}
          isLandscapeCardLayout={isLandscapeCardLayout}
          mechanisms={mechanisms}
          mechanismsById={mechanismsById}
          memberOptions={memberOptions}
          partInstances={partInstances}
          partInstancesById={partInstancesById}
          partDefinitionsById={partDefinitionsById}
          subsystemsById={subsystemsById}
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
          editor={milestoneEditor}
        />

        <WorkLogEditorModal
          memberOptions={memberOptions}
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
          editor={manufacturingEditor}
          appResponsiveStyles={appResponsiveStyles}
          memberOptions={memberOptions}
          subsystemOptions={subsystemOptions}
          themeColors={themeColors}
        />

        <PurchaseEditorModal
          editor={purchaseEditor}
          appResponsiveStyles={appResponsiveStyles}
          memberOptions={memberOptions}
          subsystemOptions={subsystemOptions}
        />

        <PartDefinitionEditorModal
          editor={partDefinitionEditor}
          appResponsiveStyles={appResponsiveStyles}
        />

        <MemberEditorModal
          editor={memberEditor}
          appResponsiveStyles={appResponsiveStyles}
          disciplineOptions={disciplineOptions}
          themeColors={themeColors}
        />

        <SubsystemEditorModal
          editor={subsystemEditor}
          appResponsiveStyles={appResponsiveStyles}
          memberOptions={memberOptions}
        />

        <QaReportEditorModal
          canMentorApprove={canMentorApprove}
          memberOptions={memberOptions}
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
          hasRequestedEmailCode={hasRequestedEmailCode}
          height={height}
          isAuthenticating={isAuthenticating}
          isDarkModeEnabled={isDarkModeEnabled}
          isDevBypassAvailable={isDevBypassAvailable}
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
            activeTab={activeTab}
            activeTabContent={<ActiveTabContent activeTab={activeTab} screenProps={screenProps}
              taskContent={<TasksScreen {...taskScreenProps} />}
              scheduleView={scheduleView} onScheduleViewChange={setScheduleView} />}
            deviceSessions={deviceSessions}
            deviceSessionsError={deviceSessionsError}
            editorModals={renderEditorModals()}
            isDeviceSessionsVisible={isDeviceSessionsVisible}
            isLoadingDeviceSessions={isLoadingDeviceSessions}
            isPersonMenuVisible={isPersonMenuVisible}
            onCloseDeviceSessions={() => setIsDeviceSessionsVisible(false)}
            onClosePersonMenu={() => setIsPersonMenuVisible(false)}
            onOpenDeviceSessions={() => { void openDeviceSessions(); }}
            onOpenPersonMenu={() => setIsPersonMenuVisible(true)}
            onRefresh={() => { void syncFromBackend(); }}
            onRevokeAllDeviceSessions={() => { void revokeAllDeviceSessions(); }}
            onRevokeDeviceSession={(sessionId) => { void revokeDeviceSession(sessionId); }}
            onSelectTab={setActiveTab}
            onSignOut={signOut}
            onToggleTheme={() => { void updateThemePreference(themeMode === "dark" ? "light" : "dark", apiToken); }}
            personInitial={signedInEmailInitial}
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
