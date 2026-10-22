import type { Habit, HabitMiss } from '../types';
import { todayIso } from './storage';

export type HabitDayKind = 'empty' | 'done' | 'missed' | 'future';

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function habitStartDate(habit: Habit): string {
  return (habit.createdAt || '').slice(0, 10) || todayIso();
}

export function getMiss(habit: Habit, date: string): HabitMiss | undefined {
  return (habit.misses ?? []).find((m) => m.date === date);
}

/**
 * День зелёный автоматически, если дата уже наступила (с создания привычки)
 * и нет записи о нарушении. Красный — есть miss. Будущее — пусто.
 */
export function habitDayKind(habit: Habit, date: string): HabitDayKind {
  const today = todayIso();
  if (date > today) return 'future';
  if (date < habitStartDate(habit)) return 'empty';
  if (getMiss(habit, date)) return 'missed';
  return 'done';
}

export function isHabitOkOn(habit: Habit, date: string): boolean {
  return habitDayKind(habit, date) === 'done';
}

export function countHabitStreak(habit: Habit): number {
  let streak = 0;
  const d = new Date();
  const start = habitStartDate(habit);
  for (;;) {
    const iso = toIsoDate(d);
    if (iso < start) break;
    if (habitDayKind(habit, iso) === 'missed') break;
    if (habitDayKind(habit, iso) === 'done') streak += 1;
    else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function monthGrid(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  /** Пн=0 … Вс=6 */
  let start = first.getDay() - 1;
  if (start < 0) start = 6;
  const cells: (string | null)[] = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toIsoDate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthsBack(count: number): { year: number; month: number; label: string }[] {
  const out: { year: number; month: number; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    out.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function normalizeHabit(
  h: Partial<Habit> & { id: string; title: string },
): Habit {
  return {
    id: h.id,
    title: h.title,
    areaId: h.areaId ?? 'health',
    completions: h.completions ?? [],
    misses: (h.misses ?? []).map((m) => ({
      date: m.date,
      reason: m.reason?.trim() || 'Нарушение',
    })),
    remindAt: h.remindAt,
    createdAt: h.createdAt ?? new Date().toISOString(),
  };
}
