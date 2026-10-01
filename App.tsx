import { useSubsystemBrowse } from "./src/screens/robot/useSubsystemBrowse";
import { useMaterialsBrowse } from "./src/screens/inventory/useMaterialsBrowse";
import { usePartsBrowse } from "./src/screens/inventory/usePartsBrowse";
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
  ResponsibleGroupFilter,
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
import type {
  Artifact,
  Event,
  Meeting,
  Milestone,
  ManufacturingProcess,
  Member,
  Mechanism,
  Material,
  Project,
  PartDefinition,
  PartInstance,
  MobileDeviceSessionSummary,
  HelpRequest,
  PlatformBootstrapPayload,
  PublicAuthConfig,
  PurchaseItem,
  QaRequest,
  QaFinding,
  Report,
  Risk,
  RiskMutationPayload,
  ResponsibleGroup,
  MobileSessionResponse,
  SessionResponse,
  SessionUser,
  Subsystem,
  Task,
  TaskDependency,
  Workstream,
  WorkType,
  Vendor,
  WorkLog,
} from "./src/types/domain";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  RISK_PRIORITY_RANK,
  backendReachabilityAfterError,
  buildSubsystemOptions,
  buildTaskById,
  buildScheduleEntries,
  ensureArray,
  getClientErrorMessage,
  getEmailCodeVerificationErrorMessage,
  getWorkLogDraftOwnerKey,
  hasRequiredEmailDomain,
  isWorkLogDraftOwnedBy,
  mapPendingWorkLogDraftToWorkLog,
  normalizeRequiredEmailDomain,
  parseClientError,
  shouldQueueWorkLogDraftAfterError,
  type BackendReachability,
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
  const [scheduleView, setScheduleView] = useState<Exclude<TaskViewTab, "queue">>("milestones");
  const taskView: TaskViewTab = activeTab === "work-schedule" ? scheduleView : "queue";
  const [activeResponsibleGroupId, setActiveResponsibleGroupId] =
    useState<ResponsibleGroupFilter>("all");
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [responsibleGroups, setResponsibleGroups] = useState<ResponsibleGroup[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [taskState] = useState(() => createTaskState([]));
  const tasks = useSyncExternalStore(taskState.subscribe, taskState.getSnapshot);
  const setTasks = taskState.replace;
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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
  const [materials, setMaterials] = useState<Material[]>([]);
  const [manufacturingProcesses, setManufacturingProcesses] = useState<ManufacturingProcess[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [partDefinitions, setPartDefinitions] = useState<PartDefinition[]>([]);
  const [partInstances, setPartInstances] = useState<PartInstance[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const qaReports = useMemo(() => reports.filter((report): report is Extract<Report, { reportType: "qa" }> => report.reportType === "qa"), [reports]);
  const [qaFindings, setQaFindings] = useState<QaFinding[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
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
    const tasks = ensureArray(payload.tasks);
    const payloadWorkLogs = ensureArray(payload.workLogs);

    // Keep refs and state in lockstep for async callbacks that need the latest
    // workspace snapshot without retriggering every callback when data changes.
    setMembers(ensureArray(payload.members));
    setSubsystems(ensureArray(payload.subsystems));
    setProjects(ensureArray(payload.projects));
    setWorkTypes(ensureArray(payload.workTypes));
    setResponsibleGroups(ensureArray(payload.responsibleGroups));
    setWorkstreams(ensureArray(payload.workstreams));
    setVendors(ensureArray(payload.vendors));
    setMechanisms(ensureArray(payload.mechanisms));
    setTasks(tasks);
    setTaskDependencies(ensureArray(payload.taskDependencies));
    setEvents(events);
    setMeetings(ensureArray(payload.meetings));
    setMilestones(ensureArray(payload.milestones));
    workLogsRef.current = payloadWorkLogs;
    setWorkLogs(payloadWorkLogs);
    setMaterials(ensureArray(payload.materials));
    setManufacturingProcesses(ensureArray(payload.manufacturingProcesses));
    setPurchaseItems(ensureArray(payload.purchaseItems));
    setQaRequests(ensureArray(payload.qaRequests));
    setRisks(ensureArray(payload.risks));
    setReports(ensureArray(payload.reports));
    setQaFindings(ensureArray(payload.qaFindings));
    setArtifacts(ensureArray(payload.artifacts));
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

  const persistRisk = useCallback((id: string | null, payload: RiskMutationPayload) =>
    runMutation(id ? `/api/risks/${id}` : "/api/risks", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    }), [runMutation]);
  const deleteRisk = useCallback((id: string) =>
    runMutation(`/api/risks/${id}`, { method: "DELETE" }), [runMutation]);

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

  const workTypesById = useMemo(() => Object.fromEntries(workTypes.map((workType) => [workType.id, workType])) as Record<string, WorkType>, [workTypes]);
  const workstreamsById = useMemo(() => Object.fromEntries(workstreams.map((workstream) => [workstream.id, workstream])) as Record<string, Workstream>, [workstreams]);

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

  const scheduleEntries = useMemo(() => buildScheduleEntries(meetings, events, milestones), [events, meetings, milestones]);
  const eventsById = useMemo(() => {
    return Object.fromEntries(
      scheduleEntries.map((event) => [`${event.recordType}:${event.id}`, event]),
    ) as Record<string, (typeof scheduleEntries)[number]>;
  }, [scheduleEntries]);

  const taskById = useMemo(() => {
    return buildTaskById(tasks);
  }, [tasks]);
  const taskEditor = useTaskEditor({ mechanisms, partInstances, projects, tasks, taskById, taskDependencies, members, membersById, workTypes,
    subsystemsById, taskSubsystemOptions, activeResponsibleGroupId, setActiveResponsibleGroupId,
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
  const activeResponsibleGroupIdTasks = useMemo(() => activeResponsibleGroupId === "all"
    ? tasks : tasks.filter((task) => task.responsibleGroupId === activeResponsibleGroupId), [activeResponsibleGroupId, tasks]);
  const activeResponsibleGroupLabel =
    responsibleGroups.find((group) => group.id === activeResponsibleGroupId)?.name ?? "All groups";
  const taskLoggedHoursById = useMemo(() => {
    return workLogsForDisplay.reduce<Record<string, number>>((hoursByTaskId, workLog) => {
      hoursByTaskId[workLog.taskId] = (hoursByTaskId[workLog.taskId] ?? 0) + workLog.hours;
      return hoursByTaskId;
    }, {});
  }, [workLogsForDisplay]);

  const purchaseTaskIds = useMemo(() => new Set(purchaseItems.map((item) => item.taskId)), [purchaseItems]);
  const taskQueue = useTaskQueue({ tasks, taskLoggedHoursById, activeResponsibleGroupId, responsibleGroups, purchaseTaskIds,
    canMentorApprove, activePersonFilter, membersById, mechanismsById, subsystemsById });
  const { taskArchiveFilter } = taskQueue.filters;

  const filteredMilestones = useMemo(() => {
    const search = milestoneSearch.trim().toLowerCase();

    return [...scheduleEntries]
      .filter((event) =>
        milestoneTypeFilter === "all" ? true : event.type === milestoneTypeFilter,
      )
      .filter((event) => {
        if (!search) {
          return true;
        }

        const relatedProjectNames = event.projectIds
          .map((projectId) => projects.find((project) => project.id === projectId)?.name ?? "")
          .join(" ")
          .toLowerCase();

        return (
          event.title.toLowerCase().includes(search) ||
          event.description.toLowerCase().includes(search) ||
          relatedProjectNames.includes(search)
        );
      })
      .sort((left, right) => {
        const leftValue =
          milestoneSortField === "title"
            ? left.title.toLowerCase()
            : milestoneSortField === "type"
              ? left.type
              : left.startDateTime;
        const rightValue =
          milestoneSortField === "title"
            ? right.title.toLowerCase()
            : milestoneSortField === "type"
              ? right.type
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
    scheduleEntries,
    projects,
    milestoneSearch,
    milestoneSortField,
    milestoneSortOrder,
    milestoneTypeFilter,
  ]);

  const milestoneSummary = useMemo(() => {
    const externalCount = filteredMilestones.filter((entry) => entry.recordType === "event").length;

    return [
      { label: "Milestones", value: String(filteredMilestones.length) },
      { label: "External", value: String(externalCount) },
    ] satisfies SummaryChipData[];
  }, [filteredMilestones]);

  const eventOptions = useMemo(() => {
    return scheduleEntries.map((event) => ({
      id: event.id,
      name: `${event.title} (${formatDateTime(event.startDateTime)})`,
    }));
  }, [scheduleEntries]);

  const timelineTasks = useMemo(() => {
    return [...activeResponsibleGroupIdTasks]
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
        timelineMilestoneFilter === "all" ? true : task.scheduleRefs.some((ref) => ref.id === timelineMilestoneFilter),
      )
      .filter((task) => taskArchiveFilter === "all" || task.status !== "complete")
      .sort((left, right) =>
      left.dueDate.localeCompare(right.dueDate),
    );
  }, [activeResponsibleGroupIdTasks, activePersonFilter, taskArchiveFilter, timelineMilestoneFilter, timelineSubsystemFilter]);

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

  const vendorsById = useMemo(() => Object.fromEntries(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const purchaseBrowse = usePurchaseBrowse({ items: purchaseItems, tasksById: taskById, vendorsById });

  const materialsBrowse = useMaterialsBrowse({ materials, purchaseItems });
  const partsBrowse = usePartsBrowse({ partDefinitions, partInstances, tasks, partDefinitionsById, mechanismsById });

  const subsystemBrowse = useSubsystemBrowse({
    subsystems, mechanisms, tasks, purchaseItems, risks, qaFindings, membersById, taskById,
  });

  const riskRows = useMemo(() => risks.filter((risk) => risk.status !== "resolved")
    .map((risk) => ({ id: risk.id, title: risk.title, detail: risk.detail,
      subsystemId: risk.relatedTargets.find((target) => target.kind === "subsystem")?.id ?? "",
      source: risk.source.kind, priority: risk.severity }))
    .sort((left, right) => RISK_PRIORITY_RANK[left.priority] - RISK_PRIORITY_RANK[right.priority] || left.title.localeCompare(right.title)), [risks]);

  const riskSummary = useMemo(() => {
    const highCount = riskRows.filter((risk) => risk.priority === "high" || risk.priority === "critical").length;
    return [
      { label: "Unresolved risks", value: String(riskRows.length) },
      { label: "High", value: String(highCount) },
      { label: "Mitigating", value: String(risks.filter((risk) => risk.status === "mitigating").length) },
    ] satisfies SummaryChipData[];
  }, [riskRows, risks]);

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
        const subsystemName = subsystemsById[(task.subsystemIds[0] ?? "")]?.name ?? "FRC work";
        const ownerName = task.ownerId
          ? (membersById[task.ownerId]?.name ?? "Unassigned")
          : "Unassigned";
        const openDependencies = taskDependencies.filter((edge): edge is Extract<TaskDependency, { kind: "task" }> => edge.taskId === task.id && edge.kind === "task" && edge.dependencyType === "hard")
          .filter((edge) => taskById[edge.refId]?.status !== edge.requiredState)
          .map((edge) => taskById[edge.refId])
          .filter((dependency): dependency is Task => Boolean(dependency))
          .filter((dependency) => dependency.status !== "complete");
        const actions = [];

        if (task.isBlocked) {
          actions.push({
            detail: `${subsystemName} - ${ownerName} - unresolved risk or dependency`,
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

    const purchaseActions = purchaseItems
      .filter((item) => item.approvalStatus === "pending" || item.orderStatus === "not-ordered")
      .map((item) => ({
        detail: `${taskById[item.taskId]?.title ?? "Procurement work"} - Qty ${item.quantity} - ${item.approvalStatus}`,
        id: `purchase-${item.taskId}`,
        label: "Procurement work",
        onPressTargetId: item.taskId,
        priority: item.approvalStatus === "approved" ? "high" as const : "medium" as const,
        source: "purchase" as const,
        title: taskById[item.taskId]?.title ?? item.title,
      }));

    const priorityRank = { critical: 0, high: 1, medium: 2 };

    return [...taskActions, ...purchaseActions]
      .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])
      .slice(0, 8);
  }, [membersById, purchaseItems, subsystemsById, taskById, taskDependencies, tasks]);
  const homeTaskSummary = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== "complete");
    const blockedTasks = openTasks.filter((task) => task.isBlocked);
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
    setActiveResponsibleGroupId(task.responsibleGroupId ?? "all");
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
      await authenticatedRequestJson<unknown>(
        id ? `/api/milestones/${id}` : "/api/milestones",
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      await refreshWorkspaceFromServer(apiToken);
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
    persist: persistMilestone,
    remove: (id) => runMutation(`/api/milestones/${id}`, { method: "DELETE" }),
  });

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
          projectId: task.projectId,
          targetRefs: [{ kind: "task", id: task.id }],
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

  const purchaseEditor = usePurchaseEditor({
    tasks, materials, vendors, purchaseItems,
    canMentorApprove, mutate: runMutation,
  });

  const approvePurchaseItem = async (item: PurchaseItem, approved: boolean) => {
    await runMutation(`/api/purchases/${item.id}/approval`, {
      method: "PUT",
      body: JSON.stringify({ approved }),
    });
  };

  const transitionPurchaseItem = async (item: PurchaseItem, status: PurchaseItem["orderStatus"]) => {
    await runMutation(`/api/purchases/${item.id}/transition`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  };

  const memberEditor = useMemberEditor({ members, canMentorApprove, mutate: runMutation });
  const subsystemEditor = useSubsystemEditor({ members, mutate: runMutation });
  const partDefinitionEditor = usePartDefinitionEditor({
    partDefinitions,
    canCreateParts: ["lead", "mentor", "admin"].includes(sessionUser?.role ?? ""),
    mutate: runMutation,
  });

  const updatePartInstance = async (item: PartInstance, patch: Partial<Pick<PartInstance, "location">>) => {
    await runMutation(`/api/part-instances/${item.id}`, { method: "PATCH", body: JSON.stringify(patch) });
  };

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
        projectId: task?.projectId ?? projects[0]?.id ?? "",
        targetRefs: task ? [{ kind: "task", id: task.id }] : [],
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
      qaRequests.find((request) => request.targetRefs.some((target) => target.kind === "task" && target.id === task.id));
    const sessionVersion = authSessionVersionRef.current;
    try {
      const { item } = await authenticatedRequestJson<{ item: Extract<Report, { reportType: "qa" }> }>("/api/qa-reports/submit", {
        method: "POST", body: JSON.stringify({
          projectId: task.projectId,
          targetRefs: [{ kind: "task", id: task.id }],
          participantIds: participants,
          result: qaReportDraft.result,
          summary: qaReportDraft.notes.trim(),
          notes: qaReportDraft.notes.trim(),
          evidenceNotes: qaReportDraft.evidenceNotes.trim(),
          qaRequestId: linkedQaRequest?.id ?? null,
          createdByMemberId: signedInMember?.id ?? null,
          mentorId: linkedQaRequest?.mentorId ?? null,
          requestedById: linkedQaRequest?.requestedById ?? signedInMember?.id ?? null,
          status: "submitted",
          reviewedById: canMentorApprove ? signedInMember?.id ?? null : null,
          reviewedAt: canMentorApprove ? new Date().toISOString() : null,
        }),
      });
      if (authSessionVersionRef.current !== sessionVersion) return;
      setReports((current) => [item, ...current.filter((report) => report.id !== item.id)]);
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
    setProjects([]);
    setWorkTypes([]);
    setResponsibleGroups([]);
    setWorkstreams([]);
    setVendors([]);
    setMechanisms([]);
    setTasks([]);
    setTaskDependencies([]);
    setEvents([]);
    setMeetings([]);
    setMilestones([]);
    workLogsRef.current = [];
    setWorkLogs([]);
    workLogQueue.dispose();
    setMaterials([]);
    setManufacturingProcesses([]);
    setPurchaseItems([]);
    setPartDefinitions([]);
    setPartInstances([]);
    setRisks([]);
    setReports([]);
    setQaFindings([]);
    setArtifacts([]);
    setQaRequests([]);
    setHelpRequests([]);
    setActivePersonFilter("all");
    setSelectedMemberId(null);
    setIsPersonMenuVisible(false);
    closeTaskEditor();
    closeWorkLogEditor();
    milestoneEditor.close();
    closeDeadlineEditor();
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
    activeResponsibleGroupId,
    events: scheduleEntries,
    isLandscapeTimelineLayout,
    openCreateDeadlineEditor,
    openCreateTaskEditor,
    openEditTaskEditor,
    setActiveResponsibleGroupId,
    subsystems,
    taskView,
    themeColors,
    timelineTasks,
    activeResponsibleGroupLabel,
    responsibleGroups,
    workstreamsById,
    projects,
    appResponsiveStyles,
    canReassignTasks,
    claimTask,
    workTypesById,
    editTagStyle,
    eventsById,
    isCompactLayout,
    isLandscapeCardLayout,
    mechanismsById,
    members,
    membersById,
    openCreateWorkLogEditor,
    partInstancesById,
    partDefinitionsById,
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
    qaReports,
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
    openEditMilestoneEditor: (entry) => {
      const milestone = milestones.find((item) => item.id === entry.id);
      if (entry.recordType === "milestone" && milestone) milestoneEditor.open(milestone);
    },
    setMilestoneSearch,
    setMilestoneSortField,
    setMilestoneSortOrder,
    setMilestoneTypeFilter,
  };

  const screenProps = {
    artifacts,
    projectsById: Object.fromEntries(projects.map((project) => [project.id, project])),
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
    workTypesById,
    editTagStyle,
    filteredWorkLogs,
    helpRequests,
    homeActionItems,
    homeTaskSummary,
    isLandscapeCardLayout,
    isSyncing,
    mechanismsById,
    meetingAttendance,
    members,
    membersById,
    createQaRequest,
    openCreateMemberEditor: memberEditor.open,
    openCreatePartDefinitionEditor: partDefinitionEditor.open,
    openCreatePurchaseEditor: () => purchaseEditor.open(),
    openCreateQaReportEditor,
    openCreateSubsystemEditor: () => subsystemEditor.open(),
    openCreateWorkLogEditor,
    openWorkLogFromTimer,
    projects,
    openEditMemberEditor: memberEditor.edit,
    openEditPartDefinitionEditor: partDefinitionEditor.edit,
    updatePartInstance,
    openEditPurchaseEditor: purchaseEditor.open,
    openEditSubsystemEditor: subsystemEditor.open,
    openEditTaskEditor,
    openEditWorkLogEditor,
    openDuplicateTaskEditor,
    openMaterialRestockEditor: purchaseEditor.restock,
    openTaskQueueFromTask,
    partDefinitionsById,
    purchaseItems,
    responsibleGroups,
    qaRequests,
    qaReports,
    riskRows,
    risks,
    riskSummary,
    saveRisk: persistRisk,
    deleteRisk,
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
    const selectedProjectType = projects.find((project) => project.id === taskEditor.taskDraft.projectId)?.projectType;
    const workTypeOptions = workTypes.filter((workType) => workType.projectType === selectedProjectType).map((workType) => ({
      id: workType.id,
      name: workType.name,
    }));
    const projectOptions = projects.map((project) => ({ id: project.id, name: project.name }));
    const projectsById = Object.fromEntries(projects.map((project) => [project.id, project]));
    const responsibleGroupOptions = responsibleGroups.filter((group) => !group.projectIds.length || group.projectIds.includes(taskEditor.taskDraft.projectId)).map((group) => ({ id: group.id, name: group.name }));
    const workstreamOptions = workstreams.filter((workstream) => workstream.projectId === taskEditor.taskDraft.projectId && !workstream.isArchived).map((workstream) => ({ id: workstream.id, name: workstream.name }));
    const scheduleOptions = scheduleEntries.map((entry) => ({ id: `${entry.recordType}:${entry.id}`, name: `${entry.title} (${formatDateTime(entry.startDateTime)})` }));
    const scheduleNamesByRef = Object.fromEntries(scheduleEntries.map((entry) => [`${entry.recordType}:${entry.id}`, entry.title]));

    return (
      <>
        <TaskEditorModal
          editor={taskEditor}
          appResponsiveStyles={appResponsiveStyles}
          projectOptions={projectOptions}
          projectsById={projectsById}
          workTypeOptions={workTypeOptions}
          workTypesById={workTypesById}
          responsibleGroupOptions={responsibleGroupOptions}
          workstreamOptions={workstreamOptions}
          scheduleOptions={scheduleOptions}
          scheduleNamesByRef={scheduleNamesByRef}
          manufacturingProcesses={manufacturingProcesses}
          materials={materials}
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

        <PurchaseEditorModal
          editor={purchaseEditor}
          appResponsiveStyles={appResponsiveStyles}
        />

        <PartDefinitionEditorModal
          editor={partDefinitionEditor}
          appResponsiveStyles={appResponsiveStyles}
        />

        <MemberEditorModal
          editor={memberEditor}
          appResponsiveStyles={appResponsiveStyles}
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
