import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WORK_LOG_TIMER_CHANNEL_ID = "work-log-timer";
const WORK_LOG_TIMER_REMINDER_KIND = "work-log-timer-reminder";
const WORK_LOG_TIMER_REMINDER_MINUTES = [30, 60, 90];
const WORK_LOG_TIMER_STORAGE_KEY = "meco.active-work-log-timer";

export type PersistedWorkLogTimerReminder = {
  elapsedMs: number;
  id: string;
  isPaused?: boolean;
  reminderNotificationIds: string[];
  startedAt: number | null;
};

function allowsNotificationDelivery(
  permissions: Notifications.NotificationPermissionsStatus,
) {
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function isWorkLogTimerReminder(
  notification: Notifications.NotificationRequest,
) {
  return notification.content.data?.kind === WORK_LOG_TIMER_REMINDER_KIND;
}

async function getScheduledWorkLogTimerReminderIds() {
  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();

  return scheduledNotifications
    .filter(isWorkLogTimerReminder)
    .map((notification) => notification.identifier);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureNotificationSetup() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(WORK_LOG_TIMER_CHANNEL_ID, {
      name: "Work timer reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();

  if (allowsNotificationDelivery(currentPermissions)) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();

  return allowsNotificationDelivery(requestedPermissions);
}

export async function cancelWorkLogTimerReminders(notificationIds: string[] = []) {
  const idsToCancel =
    notificationIds.length > 0
      ? notificationIds
      : await getScheduledWorkLogTimerReminderIds();

  await Promise.all(
    idsToCancel.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId),
    ),
  );
}

export async function schedulePersistedWorkLogTimerReminders(
  timer: PersistedWorkLogTimerReminder,
) {
  const canNotify = await ensureNotificationSetup();

  if (!canNotify) {
    return [];
  }

  const scheduledIds: string[] = [];

  for (const minutes of WORK_LOG_TIMER_REMINDER_MINUTES) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Work timer still running",
        body: `${minutes} minutes logged. Pause when you are ready to turn this into a work log.`,
        data: {
          elapsedMs: timer.elapsedMs,
          kind: WORK_LOG_TIMER_REMINDER_KIND,
          minutes,
          startedAt: timer.startedAt,
          timerId: timer.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60,
        channelId: WORK_LOG_TIMER_CHANNEL_ID,
      },
    });
    scheduledIds.push(notificationId);
  }

  return scheduledIds;
}

function numberFromNotificationData(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringFromNotificationData(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function persistedTimerFromUnknown(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const timer = value as Record<string, unknown>;
  const id = stringFromNotificationData(timer.id);
  const isPaused = timer.isPaused === true;
  const startedAt = numberFromNotificationData(timer.startedAt);

  if (!id || (!isPaused && startedAt === null)) {
    return null;
  }

  const reminderNotificationIds = Array.isArray(timer.reminderNotificationIds)
    ? timer.reminderNotificationIds.filter(
        (notificationId): notificationId is string =>
          typeof notificationId === "string" && notificationId.length > 0,
      )
    : [];

  return {
    elapsedMs: numberFromNotificationData(timer.elapsedMs) ?? 0,
    id,
    isPaused,
    reminderNotificationIds,
    startedAt: isPaused ? null : startedAt,
  };
}

async function readPersistedWorkLogTimerState() {
  const rawTimer = await AsyncStorage.getItem(WORK_LOG_TIMER_STORAGE_KEY);

  if (!rawTimer) {
    return null;
  }

  try {
    const persistedTimer = persistedTimerFromUnknown(JSON.parse(rawTimer));

    if (persistedTimer) {
      return persistedTimer;
    }
  } catch {
    // Invalid persisted timer payloads should not keep blocking cleanup.
  }

  await AsyncStorage.removeItem(WORK_LOG_TIMER_STORAGE_KEY);
  return null;
}

export async function persistWorkLogTimerState(
  timer: PersistedWorkLogTimerReminder,
) {
  await AsyncStorage.setItem(WORK_LOG_TIMER_STORAGE_KEY, JSON.stringify(timer));
}

export async function clearPersistedWorkLogTimerState() {
  await AsyncStorage.removeItem(WORK_LOG_TIMER_STORAGE_KEY);
}

export async function restorePersistedWorkLogTimerReminder(): Promise<PersistedWorkLogTimerReminder | null> {
  const [storedTimer, scheduledNotifications] = await Promise.all([
    readPersistedWorkLogTimerState(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const timerReminders = scheduledNotifications.filter(isWorkLogTimerReminder);

  if (storedTimer) {
    // AsyncStorage is authoritative, but scheduled notification ids can change
    // after app restarts, so rebuild the id list from Expo Notifications.
    return {
      ...storedTimer,
      reminderNotificationIds: timerReminders
        .filter(
          (notification) =>
            notification.content.data?.timerId === storedTimer.id,
        )
        .map((notification) => notification.identifier),
    };
  }

  const timerId = stringFromNotificationData(
    timerReminders[0]?.content.data?.timerId,
  );
  const startedAt = numberFromNotificationData(
    timerReminders[0]?.content.data?.startedAt,
  );

  if (!timerId || startedAt === null) {
    return null;
  }

  // If AsyncStorage was cleared while reminders remained scheduled, rebuild the
  // active timer from notification metadata so the user can still stop it.
  const reminderNotificationIds = timerReminders
    .filter((notification) => notification.content.data?.timerId === timerId)
    .map((notification) => notification.identifier);

  const restoredTimer = {
    elapsedMs:
      numberFromNotificationData(timerReminders[0]?.content.data?.elapsedMs) ?? 0,
    id: timerId,
    reminderNotificationIds,
    startedAt,
  };

  await persistWorkLogTimerState(restoredTimer);
  return restoredTimer;
}
