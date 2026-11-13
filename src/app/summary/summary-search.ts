import { ITransaction } from '../core/dataTypes';
import { IVendorLogoRule } from '../core/utilities';
import { getVendorPatternsForFilter, matchesVendorPattern } from '../core/vendor-filter';
import { SummaryView } from './summary-model';

export interface SummarySearch {
  query: string;
  category: string | null;
  vendor: string | null;
}
export interface SummaryTransactionResult {
  view: SummaryView;
  transaction: ITransaction;
}
export const emptySummarySearch = (): SummarySearch => ({ query: '', category: null, vendor: null });
export const hasSummarySearch = (search: SummarySearch) =>
  !!(search.query.trim() || search.category !== null || search.vendor);

/** Use the stored calendar components, not UTC parsing, for displayed date search. */
export function transactionSearchText(transaction: ITransaction): string[] {
  const raw = transaction.date || '';
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const date = parts
    ? new Date(+parts[3], +parts[1] - 1, +parts[2])
    : iso
      ? new Date(+iso[1], +iso[2] - 1, +iso[3])
      : null;
  const amount = Number(transaction.amount);
  const values = [
    transaction.description,
    transaction.notes,
    transaction.category,
    raw,
    String(amount),
    amount.toFixed(2),
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount),
  ];
  if (date && !Number.isNaN(date.getTime())) {
    values.push(
      `${date.getMonth() + 1}/${date.getDate()}`,
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    );
  }
  return values.filter((value) => value !== null && value !== undefined).map((value) => value.toLowerCase());
}

/** Filter view copies only; category figures and full-month totals stay untouched. */
export function searchSummary(views: SummaryView[], search: SummarySearch, mappings: IVendorLogoRule[]): SummaryView[] {
  if (!hasSummarySearch(search)) return views;
  const query = search.query.trim().toLowerCase();
  const vendor = (search.vendor || '').trim().toLowerCase();
  const patterns = getVendorPatternsForFilter(vendor, mappings);
  return views
    .map((view) => ({
      ...view,
      transactions: view.transactions.filter(
        (transaction) =>
          (search.category === null || transaction.category === search.category) &&
          matchesVendorPattern(transaction.description, patterns, !!vendor) &&
          (!query || transactionSearchText(transaction).some((text) => text.includes(query))),
      ),
    }))
    .filter(
      (view) =>
        view.transactions.length ||
        (search.category !== null &&
          !query &&
          !vendor &&
          view.kind !== 'pending' &&
          (view.kind === 'uncategorized' ? search.category === '' : view.category.name === search.category)),
    );
}

export function summaryTransactionResults(views: SummaryView[]): SummaryTransactionResult[] {
  return views.flatMap((view) => view.transactions.map((transaction) => ({ view, transaction })));
}
