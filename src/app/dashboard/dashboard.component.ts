import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';
import { combineLatest, Subscription } from 'rxjs';
import { DbService } from '../core/db.service';
import { collectionType, ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { getVendorMatch, IVendorLogoRule, parseMoney } from '../core/utilities';
import { SharedModule } from '../shared/shared.module';
import { MatDialog } from '@angular/material/dialog';
import { DashboardVendorMappingModalComponent, DashboardVendorMappingModalResult } from '../dashboard-vendor-mapping-modal/dashboard-vendor-mapping-modal.component';
import { CategoryModalComponent } from '../category-modal/category-modal.component';

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
export type CategorySortMode = 'spend' | 'name';
export type DashboardCardViewMode = 'grid' | 'chart';

export interface ICategoryCardItem {
  category: ICategory;
  displayName: string;
  spent: number;
  remaining: number;
  isWatched: boolean;
  isOverBudget: boolean;
  icon: string;
  usesFallbackIcon: boolean;
}

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

export interface ICategoryChartItem {
  label: string;
  value: number;
  spent: number;
  remaining: number;
  budgeted: number;
  icon: string;
  usesFallbackIcon: boolean;
}

export interface IVendorChartItem {
  label: string;
  value: number;
  spent: number;
  logoUrl: string;
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
  categoryCards: ICategoryCardItem[];
  vendorMappings: IVendorLogoRule[];
  vendorCards: IVendorCardItem[];
}

function roundMoney(value: number): number {
  return +((value ?? 0).toFixed(2));
}

const DASHBOARD_CHART_COLORS = [
  '#188038',
  '#d93025',
  '#1a73e8',
  '#f9ab00',
  '#9c27b0',
  '#00acc1',
  '#e8710a',
  '#5f6368',
  '#7cb342',
  '#c2185b',
  '#3949ab',
  '#00897b'
];

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

  const categoryCards: ICategoryCardItem[] = nonIncomeCategories.map(category => {
    const spent = roundMoney(spentByCategory.get(category.name) || 0);
    const remaining = roundMoney((category.budgeted || 0) - spent);
    const icon = (category.emoji || '').trim();
    return {
      category,
      displayName: category.name,
      spent,
      remaining,
      isWatched: normalizedWatchKeys.includes(normalizeCategoryKey(category.name)),
      isOverBudget: remaining < 0,
      icon,
      usesFallbackIcon: !icon
    };
  });

  const vendorCardByKey = new Map<string, IVendorCardItem>();
  vendorMappings.forEach((mapping, index) => {
    const vendorName = (mapping?.vendorName || '').trim();
    const key = normalizeVendorKey(vendorName);
    if (!key || vendorCardByKey.has(key)) {
      return;
    }
    const logoUrl = (mapping?.logoUrl || '').trim();
    vendorCardByKey.set(key, {
      vendorName,
      displayName: vendorName,
      logoUrl,
      spent: 0,
      isWatched: normalizedWatchedVendorKeys.includes(key),
      hasSpend: false,
      sourceIndex: index,
      usesFallbackIcon: !logoUrl
    });
  });

  vendorSpendItems.forEach(item => {
    const key = normalizeVendorKey(item.vendorName);
    const existing = vendorCardByKey.get(key);
    if (existing) {
      existing.vendorName = item.vendorName;
      existing.displayName = item.vendorName;
      existing.logoUrl = item.logoUrl || existing.logoUrl;
      existing.spent = roundMoney(item.spent);
      existing.isWatched = existing.isWatched || normalizedWatchedVendorKeys.includes(key);
      existing.hasSpend = true;
      existing.usesFallbackIcon = !existing.logoUrl;
      return;
    }
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
    categoryCards,
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
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('categoryDonutCanvas') private categoryDonutCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('vendorDonutCanvas') private vendorDonutCanvas: ElementRef<HTMLCanvasElement>;

  private dataSub: Subscription;
  private categoryDonutChart: Chart;
  private vendorDonutChart: Chart;
  private chartsInitialized = false;

  viewModel: IDashboardViewModel = buildDashboardViewModel([], [], '', []);
  balances: Array<{ key: string; value: any }> = [];
  categorySearch = '';
  categorySortMode: CategorySortMode = 'spend';
  categoryOverBudgetOnly = false;
  categoryWatchedOnly = true;
  categoryViewMode: DashboardCardViewMode = 'grid';
  vendorSearch = '';
  vendorSortMode: VendorSortMode = 'spend';
  vendorWatchedOnly = true;
  vendorViewMode: DashboardCardViewMode = 'grid';

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
        this.viewModel = buildDashboardViewModel(
          cats,
          trans,
          my,
          preferences?.watchedCategoryKeys || [],
          preferences?.watchedVendorKeys || [],
          vendorMappings || []
        );
        this.updateDonutCharts();
        this.cdr.markForCheck();
      });
    });
    this.loadBalances();
  }

  ngAfterViewInit() {
    this.initializeDonutCharts();
    this.updateDonutCharts();
  }

  ngOnDestroy() {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }
    if (this.categoryDonutChart) {
      this.categoryDonutChart.destroy();
    }
    if (this.vendorDonutChart) {
      this.vendorDonutChart.destroy();
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

  trackByCategoryGridItem(index: number, item: ICategoryCardItem) {
    return item.category.id || `${normalizeCategoryKey(item.displayName)}:${index}`;
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

  openCategoryCardEdit(category: ICategory) {
    this.dialog.open(CategoryModalComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: Object.assign({}, category, {
        watched: this.service.dashboardPreferences.getValue()?.watchedCategoryKeys?.includes(normalizeCategoryKey(category.name)) || false
      }),
      autoFocus: false
    });
  }

  openAddCategoryModal() {
    this.dialog.open(CategoryModalComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        name: '',
        notes: '',
        keywords: [],
        budgeted: 0,
        spent: 0,
        emoji: '',
        watched: false
      } as ICategory & { watched: boolean },
      autoFocus: false
    });
  }

  getCategoryGridItems(): ICategoryCardItem[] {
    const search = (this.categorySearch || '').trim().toLowerCase();
    const sortByMode = (a: ICategoryCardItem, b: ICategoryCardItem) => {
      if (this.categorySortMode === 'name') {
        return a.displayName.localeCompare(b.displayName);
      }
      return b.remaining - a.remaining || a.displayName.localeCompare(b.displayName);
    };
    return (this.viewModel?.categoryCards || [])
      .filter(item => {
        if (this.categoryOverBudgetOnly && !item.isOverBudget) {
          return false;
        }
        if (this.categoryWatchedOnly && !item.isWatched) {
          return false;
        }
        if (!search) {
          return true;
        }
        return (item.displayName || '').toLowerCase().includes(search);
      })
      .sort((a, b) => sortByMode(a, b));
  }

  getCategoryChartItems(): ICategoryChartItem[] {
    return this.getCategoryGridItems()
      .filter(item => item.spent > 0)
      .sort((a, b) => {
        if (this.categorySortMode === 'name') {
          return a.displayName.localeCompare(b.displayName);
        }
        return b.spent - a.spent || a.displayName.localeCompare(b.displayName);
      })
      .map(item => ({
        label: item.displayName,
        value: roundMoney(item.spent),
        spent: roundMoney(item.spent),
        remaining: roundMoney(item.remaining),
        budgeted: roundMoney(item.category?.budgeted || 0),
        icon: item.icon,
        usesFallbackIcon: item.usesFallbackIcon
      }));
  }

  getCategoryAmountSortLabel(): string {
    return this.categoryViewMode === 'chart' ? 'Spend' : 'Remaining';
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
        if (this.vendorWatchedOnly && !item.isWatched) {
          return false;
        }
        if (!search) { return true; }
        return (item?.displayName || '').toLowerCase().includes(search);
      })
      .sort((a, b) => sortByMode(a, b));

    return items;
  }

  getVendorChartItems(): IVendorChartItem[] {
    return this.getVendorGridItems()
      .filter(item => item.spent > 0)
      .map(item => ({
        label: item.displayName,
        value: roundMoney(item.spent),
        spent: roundMoney(item.spent),
        logoUrl: item.logoUrl,
        usesFallbackIcon: item.usesFallbackIcon
      }));
  }

  onVendorSearchChange(value: string) {
    this.vendorSearch = value || '';
    this.updateVendorDonutChart();
  }

  onCategorySearchChange(value: string) {
    this.categorySearch = value || '';
    this.updateCategoryDonutChart();
  }

  setVendorSortMode(mode: VendorSortMode) {
    this.vendorSortMode = mode;
    this.updateVendorDonutChart();
  }

  private categoryDonutChartUpdateFrame: number | null = null;
  private vendorDonutChartUpdateFrame: number | null = null;

  private scheduleCategoryDonutChartUpdate() {
    if (this.categoryDonutChartUpdateFrame !== null) {
      cancelAnimationFrame(this.categoryDonutChartUpdateFrame);
    }

    this.categoryDonutChartUpdateFrame = requestAnimationFrame(() => {
      this.categoryDonutChartUpdateFrame = null;
      this.updateCategoryDonutChart();
    });
  }

  private scheduleVendorDonutChartUpdate() {
    if (this.vendorDonutChartUpdateFrame !== null) {
      cancelAnimationFrame(this.vendorDonutChartUpdateFrame);
    }

    this.vendorDonutChartUpdateFrame = requestAnimationFrame(() => {
      this.vendorDonutChartUpdateFrame = null;
      this.updateVendorDonutChart();
    });
  }

  setCategorySortMode(mode: CategorySortMode) {
    this.categorySortMode = mode;
    this.updateCategoryDonutChart();
  }

  toggleCategoryOverBudgetOnly() {
    this.categoryOverBudgetOnly = !this.categoryOverBudgetOnly;
    this.updateCategoryDonutChart();
  }

  toggleCategoryWatchedOnly() {
    this.categoryWatchedOnly = !this.categoryWatchedOnly;
    this.updateCategoryDonutChart();
  }

  toggleVendorWatchedOnly() {
    this.vendorWatchedOnly = !this.vendorWatchedOnly;
    this.updateVendorDonutChart();
  }

  setCategoryViewMode(mode: DashboardCardViewMode) {
    this.categoryViewMode = mode;
    if (mode === 'chart') {
      this.categoryWatchedOnly = false;
      this.categoryOverBudgetOnly = false;
    }
    this.updateCategoryDonutChart();
    this.scheduleCategoryDonutChartUpdate();
  }

  setVendorViewMode(mode: DashboardCardViewMode) {
    this.vendorViewMode = mode;
    if (mode === 'chart') {
      this.vendorWatchedOnly = false;
    }
    this.updateVendorDonutChart();
    this.scheduleVendorDonutChartUpdate();
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

  private initializeDonutCharts() {
    if (this.chartsInitialized || !this.categoryDonutCanvas || !this.vendorDonutCanvas) {
      return;
    }
    this.categoryDonutChart = new Chart(this.categoryDonutCanvas.nativeElement, this.createCategoryDonutConfig());
    this.vendorDonutChart = new Chart(this.vendorDonutCanvas.nativeElement, this.createVendorDonutConfig());
    this.chartsInitialized = true;
  }

  private createCategoryDonutConfig(): Chart.ChartConfiguration {
    return {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: []
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        tooltips: {
          callbacks: {
            label: (tooltipItem, data) => {
              const index = tooltipItem.index ?? 0;
              const datasetIndex = tooltipItem.datasetIndex ?? 0;
              const label = data.labels?.[index] || '';
              const rawValue = data.datasets?.[datasetIndex]?.data?.[index];
              const spent = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
              return `${label}: ${this.formatCurrency(spent)} spent`;
            }
          }
        }
      }
    };
  }

  private createVendorDonutConfig(): Chart.ChartConfiguration {
    return {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: []
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        tooltips: {
          callbacks: {
            label: (tooltipItem, data) => {
              const index = tooltipItem.index ?? 0;
              const datasetIndex = tooltipItem.datasetIndex ?? 0;
              const label = data.labels?.[index] || '';
              const rawValue = data.datasets?.[datasetIndex]?.data?.[index];
              const spent = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
              return `${label}: ${this.formatCurrency(spent)} spent`;
            }
          }
        }
      }
    };
  }

  private updateDonutCharts() {
    if (!this.chartsInitialized) {
      return;
    }
    this.updateCategoryDonutChart();
    this.updateVendorDonutChart();
  }

  private updateCategoryDonutChart() {
    if (!this.categoryDonutChart) {
      return;
    }
    const items = this.getCategoryChartItems();
    this.categoryDonutChart.data.labels = items.map(item => item.label);
    this.categoryDonutChart.data.datasets = [{
      data: items.map(item => item.value),
      backgroundColor: items.map((item, index) => this.getChartColor(index))
    }];
    this.categoryDonutChart.update();
    this.categoryDonutChart.resize();
  }

  private updateVendorDonutChart() {
    if (!this.vendorDonutChart) {
      return;
    }
    const items = this.getVendorChartItems();
    this.vendorDonutChart.data.labels = items.map(item => item.label);
    this.vendorDonutChart.data.datasets = [{
      data: items.map(item => item.value),
      backgroundColor: items.map((item, index) => this.getChartColor(index))
    }];
    this.vendorDonutChart.update();
    this.vendorDonutChart.resize();
  }

  getChartColor(index: number): string {
    return DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length];
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  }
}
