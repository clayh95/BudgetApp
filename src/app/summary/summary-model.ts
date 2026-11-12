import { ICategory, ITransaction } from '../core/dataTypes';

export type SummaryKind = 'category' | 'income' | 'pending' | 'uncategorized';
export interface SummaryView {
  key: string;
  kind: SummaryKind;
  category: ICategory;
  transactions: ITransaction[];
}
export interface SummaryModel {
  views: SummaryView[];
  reportCats: SummaryView[];
  income?: SummaryView;
  actualIncome: number;
  totalBudgeted: number;
  spent: number;
  totalPending: number;
}

const money = (value: number) => +value.toFixed(2);
export const isPending = (t: ITransaction) => (t.status || '').toLowerCase() === 'pending';

/** Preserve Summary's signed-amount rules; income is separated before pending expenses. */
export function buildSummary(categories: ICategory[], transactions: ITransaction[]): SummaryModel {
  const blank: ICategory = {
    id: '',
    name: 'Uncategorized',
    budgeted: 0,
    spent: 0,
    keywords: [],
    notes: '',
    emoji: '?',
  };
  const ordered = (items: ITransaction[]) => items.slice().sort((a, b) => a.date.localeCompare(b.date));
  const make = (category: ICategory, key: string, kind: SummaryKind, name: string): SummaryView => {
    const items = ordered(transactions.filter((t) => t.category === name && (kind === 'income' || !isPending(t))));
    return {
      key,
      kind,
      category: {
        ...category,
        keywords: [...(category.keywords || [])],
        spent: money(items.reduce((s, t) => s - Number(t.amount), 0)),
      },
      transactions: items,
    };
  };
  const uncategorized = make(blank, 'uncategorized', 'uncategorized', '');
  const incomeCategory = categories.find((c) => c.name.toUpperCase() === 'INCOME');
  const income = incomeCategory
    ? make(incomeCategory, `category:${incomeCategory.id}`, 'income', incomeCategory.name)
    : undefined;
  const regular = categories
    .filter((c) => c !== incomeCategory)
    .map((c) => make(c, `category:${c.id}`, 'category', c.name));
  const reportCats = [uncategorized, ...regular];
  // Only entries that belonged to a displayed expense grouping were pending in the old Summary.
  const expenseNames = new Set(['', ...regular.map((v) => v.category.name)]);
  const pendingTransactions = ordered(transactions.filter((t) => expenseNames.has(t.category) && isPending(t)));
  const pending: SummaryView = {
    key: 'pending',
    kind: 'pending',
    category: { ...blank, name: 'Pending', emoji: '' },
    transactions: pendingTransactions,
  };
  return {
    views: [pending, uncategorized, ...(income ? [income] : []), ...regular],
    reportCats,
    income,
    actualIncome: money((income?.transactions || []).reduce((s, t) => s + Number(t.amount), 0)),
    totalBudgeted: money(reportCats.reduce((s, v) => s + Number(v.category.budgeted), 0)),
    spent: money(reportCats.reduce((s, v) => s + v.category.spent, 0)),
    totalPending: money(pendingTransactions.reduce((s, t) => s + Number(t.amount), 0)),
  };
}
