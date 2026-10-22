import type { Expense } from '../types';

export type ExpenseSuggestion = {
  title: string;
  categoryId: string;
  currency: string;
  /** последняя сумма в валюте ввода */
  lastAmount: number;
  count: number;
  lastDate: string;
};

function norm(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Уникальные названия трат: последние категория / валюта / сумма. */
export function buildExpenseSuggestions(
  expenses: Expense[],
): ExpenseSuggestion[] {
  const map = new Map<
    string,
    ExpenseSuggestion & { sortKey: string }
  >();

  const sorted = [...expenses].sort((a, b) =>
    (b.date + b.createdAt).localeCompare(a.date + a.createdAt),
  );

  for (const e of sorted) {
    const key = norm(e.title);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    map.set(key, {
      title: e.title.trim(),
      categoryId: e.categoryId,
      currency: e.currency || 'RUB',
      lastAmount: e.originalAmount ?? e.amount,
      count: 1,
      lastDate: e.date,
      sortKey: e.date + e.createdAt,
    });
  }

  return [...map.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.sortKey.localeCompare(a.sortKey);
  });
}

export function filterExpenseSuggestions(
  all: ExpenseSuggestion[],
  query: string,
  limit = 6,
): ExpenseSuggestion[] {
  const q = norm(query);
  if (!q) {
    return all.slice(0, limit);
  }
  return all
    .filter((s) => norm(s.title).includes(q))
    .slice(0, limit);
}
