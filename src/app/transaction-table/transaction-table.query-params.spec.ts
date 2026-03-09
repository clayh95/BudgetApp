import { parseTransactionRouteInitState } from './transaction-table.component';

class FakeParamMap {
  constructor(private values: Record<string, string>) {}
  get(name: string): string | null {
    return this.values[name] ?? null;
  }
}

describe('parseTransactionRouteInitState', () => {
  it('parses full valid query-param set', () => {
    const state = parseTransactionRouteInitState(new FakeParamMap({
      pending: 'true',
      startingBalances: 'false',
      uncategorized: 'true',
      search: 'walmart',
      page: '2',
      sort: 'amount',
      dir: 'asc'
    }));

    expect(state).toEqual({
      pending: true,
      startingBalances: false,
      uncategorized: true,
      search: 'walmart',
      page: 2,
      sort: 'amount',
      dir: 'asc'
    });
  });

  it('ignores invalid values', () => {
    const state = parseTransactionRouteInitState(new FakeParamMap({
      pending: 'yes',
      startingBalances: '1',
      uncategorized: 'nah',
      page: '-1',
      sort: 'invalid',
      dir: 'sideways'
    }));

    expect(state).toEqual({});
  });
});
