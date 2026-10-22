import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_BASE_CURRENCY,
  FALLBACK_USD_RATES,
  formatMoneyAmount,
} from './currency';
import { normalizeGoal } from './goals';
import { normalizeHabit } from './habits';
import {
  DEFAULT_BUDGET_PLAN,
  DEFAULT_ENVELOPES,
  DEFAULT_SETTINGS,
  type AppData,
  type Expense,
  type Goal,
  type Habit,
  type Income,
  type Task,
} from '../types';
import { normalizeBudgetPlan, normalizeEnvelopes } from './finance';

const KEY = '@my-life/data/v1';

function normalizeMoneyEntry<T extends Partial<Expense | Income>>(
  item: T,
  baseCurrency: string,
): T & { currency: string; originalAmount: number; amount: number } {
  const currency = item.currency ?? baseCurrency;
  const originalAmount =
    typeof item.originalAmount === 'number'
      ? item.originalAmount
      : Math.abs(item.amount ?? 0);
  const amount = Math.abs(item.amount ?? 0);
  return { ...item, currency, originalAmount, amount };
}

export const emptyData = (): AppData => ({
  goals: [],
  habits: [],
  tasks: [],
  expenses: [],
  incomes: [],
  envelopes: DEFAULT_ENVELOPES.map((c) => ({ ...c })),
  budgetPlan: { ...DEFAULT_BUDGET_PLAN },
  plannedPurchases: [],
  credits: [],
  books: [],
  gymExercises: [],
  gymLogs: [],
  baseCurrency: DEFAULT_BASE_CURRENCY,
  fxRates: { ...FALLBACK_USD_RATES },
  events: [],
  alarms: [],
  settings: { ...DEFAULT_SETTINGS },
});

function normalizeTask(t: Partial<Task> & { title: string; id: string }): Task {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    areaId: t.areaId,
    priority: t.priority ?? 'medium',
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    remindAt: t.remindAt,
    notificationId: t.notificationId,
    done: Boolean(t.done),
    createdAt: t.createdAt ?? new Date().toISOString(),
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const baseCurrency = parsed.baseCurrency ?? DEFAULT_BASE_CURRENCY;
    const envelopes = normalizeEnvelopes(parsed.envelopes);
    return {
      goals: (parsed.goals ?? []).map((g) =>
        normalizeGoal(g as Goal),
      ),
      habits: (parsed.habits ?? []).map((h) =>
        normalizeHabit(h as Habit),
      ),
      tasks: (parsed.tasks ?? []).map((t) => normalizeTask(t as Task)),
      expenses: (parsed.expenses ?? []).map((e) =>
        normalizeMoneyEntry(e as Expense, baseCurrency),
      ) as Expense[],
      incomes: (parsed.incomes ?? []).map((i) =>
        normalizeMoneyEntry(i as Income, baseCurrency),
      ) as Income[],
      envelopes,
      budgetPlan: normalizeBudgetPlan(parsed.budgetPlan, envelopes),
      plannedPurchases: (parsed.plannedPurchases ?? []).map((p) => ({
        ...p,
        savedAmount: Math.max(0, p.savedAmount ?? 0),
        targetAmount: Math.max(0, p.targetAmount ?? 0),
        originalTarget: p.originalTarget ?? p.targetAmount ?? 0,
        currency: p.currency ?? baseCurrency,
        bought: Boolean(p.bought),
      })),
      credits: (parsed.credits ?? []).map((c) => ({
        id: c.id,
        title: c.title ?? 'Кредит',
        paymentAmount: Math.max(0, Number(c.paymentAmount) || 0),
        currency: c.currency ?? baseCurrency,
        originalPayment:
          c.originalPayment ?? Math.max(0, Number(c.paymentAmount) || 0),
        dueDay: Math.min(28, Math.max(1, Number(c.dueDay) || 1)),
        remindAt: c.remindAt || '09:00',
        remainingDebt:
          c.remainingDebt != null
            ? Math.max(0, Number(c.remainingDebt) || 0)
            : undefined,
        note: c.note,
        enabled: c.enabled !== false,
        notificationId: c.notificationId,
        notificationIds: c.notificationIds ?? [],
        createdAt: c.createdAt ?? new Date().toISOString(),
      })),
      books: (parsed.books ?? []).map((b) => ({
        ...b,
        title: b.title ?? '',
        done: Boolean(b.done),
        createdAt: b.createdAt ?? new Date().toISOString(),
      })),
      gymExercises: parsed.gymExercises ?? [],
      gymLogs: (parsed.gymLogs ?? []).map((l) => ({
        ...l,
        sets: (l.sets ?? []).map((s) => ({
          reps: Math.max(0, Number(s.reps) || 0),
          weight: Math.max(0, Number(s.weight) || 0),
        })),
      })),
      baseCurrency,
      fxRates: { ...FALLBACK_USD_RATES, ...(parsed.fxRates ?? {}) },
      fxUpdatedAt: parsed.fxUpdatedAt,
      events: parsed.events ?? [],
      alarms: parsed.alarms ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return emptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseLocalDateTime(date: string, time?: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time ?? '09:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function formatMoney(
  amount: number,
  currency: string = DEFAULT_BASE_CURRENCY,
): string {
  return formatMoneyAmount(amount, currency);
}

export function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}
