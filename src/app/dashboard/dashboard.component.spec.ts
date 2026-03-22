import { buildDashboardViewModel, normalizeCategoryKey } from './dashboard.component';

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
    expect(vm.overBudgetCategories[0].remaining).toBe(-40);
  });

  it('resolves watched categories by normalized names', () => {
    const vm = buildDashboardViewModel(
      [{ id: '1', name: 'Groceries', keywords: [], budgeted: 200, spent: 0, notes: '' }],
      [],
      '01/2026',
      ['  GROCERIES  ', 'utilities']
    );

    expect(vm.watchedCategoriesResolved.length).toBe(1);
    expect(vm.watchedCategoriesResolved[0].category.name).toBe('Groceries');
    expect(vm.watchedCategoriesResolved[0].remaining).toBe(200);
    expect(vm.watchedCategoriesMissing.length).toBe(1);
    expect(vm.watchedCategoriesMissing[0].key).toBe('utilities');
  });

  it('normalizes watch keys', () => {
    expect(normalizeCategoryKey('  Groceries  ')).toBe('groceries');
  });

  it('only builds top spending vendors from watched keys and mapped transactions', () => {
    const vm = buildDashboardViewModel(
      [{ id: '1', name: 'Shopping', keywords: [], budgeted: 200, spent: 0, notes: '' }],
      [
        { id: 't1', date: '01/10/2026', amount: -100, description: 'TARGET T-123', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't2', date: '01/10/2026', amount: -80, description: 'STARBUCKS #123', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't3', date: '01/10/2026', amount: -75, description: 'UNMAPPED SHOP', category: 'Shopping', notes: '', status: 'Posted' }
      ] as any,
      '01/2026',
      [],
      ['target', 'walmart'],
      [
        { pattern: 'target', vendorName: 'Target', logoUrl: 'target.png' },
        { pattern: 'starbucks', vendorName: 'Starbucks', logoUrl: 'starbucks.png' }
      ]
    );

    expect(vm.topSpendingVendors.length).toBe(1);
    expect(vm.topSpendingVendors[0].vendorName).toBe('Target');
    expect(vm.topSpendingVendors[0].spent).toBe(100);
    expect(vm.topSpendingVendors.find(v => v.vendorName === 'Starbucks')).toBeUndefined();
  });

  it('excludes watched vendors with zero spend and keeps top vendors sorted and capped', () => {
    const vm = buildDashboardViewModel(
      [{ id: '1', name: 'Shopping', keywords: [], budgeted: 500, spent: 0, notes: '' }],
      [
        { id: 't1', date: '01/10/2026', amount: -110, description: 'A', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't2', date: '01/10/2026', amount: -95, description: 'B', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't3', date: '01/10/2026', amount: -85, description: 'C', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't4', date: '01/10/2026', amount: -70, description: 'D', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't5', date: '01/10/2026', amount: -60, description: 'E', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't6', date: '01/10/2026', amount: -40, description: 'F', category: 'Shopping', notes: '', status: 'Posted' },
        { id: 't7', date: '01/10/2026', amount: 60, description: 'Z', category: 'Shopping', notes: '', status: 'Posted' }
      ] as any,
      '01/2026',
      [],
      ['a', 'b', 'c', 'd', 'e', 'f', 'z'],
      [
        { pattern: '^A$', vendorName: 'A', logoUrl: '' },
        { pattern: '^B$', vendorName: 'B', logoUrl: '' },
        { pattern: '^C$', vendorName: 'C', logoUrl: '' },
        { pattern: '^D$', vendorName: 'D', logoUrl: '' },
        { pattern: '^E$', vendorName: 'E', logoUrl: '' },
        { pattern: '^F$', vendorName: 'F', logoUrl: '' },
        { pattern: '^Z$', vendorName: 'Z', logoUrl: '' }
      ]
    );

    expect(vm.topSpendingVendors.length).toBe(5);
    expect(vm.topSpendingVendors.map(v => v.vendorName)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(vm.topSpendingVendors.find(v => v.vendorName === 'F')).toBeUndefined();
    expect(vm.topSpendingVendors.find(v => v.vendorName === 'Z')).toBeUndefined();
  });
});
