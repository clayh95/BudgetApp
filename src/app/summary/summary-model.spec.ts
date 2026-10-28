import { buildSummary } from './summary-model';
import { ICategory, ITransaction } from '../core/dataTypes';

const cat = (id: string, name: string, budgeted: number): ICategory => ({
  id,
  name,
  budgeted,
  spent: 0,
  notes: '',
  keywords: [],
});
const tx = (id: string, category: string, amount: number, status = 'Posted'): ITransaction => ({
  id,
  category,
  amount,
  status,
  date: '10/01/2026',
  description: id,
});

describe('Summary calculation compatibility', () => {
  it('keeps pending expenses separate, includes pending income, and respects refunds and split lines', () => {
    const categories = [cat('i', 'Income', 1000), cat('g', 'Groceries', 200)];
    const transactions = [
      tx('pay', 'Income', 1000),
      tx('pending pay', 'Income', 50, 'Pending'),
      tx('expense', 'Groceries', -80),
      tx('refund', 'Groceries', 10),
      tx('split', 'Groceries', -20),
      tx('pending expense', 'Groceries', -25, 'Pending'),
      tx('unknown', '', -12),
      tx('pending unknown', '', -5, 'pending'),
    ];
    const result = buildSummary(categories, transactions);
    expect(result.actualIncome).toBe(1050);
    expect(result.totalBudgeted).toBe(200);
    expect(result.spent).toBe(102);
    expect(result.totalPending).toBe(-30);
    expect(result.views.find((v) => v.key === 'pending').transactions.map((t) => t.id)).toEqual([
      'pending expense',
      'pending unknown',
    ]);
    expect(result.views.find((v) => v.key === 'category:g').category.spent).toBe(90);
    expect(categories[1].spent).toBe(0);
  });

  it('keeps empty category and work-queue views available without income or transactions', () => {
    const result = buildSummary([cat('g', 'Groceries', 200)], []);
    expect(result.totalBudgeted).toBe(200);
    expect(result.actualIncome).toBe(0);
    expect(result.views.map((v) => v.key)).toEqual(['uncategorized', 'pending', 'category:g']);
    expect(buildSummary([], []).views).toHaveLength(2);
  });
});
