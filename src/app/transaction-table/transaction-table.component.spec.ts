import { TestBed } from '@angular/core/testing';
import { MatOptionSelectionChange } from '@angular/material/core';
import { ICategory } from '../core/dataTypes';

import { TransactionTableComponent } from './transaction-table.component';
import { DbService } from '../core/db.service';

describe('TransactionTableComponent', () => {
  let component: TransactionTableComponent;
  let dbService: DbService;

  function makeSelectionChange(isUserInput: boolean): MatOptionSelectionChange<string> {
    return { isUserInput } as MatOptionSelectionChange<string>;
  }

  beforeEach(() => {
    dbService = TestBed.inject(DbService);
    (dbService.transactions as any).next([{ id: 'txn-1', category: 'Utilities' }]);
    (dbService.categories as any).next([
      { id: 'c1', name: 'Groceries', keywords: ['food'], budgeted: 250, spent: 0, notes: '' },
      { id: 'c2', name: 'Income', keywords: ['salary'], budgeted: 1000, spent: 0, notes: '' },
      { id: 'c3', name: 'Utilities', keywords: ['power'], budgeted: 150, spent: 0, notes: '' }
    ] as ICategory[]);
    component = new TransactionTableComponent(dbService, null as any, null as any);
    component.paginator = { pageIndex: 3 } as any;
  });

  it('should compile', () => {
    expect(component).toBeTruthy();
  });

  it('returns all categories when search is empty', () => {
    component.searchValue = '';
    expect(component.suggestedCategories.map(c => c.name))
      .toEqual(['Groceries', 'Income', 'Utilities']);
  });

  it('filters suggested categories by search term', () => {
    component.searchValue = 'util';
    expect(component.suggestedCategories.map(c => c.name)).toEqual(['Utilities']);

    component.searchValue = 'in';
    expect(component.suggestedCategories.map(c => c.name)).toEqual(['Income']);
  });

  it('tracks search hint visibility from focus and panel state', () => {
    expect(component.showSearchHints).toBe(false);

    component.searchValue = '';
    component.onSearchFocus();
    expect(component.showSearchHints).toBe(true);

    component.onSearchPanelOpened();
    expect(component.showSearchHints).toBe(true);

    component.onSearchPanelClosed();
    component.onSearchBlur();
    expect(component.showSearchHints).toBe(false);

    component.searchValue = '';
    component.onSearchFocus();
    expect(component.showSearchHints).toBe(true);
    component.onClearSearch();
    component.onSearchInput('foo');
    expect(component.showSearchHints).toBe(false);
  });

  it('clears category filter and resets pagination', () => {
    const nextSpy = vi.spyOn(component.categoryFilter, 'next');
    component.categoryFilter.next('Groceries');
    component.paginator.pageIndex = 7;

    component.clearCategoryFilter();

    expect(nextSpy).toHaveBeenCalledWith('');
    expect(component.paginator.pageIndex).toBe(0);
    expect(component.categoryFilter.getValue()).toBe('');
  });

  it('applies search input and clears search with filter updates', () => {
    const filterSpy = vi.spyOn(component.filter, 'next');
    component.paginator.pageIndex = 4;
    component.onSearchInput('  walmart  ');

    expect(component.searchValue).toBe('  walmart  ');
    expect(component.paginator.pageIndex).toBe(0);
    expect(filterSpy).toHaveBeenCalledWith('walmart');

    component.onClearSearch();

    expect(component.searchValue).toBe('');
    expect(component.paginator.pageIndex).toBe(0);
    expect(filterSpy).toHaveBeenCalledWith('');
  });

  it('does not update category when option selection is not user input', () => {
    const updateSpy = vi.spyOn(component, 'updateValueOnChange');

    component.onCategoryOptionSelection(makeSelectionChange(false), 'txn-1', 'Groceries');

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('updates category when option selection is user input', () => {
    const updateSpy = vi.spyOn(component, 'updateValueOnChange');

    component.onCategoryOptionSelection(makeSelectionChange(true), 'txn-1', 'Groceries');

    expect(updateSpy).toHaveBeenCalledWith('Groceries', 'txn-1', 'category');
  });
});
