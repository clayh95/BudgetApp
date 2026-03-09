import { buildDashboardViewModel } from './dashboard.component';

describe('buildDashboardViewModel', () => {
  it('calculates pending and non-pending uncategorized counts', () => {
    const vm = buildDashboardViewModel(
      [{ id: '1', name: 'Groceries', keywords: [], budgeted: 200, spent: 0, notes: '' }],
      [
        { id: 't0', date: '01/09/2026', amount: 500, description: 'Paycheck', category: 'INCOME', notes: '', status: 'Posted' },
        { id: 't1', date: '01/10/2026', amount: -50, description: 'Store', category: 'Groceries', notes: '', status: 'Posted' },
        { id: 't3', date: '01/11/2026', amount: -10, description: 'Unknown posted', category: '', notes: '', status: 'Posted' },
        { id: 't2', date: '01/11/2026', amount: -25, description: 'Unknown', category: '', notes: '', status: 'Pending' }
      ] as any,
      '01/2026'
    );

    expect(vm.stats.uncategorizedNonPendingCount).toBe(1);
    expect(vm.stats.pendingTotal).toBe(-25);
    expect(vm.stats.unbudgeted).toBe(300);
    expect(vm.stats.overBudgetCount).toBe(0);
  });

  it('detects over-budget categories', () => {
    const vm = buildDashboardViewModel(
      [{ id: '1', name: 'Dining', keywords: [], budgeted: 100, spent: 0, notes: '' }],
      [{ id: 't1', date: '01/10/2026', amount: -140, description: 'Food', category: 'Dining', notes: '', status: 'Posted' }] as any,
      '01/2026'
    );

    expect(vm.stats.overBudgetCount).toBe(1);
    expect(vm.overBudgetCategories[0].overBy).toBe(40);
  });
});
