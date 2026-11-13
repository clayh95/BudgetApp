import { buildSummary } from './summary-model';
import { emptySummarySearch, searchSummary, transactionSearchText } from './summary-search';
import { SearchHighlightPipe } from './search-highlight.pipe';
import { ICategory, ITransaction } from '../core/dataTypes';

const categories: ICategory[] = ['Groceries', 'Income', 'Empty'].map((name) => ({
  id: name,
  name,
  budgeted: 100,
  spent: 0,
  notes: '',
  keywords: [],
}));
const tx = (id: string, category: string, description: string, status = 'Posted'): ITransaction => ({
  id,
  category,
  description,
  status,
  amount: -42.5,
  date: '11/12/2026',
  notes: 'Weekly trip',
});
const records = [
  tx('posted', 'Groceries', 'H-E-B market'),
  tx('pending', 'Groceries', 'H-E-B fuel', 'Pending'),
  tx('income', 'Income', 'Refund', 'Pending'),
  tx('blank', '', 'Unknown shop'),
  tx('starting', 'Groceries', 'Groceries Starting Balance'),
];
const mappings = [{ vendorName: 'HEB', pattern: 'h-e-b', logoUrl: '' }];

describe('Summary search', () => {
  const model = buildSummary(categories, records);
  it('combines category, mapped vendor, and query while preserving Pending membership and finances', () => {
    const result = searchSummary(model.views, { query: 'fuel', category: 'Groceries', vendor: 'HEB' }, mappings);
    expect(result.map((view) => view.kind)).toEqual(['pending']);
    expect(result[0].transactions.map((transaction) => transaction.id)).toEqual(['pending']);
    expect(
      searchSummary(model.views, { query: '', category: 'Income', vendor: null }, []).map((view) => view.kind),
    ).toEqual(['income']);
    const groceries = searchSummary(model.views, { query: 'market', category: null, vendor: null }, [])[0];
    expect(groceries.category).toBe(model.views.find((view) => view.category.name === 'Groceries').category);
    expect(model.views.find((view) => view.category.name === 'Groceries').transactions).toHaveLength(2);
    expect(buildSummary(categories, records)).toEqual(model);
  });
  it('matches readable dates, amounts, category, notes, and starting balances but excludes internal properties', () => {
    for (const query of [
      '  H-E-B  ',
      '11/12',
      'Nov 12',
      '42.50',
      '$42.50',
      'Weekly',
      'Starting Balance',
      'groceries',
    ]) {
      expect(searchSummary(model.views, { ...emptySummarySearch(), query }, []).length).toBeGreaterThan(0);
    }
    expect(searchSummary(model.views, { ...emptySummarySearch(), query: 'posted' }, [])).toEqual([]);
    expect(transactionSearchText({ ...records[0], date: '2026-11-12T00:00:00Z' })).toContain('nov 12');
  });
  it('keeps only an explicitly selected empty category without extra constraints', () => {
    expect(
      searchSummary(model.views, { query: '', category: 'Empty', vendor: null }, []).map((view) => view.category.name),
    ).toEqual(['Empty']);
    expect(searchSummary(model.views, { query: 'anything', category: 'Empty', vendor: null }, [])).toEqual([]);
    expect(searchSummary(model.views, { query: '', category: 'Empty', vendor: 'HEB' }, mappings)).toEqual([]);
    expect(searchSummary(model.views, emptySummarySearch(), [])).toBe(model.views);
  });
  it('uses the Transactions vendor semantics including multiple patterns, invalid mappings, and literal description matching', () => {
    expect(searchSummary(model.views, { query: '', category: null, vendor: 'HEB' }, mappings)[0].kind).toBe('pending');
    expect(searchSummary(model.views, { query: '', category: null, vendor: 'missing' }, mappings)).toEqual([]);
    const bad = [
      { vendorName: 'bad', pattern: '[', logoUrl: '' },
      { vendorName: 'bad', pattern: 'a'.repeat(257), logoUrl: '' },
    ];
    expect(searchSummary(model.views, { query: '', category: null, vendor: 'bad' }, bad)).toEqual([]);
    expect(
      searchSummary(model.views, { query: '', category: null, vendor: 'HEB' }, [
        ...mappings,
        { ...mappings[0], pattern: 'unknown' },
      ]).flatMap((view) => view.transactions),
    ).toHaveLength(3);
  });
  it('escapes transaction markup and treats query punctuation literally', () => {
    const pipe = new SearchHighlightPipe();
    expect(pipe.transform('<img onerror="bad"> & [shop]', '[shop]')).toBe(
      '&lt;img onerror=&quot;bad&quot;&gt; &amp; <mark>[shop]</mark>',
    );
    expect(pipe.transform('Shop SHOP', ' shop ')).toBe('<mark>Shop</mark> <mark>SHOP</mark>');
    expect(pipe.transform('<script>', '<')).toBe('<mark>&lt;</mark>script&gt;');
  });
});
