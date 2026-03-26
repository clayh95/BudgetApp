import { Component, OnInit, ViewChild, Inject, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
// import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import { TransactionTableDataSource } from './transaction-table-datasource';
import { DbService } from '../core/db.service';
import { Observable, BehaviorSubject } from '../../../node_modules/rxjs';
import { collectionType, ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { getIcon, IVendorLogoRule } from '../core/utilities';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component'
import { rowsEnterLeave, rowsColor } from '../animations/template.animations';
import { SharedModule } from '../shared/shared.module';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';

interface IVendorSuggestion {
  name: string;
  logoUrl: string;
}

type TransactionSearchSuggestion =
  | { type: 'category'; category: ICategory }
  | { type: 'vendor'; vendor: IVendorSuggestion };

export interface ITransactionRouteInitState {
  pending?: boolean;
  startingBalances?: boolean;
  uncategorized?: boolean;
  category?: string;
  vendor?: string;
  search?: string;
  page?: number;
  sort?: 'date' | 'amount' | 'description' | 'category' | 'notes';
  dir?: 'asc' | 'desc';
}

function parseBool(value: string | null): boolean | undefined {
  if (value === null) { return undefined; }
  const normalized = value.toLowerCase();
  if (normalized === 'true') { return true; }
  if (normalized === 'false') { return false; }
  return undefined;
}

export function parseTransactionRouteInitState(params: { get: (name: string) => string | null }): ITransactionRouteInitState {
  const state: ITransactionRouteInitState = {};
  const pending = parseBool(params.get('pending'));
  if (pending !== undefined) {
    state.pending = pending;
  }

  const startingBalances = parseBool(params.get('startingBalances'));
  if (startingBalances !== undefined) {
    state.startingBalances = startingBalances;
  }

  const uncategorized = parseBool(params.get('uncategorized'));
  if (uncategorized !== undefined) {
    state.uncategorized = uncategorized;
  }

  const category = params.get('category');
  if (category !== null && category.trim().length > 0) {
    state.category = category.trim();
  }

  const vendor = params.get('vendor');
  if (vendor !== null && vendor.trim().length > 0) {
    state.vendor = vendor.trim();
  }

  const search = params.get('search');
  if (search !== null) {
    state.search = search;
  }

  const pageParam = params.get('page');
  if (pageParam !== null) {
    const page = Number(pageParam);
    if (Number.isInteger(page) && page >= 0) {
      state.page = page;
    }
  }

  const sort = params.get('sort');
  const validSort = ['date', 'amount', 'description', 'category', 'notes'];
  if (sort && validSort.includes(sort)) {
    state.sort = sort as ITransactionRouteInitState['sort'];
  }

  const dir = params.get('dir');
  if (dir === 'asc' || dir === 'desc') {
    state.dir = dir;
  }

  return state;
}

@Component({
  selector: 'app-transaction-table',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss'],
  animations: [rowsEnterLeave, rowsColor]
})
export class TransactionTableComponent implements AfterViewInit  {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;
  @ViewChild('searchInput', { static: false }) searchInput: ElementRef<HTMLInputElement>;
  dataSource: TransactionTableDataSource;
  displayedColumns = ['id', 'date', 'info', 'amount', 'description', 'notes', 'category'];
  filter = new BehaviorSubject<string>("");
  bShowPending = new BehaviorSubject<boolean>(false);
  bShowStartingBalances = new BehaviorSubject<boolean>(false);
  bOnlyUncategorized = new BehaviorSubject<boolean>(false);
  categoryFilter = new BehaviorSubject<string>('');
  vendorFilter = new BehaviorSubject<string>('');
  searchValue: string = "";
  searchFocused = false;
  searchPanelOpen = false;

  constructor(public Tsvc: DbService,
              public dialog: MatDialog,
              private route: ActivatedRoute) {

  }
  ngAfterViewInit(): void {
    this.dataSource = new TransactionTableDataSource(this.paginator, 
      this.sort, 
      this.Tsvc,
      this.filter,
      this.bShowPending,
      this.bShowStartingBalances,
      this.bOnlyUncategorized,
      this.categoryFilter,
      this.vendorFilter);
    this.sort.direction = "desc";
    this.sort.active = "date";

    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      const state = parseTransactionRouteInitState(params);
      this.applyRouteInitState(state);
    });
  }

  applyRouteInitState(state: ITransactionRouteInitState) {
    if (state.pending !== undefined) {
      this.bShowPending.next(state.pending);
    }
    if (state.startingBalances !== undefined) {
      this.bShowStartingBalances.next(state.startingBalances);
    }
    if (state.uncategorized !== undefined) {
      this.bOnlyUncategorized.next(state.uncategorized);
    }
    if (state.category !== undefined) {
      this.categoryFilter.next(state.category);
    }
    if (state.vendor !== undefined) {
      this.vendorFilter.next(state.vendor);
    }
    if (state.search !== undefined) {
      this.searchValue = state.search;
      this.applyFilter(this.searchValue);
    }

    if (state.sort !== undefined || state.dir !== undefined) {
      if (state.sort !== undefined) {
        this.sort.active = state.sort;
      }
      if (state.dir !== undefined) {
        this.sort.direction = state.dir;
      }
      this.sort.sortChange.emit({ active: this.sort.active, direction: this.sort.direction } as Sort);
    }

    if (state.page !== undefined) {
      const previous = this.paginator.pageIndex;
      this.paginator.pageIndex = state.page;
      const pageEvent: PageEvent = {
        pageIndex: this.paginator.pageIndex,
        previousPageIndex: previous,
        pageSize: this.paginator.pageSize,
        length: this.paginator.length
      };
      this.paginator.page.emit(pageEvent);
    }
  }

  updateValueOnChange(newValue: string, id: string, columnName: string) {
    let t = <ITransaction>this.Tsvc.transactions.getValue().filter(t => t.id === id)[0];
    if (newValue === t[columnName]) { return; }
    let update = {};
    update[columnName] = newValue;
    this.Tsvc.updateDocument(id, collectionType.transactions, update);
  }

  addTransaction() {
    let t = <ITransaction>{date:"", description:"", amount: 0, category:"", notes: "", status:ITransactionStatus.posted}
    const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1600px', maxWidth:'90vw', data: [t], autoFocus: false})
  }

  editTransaction(t:ITransaction) {
    this.Tsvc.getTransactionsForEdit(t).then(modalData => {
      const dialogRef = this.dialog.open(
        AddTransactionComponent, 
        {width:'1600px', maxWidth:'90vw', data: modalData, autoFocus: false}
      );
    });
  }

  applyFilter(filterValue: string) {
    this.resetPageIndex();
    this.filter.next(filterValue.trim().toLowerCase())
  }

  onSearchInput(value: string) {
    this.searchValue = value || '';
    this.applyFilter(this.searchValue);
  }

  onSearchFocus() {
    this.searchFocused = true;
  }

  onSearchBlur() {
    this.searchFocused = false;
  }

  onSearchPanelOpened() {
    this.searchPanelOpen = true;
  }

  onSearchPanelClosed() {
    this.searchPanelOpen = false;
  }

  focusSearchInput() {
    if (!this.searchInput?.nativeElement) { return; }
    this.searchInput.nativeElement.focus();
  }

  onClearSearch() {
    this.searchValue = '';
    this.applyFilter(this.searchValue);
  }

  onCategoryOptionSelected(category: ICategory) {
    this.resetPageIndex();
    this.categoryFilter.next(category.name);
    this.searchValue = '';
    this.applyFilter(this.searchValue);
  }

  onVendorOptionSelected(vendor: IVendorSuggestion) {
    this.resetPageIndex();
    this.vendorFilter.next(vendor.name);
    this.searchValue = '';
    this.applyFilter(this.searchValue);
  }

  get showSearchHints(): boolean {
    const hasSearchValue = (this.searchValue || '').trim().length > 0;
    return (this.searchFocused || this.searchPanelOpen) && !hasSearchValue;
  }

  get suggestedCategories(): ICategory[] {
    const query = (this.searchValue || '').toLowerCase().trim();
    const categories = this.Tsvc.categories.getValue() || [];

    if (!query) { return categories; }

    return categories.filter((category) =>
      (category.name || '').toLowerCase().indexOf(query) >= 0
    );
  }

  get suggestedVendors(): IVendorSuggestion[] {
    const query = (this.searchValue || '').toLowerCase().trim();
    const vendors = this.getMappedVendors();

    if (!query) { return vendors; }

    return vendors.filter((vendor) =>
      (vendor.name || '').toLowerCase().indexOf(query) >= 0
    );
  }

  get searchSuggestions(): TransactionSearchSuggestion[] {
    const categorySuggestions = this.suggestedCategories.map((category) => ({ type: 'category' as const, category }));
    const vendorSuggestions = this.suggestedVendors.map((vendor) => ({ type: 'vendor' as const, vendor }));
    return [...categorySuggestions, ...vendorSuggestions];
  }

  get activeCategory(): ICategory | null {
    const categoryFilter = (this.categoryFilter.getValue() || '').trim().toLowerCase();
    if (!categoryFilter) { return null; }
    const categories = this.Tsvc.categories.getValue() || [];
    return categories.find(category => (category.name || '').toLowerCase() === categoryFilter) ?? null;
  }

  get activeVendor(): IVendorSuggestion | null {
    const vendorFilter = (this.vendorFilter.getValue() || '').trim().toLowerCase();
    if (!vendorFilter) { return null; }
    const vendors = this.getMappedVendors();
    return vendors.find(vendor => (vendor.name || '').toLowerCase() === vendorFilter) ?? null;
  }

  clearCategoryFilter() {
    this.categoryFilter.next('');
    this.resetPageIndex();
  }

  clearVendorFilter() {
    this.vendorFilter.next('');
    this.resetPageIndex();
  }

  private getMappedVendors(): IVendorSuggestion[] {
    const vendorMappings = this.Tsvc.vendorMappings.getValue() || [];
    const byName = new Map<string, IVendorSuggestion>();
    vendorMappings.forEach((mapping: IVendorLogoRule) => {
      const vendorName = `${mapping?.vendorName || ''}`.trim();
      const logoUrl = `${mapping?.logoUrl || ''}`.trim();
      const key = vendorName.toLowerCase();
      if (!vendorName || byName.has(key)) { return; }
      byName.set(key, { name: vendorName, logoUrl });
    });
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  togglePendingVisibility() {
    this.resetPageIndex();
    this.bShowPending.next(!this.bShowPending.getValue());
  }

  toggleStartingBalanceVisibility() {
    this.resetPageIndex();
    this.bShowStartingBalances.next(!this.bShowStartingBalances.getValue());
  }

  toggleUncategorizedFilter() {
    this.resetPageIndex();
    this.bOnlyUncategorized.next(!this.bOnlyUncategorized.getValue());
  }

  resetPageIndex() {
    if (this.paginator.pageIndex != 0) this.paginator.pageIndex = 0;
  }

  trackById(index, item) {
    return item.id;
  }

  trackBySearchSuggestion(index: number, suggestion: TransactionSearchSuggestion): string {
    if (suggestion.type === 'category') {
      return `category:${suggestion.category.id || suggestion.category.name}`;
    }
    return `vendor:${(suggestion.vendor.name || '').toLowerCase()}`;
  }

  rowsColorDone(row) {
    if (row.changeAction) {
      row.changeAction = '';
    }
  }

  getTotal():number {
    if (this.dataSource) {
      return this.dataSource.total;
    }
    return null;
  }

  getTotalColor():string {
    if (this.dataSource) {
      return this.dataSource.total > -1 ? '#3a8d5f' : 'orangered';
    }
    return null;
  }

  getIconFromUtils(description:string):string {
    return getIcon(description, this.Tsvc.vendorMappings.getValue() || []);
  }

}
