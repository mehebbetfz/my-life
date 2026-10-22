import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  cancelAlarmNotifications,
  ensureAlarmChannel,
  rescheduleAllAlarms,
  scheduleAlarm,
} from '../lib/alarms';
import {
  cancelCreditNotifications,
  scheduleCreditReminder,
} from '../lib/credits';
import {
  cancelNotification,
  ensureNotificationPermission,
  resyncAllNotifications,
  scheduleEventReminder,
  scheduleHabitReminder,
  scheduleTaskReminder,
  scheduleDailyBriefing,
} from '../lib/notifications';
import {
  convertAmount,
  DEFAULT_BASE_CURRENCY,
  fetchUsdRates,
  type CurrencyCode,
} from '../lib/currency';
import { clampProgress, stagesAllDone } from '../lib/goals';
import { emptyData, loadData, newId, saveData, todayIso } from '../lib/storage';
import { DEFAULT_GYM_EXERCISES } from '../types';
import type {
  Alarm,
  AppData,
  BudgetPlan,
  CalendarEvent,
  Expense,
  ExpenseCategory,
  ExpenseCategoryId,
  Goal,
  Habit,
  Income,
  LifeAreaId,
  NotificationSettings,
  Book,
  Credit,
  GymExercise,
  GymLog,
  GymMuscleId,
  GymSet,
  PlannedPurchase,
  Priority,
  Task,
  Weekday,
  AlarmSoundId,
} from '../types';

type AddTaskInput = {
  title: string;
  notes?: string;
  areaId?: LifeAreaId;
  priority?: Priority;
  dueDate?: string;
  dueTime?: string;
  remindAt?: string;
};

type AddExpenseInput = {
  title: string;
  amount: number;
  currency?: string;
  categoryId: ExpenseCategoryId;
  date?: string;
  note?: string;
};

type AddIncomeInput = {
  title: string;
  amount: number;
  currency?: string;
  date?: string;
  note?: string;
};

type AddEventInput = {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  notes?: string;
  areaId?: LifeAreaId;
  remindMinutesBefore?: number;
};

