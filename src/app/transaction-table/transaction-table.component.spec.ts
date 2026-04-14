import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TransactionTableComponent } from './transaction-table.component';
import { DbService } from '../core/db.service';

class DbServiceStub {
  transactions = new BehaviorSubject<any[]>([]);
  categories = new BehaviorSubject<any[]>([]);
  vendorMappings = new BehaviorSubject<any[]>([]);
  getMonthYearValue = vi.fn().mockReturnValue('01/2026');
  updateDocument = vi.fn();
  getTransactionsForEdit = vi.fn().mockResolvedValue([]);
}

describe('TransactionTableComponent', () => {
  let component: TransactionTableComponent;
  let db: DbServiceStub;

  beforeEach(() => {
    db = new DbServiceStub();
    component = new TransactionTableComponent(
      db as unknown as DbService,
      { open: vi.fn() } as unknown as MatDialog,
      { queryParamMap: of(convertToParamMap({})) } as unknown as ActivatedRoute
    );
    component.paginator = { pageIndex: 0 } as any;
  });

  it('should compile', () => {
    expect(component).toBeTruthy();
  });

  it('builds category and vendor suggestions from search input', () => {
    db.categories.next([
      { id: '1', name: 'Groceries', keywords: [], budgeted: 0, spent: 0, notes: '', emoji: '🥦' },
      { id: '2', name: 'Utilities', keywords: [], budgeted: 0, spent: 0, notes: '' }
    ]);
    db.vendorMappings.next([
      { pattern: 'wal-?mart', vendorName: 'Walmart', logoUrl: 'assets/images/walmart-logo.png' },
      { pattern: 'target', vendorName: 'Target', logoUrl: 'assets/images/target-logo.png' }
    ]);

    component.searchValue = 'wa';
    const suggestions = component.searchSuggestions;

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].type).toBe('vendor');
    if (suggestions[0].type === 'vendor') {
      expect(suggestions[0].vendor.name).toBe('Walmart');
    }
  });

  it('keeps one category chip and one vendor chip active at the same time', () => {
    component.onCategoryOptionSelected({ id: '1', name: 'Groceries', keywords: [], budgeted: 0, spent: 0, notes: '' });
    component.onVendorOptionSelected({ name: 'Walmart', logoUrl: 'assets/images/walmart-logo.png' });

    expect(component.categoryFilter.getValue()).toBe('Groceries');
    expect(component.vendorFilter.getValue()).toBe('Walmart');

    component.clearCategoryFilter();
    expect(component.categoryFilter.getValue()).toBe('');
    expect(component.vendorFilter.getValue()).toBe('Walmart');
  });
});
