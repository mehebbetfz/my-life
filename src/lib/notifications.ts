import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppData, CalendarEvent, Habit, Task } from '../types';
import { parseLocalDateTime, todayIso } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice && Platform.OS === 'ios') {
    // Simulator often still allows local notifications
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionAsked && !current.canAskAgain) return false;
  permissionAsked = true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelNotification(id?: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore missing ids
  }
}

async function scheduleAt(
  date: Date,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string | null> {
  if (date.getTime() <= Date.now() + 1500) return null;
  const ok = await ensureNotificationPermission();
  if (!ok) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: data ?? {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

export async function scheduleTaskReminder(task: Task): Promise<string | null> {
  await cancelNotification(task.notificationId);
  if (task.done || !task.remindAt) return null;
  const when = new Date(task.remindAt);
  return scheduleAt(when, 'Задача', task.title, { type: 'task', id: task.id });
}

export async function scheduleEventReminder(
  event: CalendarEvent,
): Promise<string | null> {
  await cancelNotification(event.notificationId);
  if (event.remindMinutesBefore == null) return null;
  const start = parseLocalDateTime(
    event.date,
    event.allDay ? '09:00' : event.startTime ?? '09:00',
  );
  const when = new Date(
    start.getTime() - event.remindMinutesBefore * 60_000,
  );
  const timeLabel = event.allDay
    ? 'весь день'
    : event.startTime ?? '';
  return scheduleAt(
    when,
    'Событие',
    `${event.title}${timeLabel ? ` · ${timeLabel}` : ''}`,
    { type: 'event', id: event.id },
  );
}

export async function scheduleHabitReminder(
  habit: Habit,
): Promise<string | null> {
  if (!habit.remindAt) return null;
  const ok = await ensureNotificationPermission();
  if (!ok) return null;
  const [hour, minute] = habit.remindAt.split(':').map(Number);
  // cancel previous by identifier pattern
  await cancelNotification(`habit-${habit.id}`);
  return Notifications.scheduleNotificationAsync({
    identifier: `habit-${habit.id}`,
    content: {
      title: 'Привычка',
      body: habit.title,
      sound: true,
      data: { type: 'habit', id: habit.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleDailyBriefing(
  time: string,
  enabled: boolean,
): Promise<void> {
  await cancelNotification('daily-briefing');
  if (!enabled) return;
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-briefing',
    content: {
      title: 'My Life',
      body: 'План на сегодня: задачи, события и привычки',
      sound: true,
      data: { type: 'briefing' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Re-sync all scheduled notifications from app data */
export async function resyncAllNotifications(data: AppData): Promise<AppData> {
  if (!data.settings.enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return data;
  }

  const tasks: Task[] = [];
  for (const task of data.tasks) {
    if (!data.settings.taskReminders || task.done || !task.remindAt) {
      await cancelNotification(task.notificationId);
      tasks.push({ ...task, notificationId: undefined });
      continue;
    }
    const notificationId = await scheduleTaskReminder({
      ...task,
      notificationId: undefined,
    });
    tasks.push({ ...task, notificationId: notificationId ?? undefined });
  }

  const events: CalendarEvent[] = [];
  for (const event of data.events) {
    if (!data.settings.eventReminders || event.remindMinutesBefore == null) {
      await cancelNotification(event.notificationId);
      events.push({ ...event, notificationId: undefined });
      continue;
    }
    // skip past days without time sensitivity for all-day past
    if (event.date < todayIso() && !event.startTime) {
      events.push({ ...event, notificationId: undefined });
      continue;
    }
    const notificationId = await scheduleEventReminder({
      ...event,
      notificationId: undefined,
    });
    events.push({ ...event, notificationId: notificationId ?? undefined });
  }

  if (data.settings.habitReminders) {
    for (const habit of data.habits) {
      if (habit.remindAt) await scheduleHabitReminder(habit);
    }
  }

  const { scheduleCreditReminder } = await import('./credits');
  const credits = [];
  for (const credit of data.credits ?? []) {
    const notificationIds = await scheduleCreditReminder({
      ...credit,
      notificationIds: [],
      notificationId: undefined,
    });
    credits.push({ ...credit, notificationIds, notificationId: undefined });
  }

  await scheduleDailyBriefing(
    data.settings.dailyBriefingAt,
    data.settings.enabled,
  );

  return { ...data, tasks, events, credits };
}
