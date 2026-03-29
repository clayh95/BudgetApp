import { DashboardComponent, buildDashboardViewModel, normalizeCategoryKey } from './dashboard.component';

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

  it('returns all vendors with positive spend sorted by spend descending', () => {
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

    expect(vm.vendorCards.length).toBe(6);
    expect(vm.vendorCards.map(v => v.vendorName)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(vm.vendorCards.find(v => v.vendorName === 'Z')).toBeUndefined();
  });

  it('keeps watched vendors visible without spend and without mappings', () => {
    const vm = buildDashboardViewModel(
      [{ id: '1', name: 'Shopping', keywords: [], budgeted: 500, spent: 0, notes: '' }],
      [
        { id: 't1', date: '01/10/2026', amount: -110, description: 'Amazon', category: 'Shopping', notes: '', status: 'Posted' }
      ] as any,
      '01/2026',
      [],
      ['amazon', 'ghost vendor'],
      [
        { pattern: '^Amazon$', vendorName: 'Amazon', logoUrl: 'a.png' }
      ]
    );

    expect(vm.vendorCards).toEqual([
      jasmine.objectContaining({ vendorName: 'Amazon', isWatched: true, hasSpend: true, spent: 110, usesFallbackIcon: false }),
      jasmine.objectContaining({ vendorName: 'Ghost Vendor', isWatched: true, hasSpend: false, spent: 0, usesFallbackIcon: true, sourceIndex: -1 })
    ]);
  });
});

describe('DashboardComponent query params', () => {
  it('routes vendor drill-down using vendor query param', () => {
    const result = (DashboardComponent.prototype as any).getTransactionQueryParamsForVendor('Walmart');
    expect(result).toEqual({ vendor: 'Walmart' });
  });
});

