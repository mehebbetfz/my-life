import type { GymLog, GymSet } from '../types';

export function setVolume(set: GymSet): number {
  return set.reps * set.weight;
}

export function logVolume(log: GymLog): number {
  return (log.sets ?? []).reduce((s, set) => s + setVolume(set), 0);
}

/** лучший подход: макс вес, при равенстве — больше повторов */
export function bestSet(sets: GymSet[]): GymSet | null {
  if (!sets.length) return null;
  return [...sets].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.reps - a.reps;
  })[0];
}

export function formatSet(set: GymSet): string {
  const w = Number.isInteger(set.weight)
    ? String(set.weight)
    : set.weight.toFixed(1);
  return `${w}×${set.reps}`;
}

export function logsForExercise(
  logs: GymLog[],
  exerciseId: string,
): GymLog[] {
  return logs
    .filter((l) => l.exerciseId === exerciseId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function lastLog(
  logs: GymLog[],
  exerciseId: string,
): GymLog | null {
  return logsForExercise(logs, exerciseId)[0] ?? null;
}

export function personalBest(
  logs: GymLog[],
  exerciseId: string,
): GymSet | null {
  const all = logsForExercise(logs, exerciseId).flatMap((l) => l.sets ?? []);
  return bestSet(all);
}
