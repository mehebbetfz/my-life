import type { Goal, GoalStage } from '../types';

export function clampProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function goalProgress(goal: Goal): number {
  const stages = goal.stages ?? [];
  if (stages.length === 0) return goal.done ? 100 : 0;
  const sum = stages.reduce((s, st) => s + clampProgress(st.progress), 0);
  return Math.round(sum / stages.length);
}

export function stagesAllDone(stages: GoalStage[]): boolean {
  return stages.length > 0 && stages.every((s) => clampProgress(s.progress) >= 100);
}

export function normalizeGoal(g: Partial<Goal> & { id: string; title: string }): Goal {
  const stages = (g.stages ?? []).map((s) => {
    const legacyDone = Boolean((s as { done?: boolean }).done);
    const raw =
      typeof s.progress === 'number' ? s.progress : legacyDone ? 100 : 0;
    return {
      id: s.id,
      title: s.title?.trim() || 'Этап',
      progress: clampProgress(raw),
    };
  });
  const done =
    stages.length > 0 ? stagesAllDone(stages) : Boolean(g.done);
  return {
    id: g.id,
    title: g.title,
    areaId: g.areaId ?? 'growth',
    targetDate: g.targetDate,
    stages,
    done,
    createdAt: g.createdAt ?? new Date().toISOString(),
  };
}
