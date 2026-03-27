import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { DbService } from '../core/db.service';
import { collectionType, ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { getVendorMatch, IVendorLogoRule, parseMoney } from '../core/utilities';
import { SharedModule } from '../shared/shared.module';
import { MatDialog } from '@angular/material/dialog';
import { DashboardWatchCategoryModalComponent } from '../dashboard-watch-category-modal/dashboard-watch-category-modal.component';
import { DashboardVendorMappingModalComponent, DashboardVendorMappingModalResult } from '../dashboard-vendor-mapping-modal/dashboard-vendor-mapping-modal.component';

export interface IDashboardStats {
  unbudgeted: number;
  pendingTotal: number;
  uncategorizedNonPendingCount: number;
  overBudgetCount: number;
}

export interface IOverBudgetCategory {
  category: ICategory;
  spent: number;
  overBy: number;
  remaining: number;
}

export interface ITopCategorySpend {
  category: ICategory;
  spent: number;
}

export interface ITopVendorSpend {
  vendorName: string;
  logoUrl: string;
  spent: number;
}

export type VendorSortMode = 'spend' | 'name';

export interface IVendorCardItem {
  vendorName: string;
  displayName: string;
  logoUrl: string;
  spent: number;
  isWatched: boolean;
  hasSpend: boolean;
  sourceIndex: number;
  usesFallbackIcon: boolean;
}

export interface IWatchedCategoryResolved {
  category: ICategory;
  spent: number;
  remaining: number;
}

export interface IWatchedCategoryMissing {
  key: string;
  displayName: string;
}

export interface IDashboardViewModel {
  stats: IDashboardStats;
  overBudgetCategories: IOverBudgetCategory[];
  topSpendingCategories: ITopCategorySpend[];
  watchedCategoriesResolved: IWatchedCategoryResolved[];
  watchedCategoriesMissing: IWatchedCategoryMissing[];
  vendorMappings: IVendorLogoRule[];
  vendorCards: IVendorCardItem[];
}

function roundMoney(value: number): number {
  return +((value ?? 0).toFixed(2));
}

export function normalizeCategoryKey(value: string): string {
  return (value || '').trim().toLowerCase();
}

export function normalizeVendorKey(value: string): string {
  return (value || '').trim().toLowerCase();
}

export function buildDashboardViewModel(
  categories: ICategory[],
  transactions: ITransaction[],
  monthYear: string,
  watchedCategoryKeys: string[] = [],
  watchedVendorKeys: string[] = [],
  vendorMappings: IVendorLogoRule[] = []
): IDashboardViewModel {
  void monthYear;
  const normalizedWatchKeys = Array.from(new Set((watchedCategoryKeys || [])
    .map(k => normalizeCategoryKey(k))
    .filter(k => k.length > 0)));
  const normalizedWatchedVendorKeys = Array.from(new Set((watchedVendorKeys || [])
    .map(k => normalizeVendorKey(k))
    .filter(k => k.length > 0)));

  const postedTransactions = transactions.filter(t => (t.status || '').toUpperCase() !== ITransactionStatus.pending.toUpperCase());
  const pendingTransactions = transactions
    .filter(t => (t.status || '').toUpperCase() === ITransactionStatus.pending.toUpperCase())
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const uncategorizedNonPendingTransactions = postedTransactions
    .filter(t => (t.category || '').trim() === '');

  const nonIncomeCategories = categories.filter(c => (c.name || '').toUpperCase() !== 'INCOME');
  const categoryByName = new Map(nonIncomeCategories.map(c => [c.name, c]));
  const spentByCategory = new Map<string, number>();
  const spentByVendor = new Map<string, { vendorName: string; logoUrl: string; spent: number }>();

  postedTransactions.forEach(t => {
    if ((t.category || '').toUpperCase() === 'INCOME') {
      return;
    }
    const spendDelta = -1 * +t.amount;

    const categoryName = t.category || '';
    if (categoryByName.has(categoryName)) {
      const existing = spentByCategory.get(categoryName) || 0;
      spentByCategory.set(categoryName, existing + spendDelta);
    }

    const vendorMatch = getVendorMatch(t.description, vendorMappings);
    if (!vendorMatch || t.description.endsWith('Starting Balance')) {
      return;
    }
    const vendorName = (vendorMatch.vendorName || '').trim();
    const vendorKey = normalizeVendorKey(vendorName);
    if (vendorKey) {
      const existingVendor = spentByVendor.get(vendorKey);
      const vendorLogo = vendorMatch?.logoUrl || '';
      if (existingVendor) {
        existingVendor.spent += spendDelta;
        if (!existingVendor.logoUrl) {
          existingVendor.logoUrl = vendorLogo;
        }
      } else {
        spentByVendor.set(vendorKey, {
          vendorName,
          logoUrl: vendorLogo,
          spent: spendDelta
        });
      }
    }
  });

  const overBudgetCategories = nonIncomeCategories
    .map(category => {
      const spent = roundMoney(spentByCategory.get(category.name) || 0);
      return {
        category,
        spent,
        overBy: roundMoney(spent - (category.budgeted || 0)),
        remaining: roundMoney((category.budgeted || 0) - spent)
      };
    })
    .filter(row => row.overBy > 0)
    .sort((a, b) => b.overBy - a.overBy);

  const topSpendingCategories = nonIncomeCategories
    .map(category => ({
      category,
      spent: roundMoney(spentByCategory.get(category.name) || 0)
    }))
    .filter(row => row.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  const vendorSpendItems = Array.from(spentByVendor.values())
    .filter((row): row is ITopVendorSpend => !!row)
    .filter(row => row.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const mappingIndexByVendorKey = new Map<string, number>();
  vendorMappings.forEach((mapping, index) => {
    const key = normalizeVendorKey(mapping?.vendorName || '');
    if (key.length > 0 && !mappingIndexByVendorKey.has(key)) {
      mappingIndexByVendorKey.set(key, index);
    }
  });

  const categoryByNormalizedName = new Map<string, ICategory>();
  categories.forEach(c => {
    const key = normalizeCategoryKey(c.name);
    if (key.length > 0 && !categoryByNormalizedName.has(key)) {
      categoryByNormalizedName.set(key, c);
    }
  });

  const watchedCategoriesResolved: IWatchedCategoryResolved[] = [];
  const watchedCategoriesMissing: IWatchedCategoryMissing[] = [];
  normalizedWatchKeys.forEach(key => {
    const category = categoryByNormalizedName.get(key);
    if (category) {
      const spent = roundMoney(spentByCategory.get(category.name) || 0);
      watchedCategoriesResolved.push({
        category,
        spent,
        remaining: roundMoney((category.budgeted || 0) - spent)
      });
    } else {
      watchedCategoriesMissing.push({
        key,
        displayName: key.replace(/\b\w/g, char => char.toUpperCase())
      });
    }
  });

  const vendorCardByKey = new Map<string, IVendorCardItem>();
  vendorSpendItems.forEach(item => {
    const key = normalizeVendorKey(item.vendorName);
    vendorCardByKey.set(key, {
      vendorName: item.vendorName,
      displayName: item.vendorName,
      logoUrl: item.logoUrl,
      spent: roundMoney(item.spent),
      isWatched: normalizedWatchedVendorKeys.includes(key),
      hasSpend: true,
      sourceIndex: mappingIndexByVendorKey.get(key) ?? -1,
      usesFallbackIcon: !item.logoUrl
    });
  });

  normalizedWatchedVendorKeys.forEach(key => {
    if (vendorCardByKey.has(key)) {
      const existing = vendorCardByKey.get(key);
      if (existing) {
        existing.isWatched = true;
      }
      return;
    }
    const sourceIndex = mappingIndexByVendorKey.get(key) ?? -1;
    const mapping = sourceIndex >= 0 ? vendorMappings[sourceIndex] : undefined;
    const displayName = (mapping?.vendorName || '').trim() || key.replace(/\b\w/g, char => char.toUpperCase());
    const logoUrl = (mapping?.logoUrl || '').trim();
    vendorCardByKey.set(key, {
      vendorName: displayName,
      displayName,
      logoUrl,
      spent: 0,
      isWatched: true,
      hasSpend: false,
      sourceIndex,
      usesFallbackIcon: !logoUrl
    });
  });

  const actualIncome = roundMoney(
    postedTransactions
      .filter(t => (t.category || '').toUpperCase() === 'INCOME')
      .reduce((sum, t) => sum + +t.amount, 0)
  );
  const totalBudgeted = roundMoney(nonIncomeCategories.reduce((sum, c) => sum + +(c.budgeted || 0), 0));
  const unbudgeted = roundMoney(actualIncome - totalBudgeted);
  const pendingTotal = roundMoney(pendingTransactions.reduce((sum, t) => sum + +t.amount, 0));

  return {
    stats: {
      unbudgeted,
      pendingTotal,
      uncategorizedNonPendingCount: uncategorizedNonPendingTransactions.length,
      overBudgetCount: overBudgetCategories.length
    },
    overBudgetCategories,
    topSpendingCategories,
    watchedCategoriesResolved,
    watchedCategoriesMissing,
    vendorMappings: vendorMappings.slice(),
    vendorCards: Array.from(vendorCardByKey.values())
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dataSub: Subscription;

  viewModel: IDashboardViewModel = buildDashboardViewModel([], [], '', []);
  balances: Array<{ key: string; value: any }> = [];
  availableWatchOptions: ICategory[] = [];
  vendorSearch = '';
  vendorSortMode: VendorSortMode = 'spend';

  constructor(
    public service: DbService,
    public dialog: MatDialog,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.dataSub = combineLatest([
      this.service.categories,
      this.service.transactions,
      this.service.monthYear,
      this.service.dashboardPreferences,
      this.service.vendorMappings
    ]).subscribe(([categories, transactions, monthYear, preferences, vendorMappings]) => {
      this.zone.run(() => {
        const cats = categories || [];
        const trans = transactions || [];
        const my = monthYear || '';
        this.availableWatchOptions = cats
          .filter(c => (c.name || '').trim().length > 0 && (c.name || '').toUpperCase() !== 'INCOME')
          .sort((a, b) => a.name.localeCompare(b.name));
        this.viewModel = buildDashboardViewModel(
          cats,
          trans,
          my,
          preferences?.watchedCategoryKeys || [],
          preferences?.watchedVendorKeys || [],
          vendorMappings || []
        );
        this.cdr.markForCheck();
      });
    });
    this.loadBalances();
  }

  ngOnDestroy() {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }
  }

  async loadBalances() {
    const balances = await this.service.getBalances();
    const sortedBalances = balances.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
    this.zone.run(() => {
      this.balances = sortedBalances;
      this.cdr.markForCheck();
    });
  }

  updateSummaryNotes(value: string) {
    this.service.updateDocument(this.service.getMonthPKValue(), collectionType.monthsPK, { summary: value });
  }

  isCreditCardRisk(balance: { key: string; value: any }): boolean {
    if (!balance || balance.key !== 'Credit Card') {
      return false;
    }
    return (parseMoney(balance.value) ?? 0) > 0;
  }

  trackByCategoryId(index: number, item: IOverBudgetCategory | ITopCategorySpend) {
    return item.category.id;
  }

  trackByWatchedResolved(index: number, item: IWatchedCategoryResolved) {
    return item.category.id;
  }

  trackByWatchedMissing(index: number, item: IWatchedCategoryMissing) {
    return item.key;
  }

  trackByVendorGridItem(index: number, item: IVendorCardItem) {
    return `${normalizeVendorKey(item.vendorName)}:${item.sourceIndex >= 0 ? item.sourceIndex : index}`;
  }

  getTransactionQueryParamsForCategory(categoryName: string) {
    return { category: categoryName };
  }

  getSummaryQueryParamsForCategory(category: ICategory) {
    return { focusCategoryId: category.id, focusCategoryName: category.name };
  }

  getSummaryQueryParamsForSection(section: 'pending' | 'uncategorized') {
    return { focusSection: section };
  }

  getTransactionQueryParamsForVendor(vendorName: string) {
    return { vendor: vendorName };
  }

  openAddWatchedCategoryModal() {
    const watchedCategoryKeys = this.service.dashboardPreferences.getValue()?.watchedCategoryKeys || [];
    const categoryOptions = this.availableWatchOptions
      .map(c => c.name)
      .filter(name => !watchedCategoryKeys.includes(normalizeCategoryKey(name)));
    const dialogRef = this.dialog.open(DashboardWatchCategoryModalComponent, {
      width: '450px',
      maxWidth: '90vw',
      autoFocus: false,
      data: { categoryOptions }
    });
    dialogRef.afterClosed().subscribe((categoryName: string | undefined) => {
      if (!categoryName) { return; }
      this.addWatchedCategory(categoryName);
    });
  }

  openAddVendorMappingModal() {
    const dialogRef = this.dialog.open(DashboardVendorMappingModalComponent, {
      width: '520px',
      maxWidth: '90vw',
      autoFocus: false,
      data: { watched: false }
    });
    dialogRef.afterClosed().subscribe((result: DashboardVendorMappingModalResult | undefined) => {
      if (!result || result.action !== 'save') { return; }
      this.addVendor(result.mapping, result.watched);
    });
  }

  openEditVendorMappingModal(mapping: IVendorLogoRule, index: number) {
    const watchedVendorKeys = this.service.dashboardPreferences.getValue()?.watchedVendorKeys || [];
    const dialogRef = this.dialog.open(DashboardVendorMappingModalComponent, {
      width: '520px',
      maxWidth: '90vw',
      autoFocus: false,
      data: {
        mapping,
        index,
        watched: watchedVendorKeys.includes(normalizeVendorKey(mapping?.vendorName || ''))
      }
    });
    dialogRef.afterClosed().subscribe((result: DashboardVendorMappingModalResult | undefined) => {
      if (!result) { return; }
      if (result.action === 'save') {
        this.updateVendor(result.mapping, index, result.watched, mapping?.vendorName || '');
      } else if (result.action === 'delete') {
        this.removeVendorMapping(index, mapping?.vendorName || '');
      }
    });
  }

  openVendorCardEdit(item: IVendorCardItem) {
    if (item.sourceIndex >= 0) {
      this.openEditVendorMappingModal(this.viewModel.vendorMappings[item.sourceIndex], item.sourceIndex);
      return;
    }
    const dialogRef = this.dialog.open(DashboardVendorMappingModalComponent, {
      width: '520px',
      maxWidth: '90vw',
      autoFocus: false,
      data: {
        initialVendorName: item.displayName,
        watched: item.isWatched
      }
    });
    dialogRef.afterClosed().subscribe((result: DashboardVendorMappingModalResult | undefined) => {
      if (!result || result.action !== 'save') { return; }
      this.addVendor(result.mapping, result.watched);
    });
  }

  getVendorGridItems(): IVendorCardItem[] {
    const search = (this.vendorSearch || '').trim().toLowerCase();
    const sortByMode = (a: IVendorCardItem, b: IVendorCardItem) => {
      if (this.vendorSortMode === 'name') {
        return a.displayName.localeCompare(b.displayName);
      }
      return b.spent - a.spent || a.displayName.localeCompare(b.displayName);
    };
    const items = (this.viewModel?.vendorCards || [])
      .filter(item => {
        if (!search) { return true; }
        return (item?.displayName || '').toLowerCase().includes(search);
      })
      .sort((a, b) => {
        if (a.isWatched !== b.isWatched) {
          return a.isWatched ? -1 : 1;
        }
        return sortByMode(a, b);
      });

    return items;
  }

  onVendorSearchChange(value: string) {
    this.vendorSearch = value || '';
  }

  setVendorSortMode(mode: VendorSortMode) {
    this.vendorSortMode = mode;
  }

  async addWatchedCategory(categoryName: string) {
    const key = normalizeCategoryKey(categoryName);
    if (!key) { return; }
    const current = this.service.dashboardPreferences.getValue()?.watchedCategoryKeys || [];
    if (current.includes(key)) { return; }
    await this.persistWatchedPreferences({
      watchedCategoryKeys: [...current, key],
      watchedVendorKeys: this.service.dashboardPreferences.getValue()?.watchedVendorKeys || []
    });
  }

  async removeWatchedCategoryByName(categoryName: string) {
    const key = normalizeCategoryKey(categoryName);
    if (!key) { return; }
    const current = this.service.dashboardPreferences.getValue()?.watchedCategoryKeys || [];
    await this.persistWatchedPreferences({
      watchedCategoryKeys: current.filter(k => k !== key),
      watchedVendorKeys: this.service.dashboardPreferences.getValue()?.watchedVendorKeys || []
    });
  }

  async removeWatchedMissing(key: string) {
    const current = this.service.dashboardPreferences.getValue()?.watchedCategoryKeys || [];
    await this.persistWatchedPreferences({
      watchedCategoryKeys: current.filter(k => k !== key),
      watchedVendorKeys: this.service.dashboardPreferences.getValue()?.watchedVendorKeys || []
    });
  }

  async removeVendorMapping(index: number, vendorName?: string) {
    const mappings = this.service.vendorMappings.getValue() || [];
    if (index < 0 || index >= mappings.length) { return; }
    const updated = [...mappings];
    updated.splice(index, 1);
    await this.persistVendorMappings(updated);
    await this.setVendorWatchedState(vendorName || '', false);
  }

  private async addVendor(mapping: IVendorLogoRule, watched: boolean) {
    await this.addVendorMapping(mapping);
    await this.setVendorWatchedState(mapping?.vendorName || '', watched);
  }

  private async addVendorMapping(mapping: IVendorLogoRule) {
    const trimmed = {
      pattern: (mapping?.pattern || '').trim(),
      vendorName: (mapping?.vendorName || '').trim(),
      logoUrl: (mapping?.logoUrl || '').trim()
    };
    if (!trimmed.pattern || !trimmed.vendorName || !trimmed.logoUrl) { return; }
    const current = this.service.vendorMappings.getValue() || [];
    const ruleKey = `${normalizeVendorKey(trimmed.pattern)}-${normalizeVendorKey(trimmed.vendorName)}`;
    const deduped = current.filter(rule => `${normalizeVendorKey(rule.pattern)}-${normalizeVendorKey(rule.vendorName)}` !== ruleKey);
    const updated = [trimmed, ...deduped];
    await this.persistVendorMappings(updated);
  }

  private async updateVendor(mapping: IVendorLogoRule, index: number, watched: boolean, previousVendorName: string) {
    await this.updateVendorMapping(mapping, index);
    const previousKey = normalizeVendorKey(previousVendorName);
    const currentKey = normalizeVendorKey(mapping?.vendorName || '');
    if (previousKey && previousKey !== currentKey) {
      await this.setVendorWatchedState(previousVendorName, false);
    }
    await this.setVendorWatchedState(mapping?.vendorName || '', watched);
  }

  private async updateVendorMapping(mapping: IVendorLogoRule, index: number) {
    const trimmed = {
      pattern: (mapping?.pattern || '').trim(),
      vendorName: (mapping?.vendorName || '').trim(),
      logoUrl: (mapping?.logoUrl || '').trim()
    };
    if (!trimmed.pattern || !trimmed.vendorName || !trimmed.logoUrl) { return; }

    const current = this.service.vendorMappings.getValue() || [];
    if (index < 0 || index >= current.length) {
      await this.addVendorMapping(trimmed);
      return;
    }
    const updated = [...current];
    updated[index] = trimmed;
    await this.persistVendorMappings(updated);
  }

  private async persistVendorMappings(vendorMappings: IVendorLogoRule[]) {
    await this.service.saveVendorMappings(vendorMappings);
  }

  private async setVendorWatchedState(vendorName: string, watched: boolean) {
    const key = normalizeVendorKey(vendorName);
    if (!key) { return; }
    const preferences = this.service.dashboardPreferences.getValue();
    const currentWatched = preferences?.watchedVendorKeys || [];
    const nextWatched = watched
      ? Array.from(new Set([...currentWatched, key]))
      : currentWatched.filter(k => k !== key);
    await this.persistWatchedPreferences({
      watchedCategoryKeys: preferences?.watchedCategoryKeys || [],
      watchedVendorKeys: nextWatched
    });
  }

  private async persistWatchedPreferences(update: { watchedCategoryKeys?: string[]; watchedVendorKeys?: string[] }) {
    const current = this.service.dashboardPreferences.getValue() || { watchedCategoryKeys: [], watchedVendorKeys: [] };
    await this.service.saveDashboardPreferences({
      watchedCategoryKeys: update?.watchedCategoryKeys ?? current.watchedCategoryKeys,
      watchedVendorKeys: update?.watchedVendorKeys ?? current.watchedVendorKeys
    });
  }
}