type DataContextValue = {
  ready: boolean;
  data: AppData;
  requestNotifications: () => Promise<boolean>;
  addTask: (input: AddTaskInput) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  addGoal: (title: string, areaId: LifeAreaId, targetDate?: string) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  addGoalStage: (goalId: string, title: string) => void;
  updateGoalStage: (
    goalId: string,
    stageId: string,
    patch: { title?: string; progress?: number },
  ) => void;
  removeGoalStage: (goalId: string, stageId: string) => void;
  addHabit: (title: string, areaId: LifeAreaId, remindAt?: string) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  toggleHabitToday: (id: string) => void;
  markHabitMiss: (id: string, date: string, reason: string) => void;
  clearHabitMiss: (id: string, date: string) => void;
  removeHabit: (id: string) => Promise<void>;
  addExpense: (input: AddExpenseInput) => void;
  removeExpense: (id: string) => void;
  addIncome: (input: AddIncomeInput) => void;
  removeIncome: (id: string) => void;
  updateBudgetPlan: (plan: BudgetPlan) => void;
  setBaseCurrency: (code: CurrencyCode) => void;
  refreshFxRates: () => Promise<boolean>;
  addEnvelope: (input: {
    title: string;
    color: string;
    icon?: string;
    percent?: number;
  }) => void;
  updateEnvelope: (
    id: string,
    patch: { title?: string; color?: string; icon?: string },
  ) => void;
  removeEnvelope: (id: string, moveToId?: string) => void;
  addPlannedPurchase: (input: {
    title: string;
    amount: number;
    currency?: string;
    note?: string;
  }) => void;
  updatePlannedPurchase: (
    id: string,
    patch: Partial<Pick<PlannedPurchase, 'title' | 'note' | 'bought'>>,
  ) => void;
  contributeToPurchase: (
    id: string,
    amount: number,
    currency?: string,
  ) => void;
  markPurchaseBought: (id: string, asExpense?: boolean) => void;
  removePlannedPurchase: (id: string) => void;
  addCredit: (input: {
    title: string;
    paymentAmount: number;
    currency?: string;
    dueDay: number;
    remindAt: string;
    remainingDebt?: number;
    note?: string;
  }) => Promise<void>;
  updateCredit: (id: string, patch: Partial<Credit>) => Promise<void>;
  removeCredit: (id: string) => Promise<void>;
  addBook: (input: { title: string; author?: string; note?: string }) => void;
  toggleBook: (id: string) => void;
  removeBook: (id: string) => void;
  addGymExercise: (input: { title: string; muscle: GymMuscleId }) => void;
  removeGymExercise: (id: string) => void;
  addGymLog: (input: {
    exerciseId: string;
    date?: string;
    sets: GymSet[];
    note?: string;
  }) => void;
  removeGymLog: (id: string) => void;
  seedDefaultGymExercises: () => void;
  addEvent: (input: AddEventInput) => Promise<void>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<NotificationSettings>) => Promise<void>;
  addAlarm: (input: {
    label?: string;
    time: string;
    days?: Weekday[];
    soundId?: AlarmSoundId;
    customSoundUri?: string;
    customSoundName?: string;
    vibrate?: boolean;
    playInSilent?: boolean;
    gradualVolume?: boolean;
    volume?: number;
    snoozeMinutes?: 5 | 10 | 15 | 20;
  }) => Promise<void>;
  updateAlarm: (id: string, patch: Partial<Alarm>) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
  removeAlarm: (id: string) => Promise<void>;
  getAlarm: (id: string) => Alarm | undefined;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(emptyData);
  const dataRef = useRef(data);
  dataRef.current = data;

  const persist = useCallback(async (next: AppData) => {
    dataRef.current = next;
    setData(next);
    await saveData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadData();
      if (cancelled) return;
      try {
        await ensureAlarmChannel();
        let synced = await resyncAllNotifications(loaded);
        const alarms = await rescheduleAllAlarms(synced.alarms ?? []);
        synced = { ...synced, alarms };
        await persist(synced);
      } catch {
        await persist({ ...loaded, alarms: loaded.alarms ?? [] });
      }
      if (!cancelled) setReady(true);
      void fetchUsdRates()
        .then((fx) => {
          if (cancelled) return;
          const current = dataRef.current;
          void persist({
            ...current,
            fxRates: fx.rates,
            fxUpdatedAt: fx.updatedAt,
          });
        })
        .catch(() => {
          /* offline — fallback rates */
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  const requestNotifications = useCallback(async () => {
    return ensureNotificationPermission();
  }, []);

  const addTask = useCallback(
    async (input: AddTaskInput) => {
      const current = dataRef.current;
      let task: Task = {
        id: newId(),
        title: input.title.trim(),
        notes: input.notes?.trim() || undefined,
        areaId: input.areaId,
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate ?? todayIso(),
        dueTime: input.dueTime,
        remindAt: input.remindAt,
        done: false,
        createdAt: new Date().toISOString(),
      };
      if (current.settings.enabled && current.settings.taskReminders && task.remindAt) {
        const notificationId = await scheduleTaskReminder(task);
        task = { ...task, notificationId: notificationId ?? undefined };
      }
      await persist({ ...current, tasks: [task, ...current.tasks] });
    },
    [persist],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      const current = dataRef.current;
      const tasks = await Promise.all(
        current.tasks.map(async (t) => {
          if (t.id !== id) return t;
          let next = { ...t, ...patch, id: t.id };
          if (
            current.settings.enabled &&
            current.settings.taskReminders &&
            next.remindAt &&
            !next.done
          ) {
            const notificationId = await scheduleTaskReminder(next);
            next = { ...next, notificationId: notificationId ?? undefined };
          } else {
            await cancelNotification(t.notificationId);
            next = { ...next, notificationId: undefined };
          }
          return next;
        }),
      );
      await persist({ ...current, tasks });
    },
    [persist],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      const tasks = await Promise.all(
        current.tasks.map(async (t) => {
          if (t.id !== id) return t;
          const done = !t.done;
          if (done) await cancelNotification(t.notificationId);
          return {
            ...t,
            done,
            notificationId: done ? undefined : t.notificationId,
          };
        }),
      );
      await persist({ ...current, tasks });
    },
    [persist],
  );

  const removeTask = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      const task = current.tasks.find((t) => t.id === id);
      await cancelNotification(task?.notificationId);
      await persist({
        ...current,
        tasks: current.tasks.filter((t) => t.id !== id),
      });
    },
    [persist],
  );

  const addGoal = useCallback(
    (title: string, areaId: LifeAreaId, targetDate?: string) => {
      const current = dataRef.current;
      const goal: Goal = {
        id: newId(),
        title: title.trim(),
        areaId,
        targetDate,
        stages: [],
        done: false,
        createdAt: new Date().toISOString(),
      };
      void persist({ ...current, goals: [goal, ...current.goals] });
    },
    [persist],
  );

  const toggleGoal = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        goals: current.goals.map((g) => {
          if (g.id !== id) return g;
          const done = !g.done;
          const stages = (g.stages ?? []).map((s) => ({
            ...s,
            progress: done ? 100 : 0,
          }));
          return { ...g, done, stages };
        }),
      });
    },
    [persist],
  );

  const removeGoal = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        goals: current.goals.filter((g) => g.id !== id),
      });
    },
    [persist],
  );

  const addGoalStage = useCallback(
    (goalId: string, title: string) => {
      const name = title.trim();
      if (!name) return;
      const current = dataRef.current;
      void persist({
        ...current,
        goals: current.goals.map((g) => {
          if (g.id !== goalId) return g;
          const stages = [
            ...(g.stages ?? []),
            { id: newId(), title: name, progress: 0 },
          ];
          return { ...g, stages, done: stagesAllDone(stages) };
        }),
      });
    },
    [persist],
  );

  const updateGoalStage = useCallback(
    (
      goalId: string,
      stageId: string,
      patch: { title?: string; progress?: number },
    ) => {
      const current = dataRef.current;
      void persist({
        ...current,
        goals: current.goals.map((g) => {
          if (g.id !== goalId) return g;
          const stages = (g.stages ?? []).map((s) => {
            if (s.id !== stageId) return s;
            return {
              ...s,
              title: patch.title?.trim() || s.title,
              progress:
                patch.progress != null
                  ? clampProgress(patch.progress)
                  : s.progress,
            };
          });
          return {
            ...g,
            stages,
            done: stages.length > 0 ? stagesAllDone(stages) : g.done,
          };
        }),
      });
    },
    [persist],
  );

  const removeGoalStage = useCallback(
    (goalId: string, stageId: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        goals: current.goals.map((g) => {
          if (g.id !== goalId) return g;
          const stages = (g.stages ?? []).filter((s) => s.id !== stageId);
          return {
            ...g,
            stages,
            done: stages.length > 0 ? stagesAllDone(stages) : false,
          };
        }),
      });
    },
    [persist],
  );

  const addHabit = useCallback(
    async (title: string, areaId: LifeAreaId, remindAt?: string) => {
      const current = dataRef.current;
      const habit: Habit = {
        id: newId(),
        title: title.trim(),
        areaId,
        completions: [],
        misses: [],
        remindAt,
        createdAt: new Date().toISOString(),
      };
      if (
        current.settings.enabled &&
        current.settings.habitReminders &&
        remindAt
      ) {
        await scheduleHabitReminder(habit);
      }
      await persist({ ...current, habits: [habit, ...current.habits] });
    },
    [persist],
  );

  const updateHabit = useCallback(
    async (id: string, patch: Partial<Habit>) => {
      const current = dataRef.current;
      const habits = await Promise.all(
        current.habits.map(async (h) => {
          if (h.id !== id) return h;
          const next = { ...h, ...patch, id: h.id };
          if (
            current.settings.enabled &&
            current.settings.habitReminders &&
            next.remindAt
          ) {
            await scheduleHabitReminder(next);
          } else {
            await cancelNotification(`habit-${h.id}`);
          }
          return next;
        }),
      );
      await persist({ ...current, habits });
    },
    [persist],
  );

  const toggleHabitToday = useCallback(
    (id: string) => {
      const current = dataRef.current;
      const day = todayIso();
      void persist({
        ...current,
        habits: current.habits.map((h) => {
          if (h.id !== id) return h;
          const misses = h.misses ?? [];
          const hasMiss = misses.some((m) => m.date === day);
          if (hasMiss) {
            return {
              ...h,
              misses: misses.filter((m) => m.date !== day),
            };
          }
          return {
            ...h,
            misses: [
              ...misses,
              { date: day, reason: 'Не выполнено' },
            ],
          };
        }),
      });
    },
    [persist],
  );

  const markHabitMiss = useCallback(
    (id: string, date: string, reason: string) => {
      const text = reason.trim() || 'Нарушение';
      const current = dataRef.current;
      void persist({
        ...current,
        habits: current.habits.map((h) => {
          if (h.id !== id) return h;
          const misses = (h.misses ?? []).filter((m) => m.date !== date);
          return {
            ...h,
            misses: [...misses, { date, reason: text }],
            completions: (h.completions ?? []).filter((d) => d !== date),
          };
        }),
      });
    },
    [persist],
  );

  const clearHabitMiss = useCallback(
    (id: string, date: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        habits: current.habits.map((h) => {
          if (h.id !== id) return h;
          return {
            ...h,
            misses: (h.misses ?? []).filter((m) => m.date !== date),
          };
        }),
      });
    },
    [persist],
  );

  const removeHabit = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      await cancelNotification(`habit-${id}`);
      await persist({
        ...current,
        habits: current.habits.filter((h) => h.id !== id),
      });
    },
    [persist],
  );

  const addExpense = useCallback(
    (input: AddExpenseInput) => {
      const current = dataRef.current;
      const base = current.baseCurrency ?? DEFAULT_BASE_CURRENCY;
      const currency = input.currency ?? base;
      const originalAmount = Math.abs(input.amount);
      const amount = convertAmount(
        originalAmount,
        currency,
        base,
        current.fxRates,
      );
      const expense: Expense = {
        id: newId(),
        title: input.title.trim(),
        amount,
        currency,
        originalAmount,
        categoryId: input.categoryId,
        date: input.date ?? todayIso(),
        note: input.note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      void persist({ ...current, expenses: [expense, ...current.expenses] });
    },
    [persist],
  );

  const removeExpense = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        expenses: current.expenses.filter((e) => e.id !== id),
      });
    },
    [persist],
  );

  const addIncome = useCallback(
    (input: AddIncomeInput) => {
      const current = dataRef.current;
      const base = current.baseCurrency ?? DEFAULT_BASE_CURRENCY;
      const currency = input.currency ?? base;
      const originalAmount = Math.abs(input.amount);
      const amount = convertAmount(
        originalAmount,
        currency,
        base,
        current.fxRates,
      );
      const income: Income = {
        id: newId(),
        title: input.title.trim() || 'Поступление',
        amount,
        currency,
        originalAmount,
        date: input.date ?? todayIso(),
        note: input.note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      void persist({
        ...current,
        incomes: [income, ...(current.incomes ?? [])],
      });
    },
    [persist],
  );

  const setBaseCurrency = useCallback(
    (code: CurrencyCode) => {
      const current = dataRef.current;
      const prev = current.baseCurrency ?? DEFAULT_BASE_CURRENCY;
      if (prev === code) return;
      const rates = current.fxRates;
      const incomes = (current.incomes ?? []).map((i) => {
        const originalAmount = i.originalAmount ?? i.amount;
        const currency = i.currency ?? prev;
        return {
          ...i,
          currency,
          originalAmount,
          amount: convertAmount(originalAmount, currency, code, rates),
        };
      });
      const expenses = current.expenses.map((e) => {
        const originalAmount = e.originalAmount ?? e.amount;
        const currency = e.currency ?? prev;
        return {
          ...e,
          currency,
          originalAmount,
          amount: convertAmount(originalAmount, currency, code, rates),
        };
      });
      const plannedPurchases = (current.plannedPurchases ?? []).map((p) => {
        const currency = p.currency ?? prev;
        const originalTarget = p.originalTarget ?? p.targetAmount;
        const savedRatio =
          p.targetAmount > 0 ? p.savedAmount / p.targetAmount : 0;
        const targetAmount = convertAmount(
          originalTarget,
          currency,
          code,
          rates,
        );
        return {
          ...p,
          currency,
          originalTarget,
          targetAmount,
          savedAmount: Math.round(targetAmount * savedRatio * 100) / 100,
        };
      });
      void persist({
        ...current,
        baseCurrency: code,
        incomes,
        expenses,
        plannedPurchases,
      });
    },
    [persist],
  );

  const refreshFxRates = useCallback(async () => {
    try {
      const fx = await fetchUsdRates();
      const current = dataRef.current;
      const base = current.baseCurrency ?? DEFAULT_BASE_CURRENCY;
      const incomes = (current.incomes ?? []).map((i) => {
        const originalAmount = i.originalAmount ?? i.amount;
        const currency = i.currency ?? base;
        return {
          ...i,
          currency,
          originalAmount,
          amount: convertAmount(originalAmount, currency, base, fx.rates),
        };
      });
      const expenses = current.expenses.map((e) => {
        const originalAmount = e.originalAmount ?? e.amount;
        const currency = e.currency ?? base;
        return {
          ...e,
          currency,
          originalAmount,
          amount: convertAmount(originalAmount, currency, base, fx.rates),
        };
      });
      const plannedPurchases = (current.plannedPurchases ?? []).map((p) => {
        const currency = p.currency ?? base;
        const originalTarget = p.originalTarget ?? p.targetAmount;
        const savedRatio =
          p.targetAmount > 0 ? p.savedAmount / p.targetAmount : 0;
        const targetAmount = convertAmount(
          originalTarget,
          currency,
          base,
          fx.rates,
        );
        return {
          ...p,
          currency,
          originalTarget,
          targetAmount,
          savedAmount: Math.round(targetAmount * savedRatio * 100) / 100,
        };
      });
      await persist({
        ...current,
        fxRates: fx.rates,
        fxUpdatedAt: fx.updatedAt,
        incomes,
        expenses,
        plannedPurchases,
      });
      return true;
    } catch {
      return false;
    }
  }, [persist]);

  const removeIncome = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        incomes: (current.incomes ?? []).filter((i) => i.id !== id),
      });
    },
    [persist],
  );

  const updateBudgetPlan = useCallback(
    (plan: BudgetPlan) => {
      const current = dataRef.current;
      void persist({ ...current, budgetPlan: plan });
    },
    [persist],
  );

  const addEnvelope = useCallback(
    (input: {
      title: string;
      color: string;
      icon?: string;
      percent?: number;
    }) => {
      const current = dataRef.current;
      const title = input.title.trim();
      if (!title) return;
      const id = `env-${newId()}`;
      const envelopes: ExpenseCategory[] = [
        ...(current.envelopes ?? []),
        {
          id,
          title,
          color: input.color,
          icon: input.icon?.trim() || 'tag',
        },
      ];
      const budgetPlan = {
        ...current.budgetPlan,
        [id]: Math.max(0, input.percent ?? 0),
      };
      void persist({ ...current, envelopes, budgetPlan });
    },
    [persist],
  );

  const updateEnvelope = useCallback(
    (id: string, patch: { title?: string; color?: string; icon?: string }) => {
      const current = dataRef.current;
      const envelopes = (current.envelopes ?? []).map((e) =>
        e.id === id
          ? {
              ...e,
              title: patch.title?.trim() || e.title,
              color: patch.color || e.color,
              icon: patch.icon?.trim() || e.icon || 'tag',
            }
          : e,
      );
      void persist({ ...current, envelopes });
    },
    [persist],
  );

  const removeEnvelope = useCallback(
    (id: string, moveToId?: string) => {
      const current = dataRef.current;
      const list = current.envelopes ?? [];
      if (list.length <= 1) return;
      const fallback =
        moveToId && list.some((e) => e.id === moveToId)
          ? moveToId
          : list.find((e) => e.id !== id)?.id;
      if (!fallback) return;
      const envelopes = list.filter((e) => e.id !== id);
      const budgetPlan = { ...current.budgetPlan };
      delete budgetPlan[id];
      const expenses = current.expenses.map((e) =>
        e.categoryId === id ? { ...e, categoryId: fallback } : e,
      );
      void persist({ ...current, envelopes, budgetPlan, expenses });
    },
    [persist],
  );

  const addPlannedPurchase = useCallback(
    (input: {
      title: string;
      amount: number;
      currency?: string;
      note?: string;
    }) => {
      const current = dataRef.current;
      const title = input.title.trim();
      if (!title || !(input.amount > 0)) return;
      const base = current.baseCurrency ?? DEFAULT_BASE_CURRENCY;
      const currency = input.currency ?? base;
      const originalTarget = Math.abs(input.amount);
      const targetAmount = convertAmount(
        originalTarget,
        currency,
        base,
        current.fxRates,
      );
      const item: PlannedPurchase = {
        id: newId(),
        title,
        targetAmount,
        currency,
        originalTarget,
        savedAmount: 0,
        note: input.note?.trim() || undefined,
        bought: false,
        createdAt: new Date().toISOString(),
      };
      void persist({
        ...current,
        plannedPurchases: [item, ...(current.plannedPurchases ?? [])],
      });
    },
    [persist],
  );

  const updatePlannedPurchase = useCallback(
    (
      id: string,
      patch: Partial<Pick<PlannedPurchase, 'title' | 'note' | 'bought'>>,
    ) => {
      const current = dataRef.current;
      const plannedPurchases = (current.plannedPurchases ?? []).map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              title: patch.title?.trim() || p.title,
            }
          : p,
      );
      void persist({ ...current, plannedPurchases });
    },
    [persist],
  );

  const contributeToPurchase = useCallback(
    (id: string, amount: number, currency?: string) => {
      const current = dataRef.current;
      if (!(amount > 0)) return;
      const base = current.baseCurrency ?? DEFAULT_BASE_CURRENCY;
      const cur = currency ?? base;
      const add = convertAmount(amount, cur, base, current.fxRates);
      const plannedPurchases = (current.plannedPurchases ?? []).map((p) => {
        if (p.id !== id || p.bought) return p;
        const savedAmount =
          Math.round((p.savedAmount + add) * 100) / 100;
        return { ...p, savedAmount };
      });
      void persist({ ...current, plannedPurchases });
    },
    [persist],
  );

  const markPurchaseBought = useCallback(
    (id: string, asExpense = false) => {
      const current = dataRef.current;
      const item = (current.plannedPurchases ?? []).find((p) => p.id === id);
      if (!item || item.bought) return;
      let expenses = current.expenses;
      if (asExpense) {
        const shopping =
          (current.envelopes ?? []).find((e) => e.id === 'shopping')?.id ??
          (current.envelopes ?? [])[0]?.id ??
          'other';
        expenses = [
          {
            id: newId(),
            title: item.title,
            amount: item.targetAmount,
            currency: current.baseCurrency ?? DEFAULT_BASE_CURRENCY,
            originalAmount: item.targetAmount,
            categoryId: shopping,
            date: todayIso(),
            note: 'Планируемая покупка',
            createdAt: new Date().toISOString(),
          },
          ...expenses,
        ];
      }
      const plannedPurchases = (current.plannedPurchases ?? []).map((p) =>
        p.id === id
          ? {
              ...p,
              bought: true,
              boughtAt: new Date().toISOString(),
              savedAmount: p.targetAmount,
            }
          : p,
      );
      void persist({ ...current, plannedPurchases, expenses });
    },
    [persist],
  );

  const removePlannedPurchase = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        plannedPurchases: (current.plannedPurchases ?? []).filter(
          (p) => p.id !== id,
        ),
      });
    },
    [persist],
  );

  const addCredit = useCallback(
    async (input: {
      title: string;
      paymentAmount: number;
      currency?: string;
      dueDay: number;
      remindAt: string;
      remainingDebt?: number;
      note?: string;
    }) => {
      const current = dataRef.current;
      const title = input.title.trim();
      if (!title || input.paymentAmount <= 0) return;
      const base = current.baseCurrency ?? DEFAULT_BASE_CURRENCY;
      const currency = input.currency ?? base;
      const paymentAmount = convertAmount(
        input.paymentAmount,
        currency,
        base,
        current.fxRates,
      );
      let credit: Credit = {
        id: newId(),
        title,
        paymentAmount,
        currency,
        originalPayment: input.paymentAmount,
        dueDay: Math.min(28, Math.max(1, input.dueDay || 1)),
        remindAt: input.remindAt || '09:00',
        remainingDebt: input.remainingDebt,
        note: input.note?.trim() || undefined,
        enabled: true,
        notificationIds: [],
        createdAt: new Date().toISOString(),
      };
      const notificationIds = await scheduleCreditReminder(credit);
      credit = { ...credit, notificationIds };
      await persist({
        ...current,
        credits: [credit, ...(current.credits ?? [])],
      });
    },
    [persist],
  );

  const updateCredit = useCallback(
    async (id: string, patch: Partial<Credit>) => {
      const current = dataRef.current;
      const credits: Credit[] = [];
      for (const c of current.credits ?? []) {
        if (c.id !== id) {
          credits.push(c);
          continue;
        }
        let next = { ...c, ...patch, id: c.id };
        const notificationIds = await scheduleCreditReminder(next);
        next = { ...next, notificationIds };
        credits.push(next);
      }
      await persist({ ...current, credits });
    },
    [persist],
  );

  const removeCredit = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      const credit = (current.credits ?? []).find((c) => c.id === id);
      if (credit) await cancelCreditNotifications(credit);
      await persist({
        ...current,
        credits: (current.credits ?? []).filter((c) => c.id !== id),
      });
    },
    [persist],
  );

  const addBook = useCallback(
    (input: { title: string; author?: string; note?: string }) => {
      const current = dataRef.current;
      const title = input.title.trim();
      if (!title) return;
      const book: Book = {
        id: newId(),
        title,
        author: input.author?.trim() || undefined,
        note: input.note?.trim() || undefined,
        done: false,
        createdAt: new Date().toISOString(),
      };
      void persist({
        ...current,
        books: [book, ...(current.books ?? [])],
      });
    },
    [persist],
  );

  const toggleBook = useCallback(
    (id: string) => {
      const current = dataRef.current;
      const books = (current.books ?? []).map((b) => {
        if (b.id !== id) return b;
        const done = !b.done;
        return {
          ...b,
          done,
          doneAt: done ? new Date().toISOString() : undefined,
        };
      });
      void persist({ ...current, books });
    },
    [persist],
  );

  const removeBook = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        books: (current.books ?? []).filter((b) => b.id !== id),
      });
    },
    [persist],
  );

  const addGymExercise = useCallback(
    (input: { title: string; muscle: GymMuscleId }) => {
      const current = dataRef.current;
      const title = input.title.trim();
      if (!title) return;
      const exercise: GymExercise = {
        id: newId(),
        title,
        muscle: input.muscle,
        createdAt: new Date().toISOString(),
      };
      void persist({
        ...current,
        gymExercises: [exercise, ...(current.gymExercises ?? [])],
      });
    },
    [persist],
  );

  const removeGymExercise = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        gymExercises: (current.gymExercises ?? []).filter((e) => e.id !== id),
        gymLogs: (current.gymLogs ?? []).filter((l) => l.exerciseId !== id),
      });
    },
    [persist],
  );

  const addGymLog = useCallback(
    (input: {
      exerciseId: string;
      date?: string;
      sets: GymSet[];
      note?: string;
    }) => {
      const current = dataRef.current;
      const sets = input.sets
        .map((s) => ({
          reps: Math.max(0, Math.round(s.reps)),
          weight: Math.max(0, Number(s.weight) || 0),
        }))
        .filter((s) => s.reps > 0);
      if (!sets.length) return;
      const log: GymLog = {
        id: newId(),
        exerciseId: input.exerciseId,
        date: input.date ?? todayIso(),
        sets,
        note: input.note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      void persist({
        ...current,
        gymLogs: [log, ...(current.gymLogs ?? [])],
      });
    },
    [persist],
  );

  const removeGymLog = useCallback(
    (id: string) => {
      const current = dataRef.current;
      void persist({
        ...current,
        gymLogs: (current.gymLogs ?? []).filter((l) => l.id !== id),
      });
    },
    [persist],
  );

  const seedDefaultGymExercises = useCallback(() => {
    const current = dataRef.current;
    if ((current.gymExercises ?? []).length > 0) return;
    const now = new Date().toISOString();
    const gymExercises: GymExercise[] = DEFAULT_GYM_EXERCISES.map((e) => ({
      ...e,
      id: newId(),
      createdAt: now,
    }));
    void persist({ ...current, gymExercises });
  }, [persist]);

  const addEvent = useCallback(
    async (input: AddEventInput) => {
      const current = dataRef.current;
      let event: CalendarEvent = {
        id: newId(),
        title: input.title.trim(),
        date: input.date,
        startTime: input.allDay ? undefined : input.startTime,
        endTime: input.allDay ? undefined : input.endTime,
        allDay: Boolean(input.allDay),
        notes: input.notes?.trim() || undefined,
        areaId: input.areaId,
        remindMinutesBefore: input.remindMinutesBefore,
        createdAt: new Date().toISOString(),
      };
      if (
        current.settings.enabled &&
        current.settings.eventReminders &&
        event.remindMinutesBefore != null
      ) {
        const notificationId = await scheduleEventReminder(event);
        event = { ...event, notificationId: notificationId ?? undefined };
      }
      await persist({ ...current, events: [event, ...current.events] });
    },
    [persist],
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<CalendarEvent>) => {
      const current = dataRef.current;
      const events = await Promise.all(
        current.events.map(async (e) => {
          if (e.id !== id) return e;
          let next = { ...e, ...patch, id: e.id };
          if (
            current.settings.enabled &&
            current.settings.eventReminders &&
            next.remindMinutesBefore != null
          ) {
            const notificationId = await scheduleEventReminder(next);
            next = { ...next, notificationId: notificationId ?? undefined };
          } else {
            await cancelNotification(e.notificationId);
            next = { ...next, notificationId: undefined };
          }
          return next;
        }),
      );
      await persist({ ...current, events });
    },
    [persist],
  );

  const removeEvent = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      const event = current.events.find((e) => e.id === id);
      await cancelNotification(event?.notificationId);
      await persist({
        ...current,
        events: current.events.filter((e) => e.id !== id),
      });
    },
    [persist],
  );

  const updateSettings = useCallback(
    async (patch: Partial<NotificationSettings>) => {
      const current = dataRef.current;
      const settings = { ...current.settings, ...patch };
      const next = { ...current, settings };
      const synced = await resyncAllNotifications(next);
      await scheduleDailyBriefing(
        synced.settings.dailyBriefingAt,
        synced.settings.enabled,
      );
      await persist(synced);
    },
    [persist],
  );

  const addAlarm = useCallback(
    async (input: {
      label?: string;
      time: string;
      days?: Weekday[];
      soundId?: AlarmSoundId;
      customSoundUri?: string;
      customSoundName?: string;
      vibrate?: boolean;
      playInSilent?: boolean;
      gradualVolume?: boolean;
      volume?: number;
      snoozeMinutes?: 5 | 10 | 15 | 20;
    }) => {
      const current = dataRef.current;
      let alarm: Alarm = {
        id: newId(),
        label: input.label?.trim() || 'Будильник',
        time: input.time,
        days: input.days ?? [],
        enabled: true,
        soundId: input.soundId ?? 'default',
        customSoundUri: input.customSoundUri,
        customSoundName: input.customSoundName,
        vibrate: input.vibrate ?? true,
        playInSilent: input.playInSilent ?? true,
        gradualVolume: input.gradualVolume ?? true,
        volume: input.volume ?? 1,
        snoozeMinutes: input.snoozeMinutes ?? 10,
        notificationIds: [],
        createdAt: new Date().toISOString(),
      };
      const notificationIds = await scheduleAlarm(alarm);
      alarm = { ...alarm, notificationIds };
      await persist({
        ...current,
        alarms: [alarm, ...(current.alarms ?? [])],
      });
    },
    [persist],
  );

  const updateAlarm = useCallback(
    async (id: string, patch: Partial<Alarm>) => {
      const current = dataRef.current;
      const alarms: Alarm[] = [];
      for (const a of current.alarms ?? []) {
        if (a.id !== id) {
          alarms.push(a);
          continue;
        }
        let next = { ...a, ...patch, id: a.id };
        const notificationIds = await scheduleAlarm(next);
        next = { ...next, notificationIds };
        alarms.push(next);
      }
      await persist({ ...current, alarms });
    },
    [persist],
  );

  const toggleAlarm = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      const alarm = (current.alarms ?? []).find((a) => a.id === id);
      if (!alarm) return;
      await updateAlarm(id, { enabled: !alarm.enabled });
    },
    [updateAlarm],
  );

  const removeAlarm = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      const alarm = (current.alarms ?? []).find((a) => a.id === id);
      if (alarm) await cancelAlarmNotifications(alarm);
      await persist({
        ...current,
        alarms: (current.alarms ?? []).filter((a) => a.id !== id),
      });
    },
    [persist],
  );

  const getAlarm = useCallback(
    (id: string) => (dataRef.current.alarms ?? []).find((a) => a.id === id),
    [],
  );

  const value = useMemo(
    () => ({
      ready,
      data,
      requestNotifications,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      addGoal,
      toggleGoal,
      removeGoal,
      addGoalStage,
      updateGoalStage,
      removeGoalStage,
      addHabit,
      updateHabit,
      toggleHabitToday,
      markHabitMiss,
      clearHabitMiss,
      removeHabit,
      addExpense,
      removeExpense,
      addIncome,
      removeIncome,
      updateBudgetPlan,
      setBaseCurrency,
      refreshFxRates,
      addEnvelope,
      updateEnvelope,
      removeEnvelope,
      addPlannedPurchase,
      updatePlannedPurchase,
      contributeToPurchase,
      markPurchaseBought,
      removePlannedPurchase,
      addCredit,
      updateCredit,
      removeCredit,
      addBook,
      toggleBook,
      removeBook,
      addGymExercise,
      removeGymExercise,
      addGymLog,
      removeGymLog,
      seedDefaultGymExercises,
      addEvent,
      updateEvent,
      removeEvent,
      updateSettings,
      addAlarm,
      updateAlarm,
      toggleAlarm,
      removeAlarm,
      getAlarm,
    }),
    [
      ready,
      data,
      requestNotifications,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      addGoal,
      toggleGoal,
      removeGoal,
      addGoalStage,
      updateGoalStage,
      removeGoalStage,
      addHabit,
      updateHabit,
      toggleHabitToday,
      markHabitMiss,
      clearHabitMiss,
      removeHabit,
      addExpense,
      removeExpense,
      addIncome,
      removeIncome,
      updateBudgetPlan,
      setBaseCurrency,
      refreshFxRates,
      addEnvelope,
      updateEnvelope,
      removeEnvelope,
      addPlannedPurchase,
      updatePlannedPurchase,
      contributeToPurchase,
      markPurchaseBought,
      removePlannedPurchase,
      addCredit,
      updateCredit,
      removeCredit,
      addBook,
      toggleBook,
      removeBook,
      addGymExercise,
      removeGymExercise,
      addGymLog,
      removeGymLog,
      seedDefaultGymExercises,
      addEvent,
      updateEvent,
      removeEvent,
      updateSettings,
      addAlarm,
      updateAlarm,
      toggleAlarm,
      removeAlarm,
      getAlarm,
    ],
  );

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
