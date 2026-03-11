import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { DbService, IDashboardPreferences } from '../core/db.service';
import { collectionType, ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { SharedModule } from '../shared/shared.module';
import { MatDialog } from '@angular/material/dialog';
import { DashboardWatchCategoryModalComponent } from '../dashboard-watch-category-modal/dashboard-watch-category-modal.component';

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
}

function roundMoney(value: number): number {
  return +((value ?? 0).toFixed(2));
}

export function normalizeCategoryKey(value: string): string {
  return (value || '').trim().toLowerCase();
}

function toMoney(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  const normalized = `${value ?? ''}`.replace(/[^0-9.-]+/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildDashboardViewModel(
  categories: ICategory[],
  transactions: ITransaction[],
  monthYear: string,
  watchedCategoryKeys: string[] = []
): IDashboardViewModel {
  void monthYear;
  const normalizedWatchKeys = Array.from(new Set((watchedCategoryKeys || [])
    .map(k => normalizeCategoryKey(k))
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

  postedTransactions.forEach(t => {
    if ((t.category || '').toUpperCase() === 'INCOME') {
      return;
    }
    const spendDelta = -1 * +t.amount;

    const categoryName = t.category || '';
    if (!categoryByName.has(categoryName)) {
      return;
    }
    const existing = spentByCategory.get(categoryName) || 0;
    spentByCategory.set(categoryName, existing + spendDelta);
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
    watchedCategoriesMissing
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
  watchedCategoryKeys: string[] = [];
  availableWatchOptions: ICategory[] = [];

  private categories: ICategory[] = [];
  private transactions: ITransaction[] = [];
  private monthYear = '';

  constructor(public service: DbService, public dialog: MatDialog) {}

  ngOnInit() {
    this.dataSub = combineLatest([this.service.categories, this.service.transactions, this.service.monthYear])
      .subscribe(([categories, transactions, monthYear]) => {
        this.categories = categories || [];
        this.transactions = transactions || [];
        this.monthYear = monthYear || '';
        this.availableWatchOptions = this.categories
          .filter(c => (c.name || '').trim().length > 0 && (c.name || '').toUpperCase() !== 'INCOME')
          .sort((a, b) => a.name.localeCompare(b.name));
        this.rebuildViewModel();
      });
    this.loadBalances();
    this.loadDashboardPreferences();
  }

  ngOnDestroy() {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }
  }

  async loadBalances() {
    this.balances = await this.service.getBalances();
  }

  async loadDashboardPreferences() {
    const prefs = await this.service.getDashboardPreferences();
    this.watchedCategoryKeys = Array.from(new Set((prefs?.watchedCategoryKeys || []).map(normalizeCategoryKey)));
    this.rebuildViewModel();
  }

  private rebuildViewModel() {
    this.viewModel = buildDashboardViewModel(
      this.categories,
      this.transactions,
      this.monthYear,
      this.watchedCategoryKeys
    );
  }

  updateSummaryNotes(value: string) {
    this.service.updateDocument(this.service.getMonthPKValue(), collectionType.monthsPK, { summary: value });
  }

  isCreditCardRisk(balance: { key: string; value: any }): boolean {
    if (!balance || balance.key !== 'Credit Card') {
      return false;
    }
    return toMoney(balance.value) > 0;
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

  getTransactionQueryParamsForCategory(categoryName: string) {
    return { category: categoryName };
  }

  getSummaryQueryParamsForCategory(category: ICategory) {
    return { focusCategoryId: category.id, focusCategoryName: category.name };
  }

  openAddWatchedCategoryModal() {
    const categoryOptions = this.availableWatchOptions
      .map(c => c.name)
      .filter(name => !this.watchedCategoryKeys.includes(normalizeCategoryKey(name)));
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

  async addWatchedCategory(categoryName: string) {
    const key = normalizeCategoryKey(categoryName);
    if (!key) { return; }
    if (this.watchedCategoryKeys.includes(key)) { return; }
    this.watchedCategoryKeys = [...this.watchedCategoryKeys, key];
    await this.persistWatchedPreferences();
    this.rebuildViewModel();
  }

  async removeWatchedCategoryByName(categoryName: string) {
    const key = normalizeCategoryKey(categoryName);
    if (!key) { return; }
    this.watchedCategoryKeys = this.watchedCategoryKeys.filter(k => k !== key);
    await this.persistWatchedPreferences();
    this.rebuildViewModel();
  }

  async removeWatchedMissing(key: string) {
    this.watchedCategoryKeys = this.watchedCategoryKeys.filter(k => k !== key);
    await this.persistWatchedPreferences();
    this.rebuildViewModel();
  }

  private async persistWatchedPreferences() {
    const preferences: IDashboardPreferences = {
      watchedCategoryKeys: this.watchedCategoryKeys
    };
    await this.service.saveDashboardPreferences(preferences);
  }
}