describe('DashboardComponent vendor grid', () => {
  function createComponent(dialogOverrides: any = {}): DashboardComponent {
    return new DashboardComponent(
      {} as any,
      { open: jasmine.createSpy('open'), ...dialogOverrides } as any,
      {} as any,
      { markForCheck: () => undefined } as any
    );
  }

  it('filters vendor grid items by vendor name', () => {
    const component = createComponent();
    component.viewModel = {
      vendorCards: [
        { vendorName: 'Amazon', displayName: 'Amazon', logoUrl: 'a.png', spent: 30, isWatched: false, hasSpend: true, sourceIndex: 0, usesFallbackIcon: false },
        { vendorName: 'Target', displayName: 'Target', logoUrl: 't.png', spent: 20, isWatched: false, hasSpend: true, sourceIndex: 1, usesFallbackIcon: false }
      ]
    } as any;

    component.onVendorSearchChange('tar');

    expect(component.getVendorGridItems().map(item => item.vendorName)).toEqual(['Target']);
  });

  it('sorts vendor grid items by name', () => {
    const component = createComponent();
    component.viewModel = {
      vendorCards: [
        { vendorName: 'Target', displayName: 'Target', logoUrl: 't.png', spent: 20, isWatched: false, hasSpend: true, sourceIndex: 0, usesFallbackIcon: false },
        { vendorName: 'Amazon', displayName: 'Amazon', logoUrl: 'a.png', spent: 30, isWatched: false, hasSpend: true, sourceIndex: 1, usesFallbackIcon: false }
      ]
    } as any;

    component.setVendorSortMode('name');

    expect(component.getVendorGridItems().map(item => item.vendorName)).toEqual(['Amazon', 'Target']);
  });

  it('pins watched vendors above other vendors while sorting by spend', () => {
    const component = createComponent();
    component.viewModel = {
      vendorCards: [
        { vendorName: 'Target', displayName: 'Target', logoUrl: 't.png', spent: 20, isWatched: false, hasSpend: true, sourceIndex: 0, usesFallbackIcon: false },
        { vendorName: 'Amazon', displayName: 'Amazon', logoUrl: 'a.png', spent: 30, isWatched: true, hasSpend: true, sourceIndex: 1, usesFallbackIcon: false },
        { vendorName: 'Whole Foods', displayName: 'Whole Foods', logoUrl: '', spent: 0, isWatched: true, hasSpend: false, sourceIndex: -1, usesFallbackIcon: true }
      ]
    } as any;

    expect(component.getVendorGridItems().map(item => item.vendorName)).toEqual(['Amazon', 'Whole Foods', 'Target']);
  });

  it('applies name sort within watched and non-watched blocks', () => {
    const component = createComponent();
    component.viewModel = {
      vendorCards: [
        { vendorName: 'Target', displayName: 'Target', logoUrl: 't.png', spent: 10, isWatched: false, hasSpend: true, sourceIndex: 0, usesFallbackIcon: false },
        { vendorName: 'Whole Foods', displayName: 'Whole Foods', logoUrl: 'w.png', spent: 40, isWatched: true, hasSpend: true, sourceIndex: 1, usesFallbackIcon: false },
        { vendorName: 'Amazon', displayName: 'Amazon', logoUrl: 'a.png', spent: 0, isWatched: true, hasSpend: false, sourceIndex: -1, usesFallbackIcon: false },
        { vendorName: 'Best Buy', displayName: 'Best Buy', logoUrl: 'b.png', spent: 30, isWatched: false, hasSpend: true, sourceIndex: 2, usesFallbackIcon: false }
      ]
    } as any;

    component.setVendorSortMode('name');

    expect(component.getVendorGridItems().map(item => item.vendorName)).toEqual(['Amazon', 'Whole Foods', 'Best Buy', 'Target']);
  });

  it('keeps watched-first grouping when filtering search results', () => {
    const component = createComponent();
    component.viewModel = {
      vendorCards: [
        { vendorName: 'Costco', displayName: 'Costco', logoUrl: 'c.png', spent: 20, isWatched: false, hasSpend: true, sourceIndex: 0, usesFallbackIcon: false },
        { vendorName: 'Corner Store', displayName: 'Corner Store', logoUrl: '', spent: 0, isWatched: true, hasSpend: false, sourceIndex: -1, usesFallbackIcon: true },
        { vendorName: 'Coffee Shop', displayName: 'Coffee Shop', logoUrl: 'co.png', spent: 15, isWatched: false, hasSpend: true, sourceIndex: 1, usesFallbackIcon: false }
      ]
    } as any;

    component.onVendorSearchChange('co');

    expect(component.getVendorGridItems().map(item => item.vendorName)).toEqual(['Corner Store', 'Costco', 'Coffee Shop']);
  });

  it('routes mapped vendor edit through the existing edit modal flow', () => {
    const component = createComponent();
    component.viewModel = {
      vendorMappings: [
        { pattern: '^Amazon$', vendorName: 'Amazon', logoUrl: 'a.png' }
      ]
    } as any;
    spyOn(component, 'openEditVendorMappingModal');

    component.openVendorCardEdit({
      vendorName: 'Amazon',
      displayName: 'Amazon',
      logoUrl: 'a.png',
      spent: 30,
      isWatched: false,
      hasSpend: true,
      sourceIndex: 0,
      usesFallbackIcon: false
    });

    expect(component.openEditVendorMappingModal).toHaveBeenCalledWith(component.viewModel.vendorMappings[0], 0);
  });

  it('routes unmapped watched vendor edit through the add-prefilled modal flow', () => {
    const afterClosed = jasmine.createSpy('afterClosed').and.returnValue({ subscribe: () => undefined });
    const component = createComponent({
      open: jasmine.createSpy('open').and.returnValue({ afterClosed })
    });

    component.openVendorCardEdit({
      vendorName: 'Ghost Vendor',
      displayName: 'Ghost Vendor',
      logoUrl: '',
      spent: 0,
      isWatched: true,
      hasSpend: false,
      sourceIndex: -1,
      usesFallbackIcon: true
    });

    expect(component.dialog.open).toHaveBeenCalled();
    expect((component.dialog.open as jasmine.Spy).calls.mostRecent().args[1].data).toEqual(
      jasmine.objectContaining({
        initialVendorName: 'Ghost Vendor',
        watched: true
      })
    );
  });
});
