import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AppData, Goal, Habit, LifeAreaId, Task } from '../types';
import { emptyData, loadData, newId, saveData, todayIso } from '../lib/storage';

type DataContextValue = {
  ready: boolean;
  data: AppData;
  addTask: (title: string, areaId?: LifeAreaId) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  addGoal: (title: string, areaId: LifeAreaId, targetDate?: string) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  addHabit: (title: string, areaId: LifeAreaId) => void;
  toggleHabitToday: (id: string) => void;
  removeHabit: (id: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(emptyData);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadData();
      if (!cancelled) {
        setData(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: AppData) => {
    setData(next);
    void saveData(next);
  }, []);

  const addTask = useCallback(
    (title: string, areaId?: LifeAreaId) => {
      const task: Task = {
        id: newId(),
        title: title.trim(),
        areaId,
        done: false,
        createdAt: new Date().toISOString(),
        dueDate: todayIso(),
      };
      persist({ ...data, tasks: [task, ...data.tasks] });
    },
    [data, persist],
  );

  const toggleTask = useCallback(
    (id: string) => {
      persist({
        ...data,
        tasks: data.tasks.map((t) =>
          t.id === id ? { ...t, done: !t.done } : t,
        ),
      });
    },
    [data, persist],
  );

  const removeTask = useCallback(
    (id: string) => {
      persist({ ...data, tasks: data.tasks.filter((t) => t.id !== id) });
    },
    [data, persist],
  );

  const addGoal = useCallback(
    (title: string, areaId: LifeAreaId, targetDate?: string) => {
      const goal: Goal = {
        id: newId(),
        title: title.trim(),
        areaId,
        targetDate,
        done: false,
        createdAt: new Date().toISOString(),
      };
      persist({ ...data, goals: [goal, ...data.goals] });
    },
    [data, persist],
  );

  const toggleGoal = useCallback(
    (id: string) => {
      persist({
        ...data,
        goals: data.goals.map((g) =>
          g.id === id ? { ...g, done: !g.done } : g,
        ),
      });
    },
    [data, persist],
  );

  const removeGoal = useCallback(
    (id: string) => {
      persist({ ...data, goals: data.goals.filter((g) => g.id !== id) });
    },
    [data, persist],
  );

  const addHabit = useCallback(
    (title: string, areaId: LifeAreaId) => {
      const habit: Habit = {
        id: newId(),
        title: title.trim(),
        areaId,
        completions: [],
        createdAt: new Date().toISOString(),
      };
      persist({ ...data, habits: [habit, ...data.habits] });
    },
    [data, persist],
  );

  const toggleHabitToday = useCallback(
    (id: string) => {
      const day = todayIso();
      persist({
        ...data,
        habits: data.habits.map((h) => {
          if (h.id !== id) return h;
          const has = h.completions.includes(day);
          return {
            ...h,
            completions: has
              ? h.completions.filter((d) => d !== day)
              : [...h.completions, day],
          };
        }),
      });
    },
    [data, persist],
  );

  const removeHabit = useCallback(
    (id: string) => {
      persist({ ...data, habits: data.habits.filter((h) => h.id !== id) });
    },
    [data, persist],
  );

  const value = useMemo(
    () => ({
      ready,
      data,
      addTask,
      toggleTask,
      removeTask,
      addGoal,
      toggleGoal,
      removeGoal,
      addHabit,
      toggleHabitToday,
      removeHabit,
    }),
    [
      ready,
      data,
      addTask,
      toggleTask,
      removeTask,
      addGoal,
      toggleGoal,
      removeGoal,
      addHabit,
      toggleHabitToday,
      removeHabit,
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
