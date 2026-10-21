import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData } from '../types';

const KEY = '@my-life/data/v1';

export const emptyData = (): AppData => ({
  goals: [],
  habits: [],
  tasks: [],
});

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      goals: parsed.goals ?? [],
      habits: parsed.habits ?? [],
      tasks: parsed.tasks ?? [],
    };
  } catch {
    return emptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
