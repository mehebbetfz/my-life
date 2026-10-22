import * as Notifications from 'expo-notifications';
import type { Credit } from '../types';
import { cancelNotification, ensureNotificationPermission } from './notifications';
import { formatMoney } from './storage';

export function parseRemindAt(remindAt: string): { hour: number; minute: number } {
  const [h, m] = (remindAt || '09:00').split(':').map(Number);
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

/** Ближайшая дата платежа (день месяца dueDay) */
export function nextCreditDueDate(credit: Credit, from = new Date()): Date {
  const dueDay = Math.min(28, Math.max(1, credit.dueDay || 1));
  const { hour, minute } = parseRemindAt(credit.remindAt);
  const y = from.getFullYear();
  const m = from.getMonth();
  let due = new Date(y, m, dueDay, hour, minute, 0, 0);
  /** если день уже прошёл сегодня после времени — следующий месяц */
  if (due.getTime() < from.getTime()) {
    due = new Date(y, m + 1, dueDay, hour, minute, 0, 0);
  }
  return due;
}

export function daysUntilDue(credit: Credit, from = new Date()): number {
  const due = nextCreditDueDate(credit, from);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Показывать красный баннер: платёж сегодня или в ближайшие 5 дней */
export function isCreditUrgent(credit: Credit, from = new Date()): boolean {
  if (!credit.enabled) return false;
  const d = daysUntilDue(credit, from);
  return d >= 0 && d <= 5;
}

export function creditBannerLine(
  credit: Credit,
  baseCurrency: string,
): string {
  const days = daysUntilDue(credit);
  const when =
    days === 0
      ? 'сегодня'
      : days === 1
        ? 'завтра'
        : `через ${days} дн.`;
  const due = nextCreditDueDate(credit);
  const dateStr = due.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
  const amount = formatMoney(
    credit.paymentAmount,
    credit.currency || baseCurrency,
  );
  return `${credit.title}: ${amount} · ${when} (${dateStr})`;
}

export async function cancelCreditNotifications(
  credit: Credit,
): Promise<void> {
  for (const id of credit.notificationIds ?? []) {
    await cancelNotification(id);
  }
  if (credit.notificationId) {
    await cancelNotification(credit.notificationId);
  }
}

export async function scheduleCreditReminder(
  credit: Credit,
): Promise<string[]> {
  await cancelCreditNotifications(credit);
  if (!credit.enabled) return [];
  const ok = await ensureNotificationPermission();
  if (!ok) return [];

  const dueDay = Math.min(28, Math.max(1, credit.dueDay || 1));
  const { hour, minute } = parseRemindAt(credit.remindAt);
  const amount = formatMoney(credit.paymentAmount, credit.currency);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Платёж по кредиту',
      body: `${credit.title}: ${amount}`,
      sound: true,
      data: { type: 'credit', creditId: credit.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: dueDay,
      hour,
      minute,
    },
  });
  return [id];
}
