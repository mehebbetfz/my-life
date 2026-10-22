import {
  DEFAULT_BUDGET_PLAN,
  DEFAULT_ENVELOPES,
  type BudgetPlan,
  type Expense,
  type ExpenseCategory,
  type ExpenseCategoryId,
  type Income,
} from '../types';
import { monthKey } from './storage';

export type Envelope = {
  categoryId: ExpenseCategoryId;
  title: string;
  color: string;
  icon: string;
  percent: number;
  allocated: number;
  spent: number;
  remaining: number;
};

const DEFAULT_ICON_BY_ID: Record<string, string> = Object.fromEntries(
  DEFAULT_ENVELOPES.map((c) => [c.id, c.icon]),
);

export function envelopeIconFor(
  id: string,
  icon?: string | null,
): string {
  if (icon && icon.trim()) return icon.trim();
  return DEFAULT_ICON_BY_ID[id] ?? 'tag';
}

export function normalizeEnvelopes(
  list?: ExpenseCategory[] | null,
): ExpenseCategory[] {
  if (!list || list.length === 0) {
    return DEFAULT_ENVELOPES.map((c) => ({ ...c }));
  }
  return list
    .filter((c) => c && typeof c.id === 'string' && c.title?.trim())
    .map((c) => ({
      id: c.id,
      title: c.title.trim(),
      color: c.color || '#6B6B6B',
      icon: envelopeIconFor(c.id, (c as ExpenseCategory).icon),
    }));
}

export function normalizeBudgetPlan(
  plan?: Partial<BudgetPlan> | null,
  categories: ExpenseCategory[] = DEFAULT_ENVELOPES,
): BudgetPlan {
  const cats = categories.length ? categories : DEFAULT_ENVELOPES;
  const next: BudgetPlan = {};
  for (const c of cats) {
    next[c.id] =
      typeof plan?.[c.id] === 'number'
        ? plan[c.id]!
        : (DEFAULT_BUDGET_PLAN[c.id] ?? 0);
  }
  const sum = cats.reduce((s, c) => s + (next[c.id] || 0), 0);
  if (sum <= 0) {
    const even = Math.floor(100 / cats.length);
    let left = 100;
    cats.forEach((c, i) => {
      if (i === cats.length - 1) next[c.id] = left;
      else {
        next[c.id] = even;
        left -= even;
      }
    });
  }
  return next;
}

export function planTotal(
  plan: BudgetPlan,
  categories: ExpenseCategory[],
): number {
  return categories.reduce((s, c) => s + (plan[c.id] || 0), 0);
}

/** Сколько из одного дохода уходит в категорию */
export function allocateIncome(
  amount: number,
  plan: BudgetPlan,
  categories: ExpenseCategory[],
): Record<string, number> {
  const cats = categories;
  const totalPct = planTotal(plan, cats) || 100;
  const result: Record<string, number> = {};
  let assigned = 0;
  cats.forEach((c, i) => {
    if (i === cats.length - 1) {
      result[c.id] = Math.round((amount - assigned) * 100) / 100;
      return;
    }
    const share =
      Math.round(((amount * (plan[c.id] || 0)) / totalPct) * 100) / 100;
    result[c.id] = share;
    assigned += share;
  });
  return result;
}

export function buildEnvelopes(
  incomes: Income[],
  expenses: Expense[],
  plan: BudgetPlan,
  categories: ExpenseCategory[],
  month?: string,
): Envelope[] {
  const cats = categories.length ? categories : DEFAULT_ENVELOPES;
  const mk = month;
  const incomesIn = mk
    ? incomes.filter((i) => monthKey(i.date) === mk)
    : incomes;
  const expensesIn = mk
    ? expenses.filter((e) => monthKey(e.date) === mk)
    : expenses;

  const allocated: Record<string, number> = {};
  const spent: Record<string, number> = {};
  for (const c of cats) {
    allocated[c.id] = 0;
    spent[c.id] = 0;
  }

  for (const income of incomesIn) {
    const parts = allocateIncome(income.amount, plan, cats);
    for (const c of cats) {
      allocated[c.id] += parts[c.id] ?? 0;
    }
  }

  for (const e of expensesIn) {
    if (spent[e.categoryId] == null) spent[e.categoryId] = 0;
    spent[e.categoryId] += e.amount;
  }

  return cats.map((c) => {
    const a = Math.round((allocated[c.id] ?? 0) * 100) / 100;
    const s = Math.round((spent[c.id] ?? 0) * 100) / 100;
    return {
      categoryId: c.id,
      title: c.title,
      color: c.color,
      icon: envelopeIconFor(c.id, c.icon),
      percent: plan[c.id] || 0,
      allocated: a,
      spent: s,
      remaining: Math.round((a - s) * 100) / 100,
    };
  });
}

export function financeTotals(
  envelopes: Envelope[],
  incomes: Income[],
  month?: string,
) {
  const incomesIn = month
    ? incomes.filter((i) => monthKey(i.date) === month)
    : incomes;
  const incomeTotal = incomesIn.reduce((s, i) => s + i.amount, 0);
  const spentTotal = envelopes.reduce((s, e) => s + e.spent, 0);
  const remainingTotal = envelopes.reduce((s, e) => s + e.remaining, 0);
  return { incomeTotal, spentTotal, remainingTotal };
}
