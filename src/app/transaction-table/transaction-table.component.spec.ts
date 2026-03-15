import { TestBed } from '@angular/core/testing';
import { MatOptionSelectionChange } from '@angular/material/core';

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
    component = new TransactionTableComponent(dbService, null as any, null as any);
  });

  it('should compile', () => {
    expect(component).toBeTruthy();
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
