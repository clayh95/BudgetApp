import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { DbService } from '../core/db.service';
import { collectionType, ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { SharedModule } from '../shared/shared.module';

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
}

export interface ITopCategorySpend {
  category: ICategory;
  spent: number;
}

export interface IDashboardViewModel {
  stats: IDashboardStats;
  overBudgetCategories: IOverBudgetCategory[];
  topSpendingCategories: ITopCategorySpend[];
}

function roundMoney(value: number): number {
  return +((value ?? 0).toFixed(2));
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
  monthYear: string
): IDashboardViewModel {
  void monthYear;
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
        overBy: roundMoney(spent - (category.budgeted || 0))
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
    topSpendingCategories
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

  viewModel: IDashboardViewModel = buildDashboardViewModel([], [], '');
  balances: Array<{ key: string; value: any }> = [];

  constructor(public service: DbService) {}

  ngOnInit() {
    this.dataSub = combineLatest([this.service.categories, this.service.transactions, this.service.monthYear])
      .subscribe(([categories, transactions, monthYear]) => {
        this.viewModel = buildDashboardViewModel(categories, transactions, monthYear);
      });
    this.loadBalances();
  }

  ngOnDestroy() {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
    }
  }

  async loadBalances() {
    this.balances = await this.service.getBalances();
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
}
