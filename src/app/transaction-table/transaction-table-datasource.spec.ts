import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { ITransaction, ITransactionStatus } from '../core/dataTypes';
import { DbService } from '../core/db.service';
import { TransactionTableDataSource } from './transaction-table-datasource';

describe('TransactionTableDataSource', () => {
  function createPaginatorStub() {
    return {
      pageIndex: 0,
      pageSize: 2,
      length: 0,
      page: new Subject<any>().asObservable()
    } as any;
  }

  function createSortStub() {
    return {
      active: 'date',
      direction: 'asc',
      sortChange: new Subject<any>().asObservable()
    } as any;
  }

  function createService(month = '01/2026') {
    const service = {
      transactions: new BehaviorSubject<ITransaction[]>([]),
      getMonthYearValue: vi.fn(() => month)
    } as unknown as DbService;

    return service;
  }

  const makeTransactions = (): ITransaction[] => [
    { id: '1', date: '02/01/2026', description: 'Grocery Store', amount: -12.34, notes: '', category: 'Food', status: ITransactionStatus.posted },
    { id: '2', date: '01/02/2026', description: 'Starting Balance', amount: 500, notes: '', category: '', status: ITransactionStatus.posted },
    { id: '3', date: '01/01/2026', description: 'Coffee', amount: -4.25, notes: '', category: '', status: ITransactionStatus.pending },
    { id: '4', date: '03/01/2026', description: 'Salary', amount: 1200, notes: '', category: 'Income', status: ITransactionStatus.posted }
  ];

  it('filters rows by text and status/starting balance/uncategorized/category', async () => {
    const paginator = createPaginatorStub();
    const sort = createSortStub();
    const filter = new BehaviorSubject<string>('');
    const bShowPending = new BehaviorSubject<boolean>(false);
    const bShowStartingBalances = new BehaviorSubject<boolean>(false);
    const bOnlyUncategorized = new BehaviorSubject<boolean>(false);
    const categoryFilter = new BehaviorSubject<string>('');
    const service = createService('02/2026');

    const ds = new TransactionTableDataSource(
      paginator,
      sort,
      service,
      filter,
      bShowPending,
      bShowStartingBalances,
      bOnlyUncategorized,
      categoryFilter
    );

    service.transactions.next(makeTransactions());

    bShowPending.next(false);
    bShowStartingBalances.next(false);
    bOnlyUncategorized.next(false);
    const postedVisible = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(postedVisible.map(t => t.id)).toEqual(['1', '4']);

    bShowStartingBalances.next(true);
    bOnlyUncategorized.next(true);
    const uncategorizedOnly = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(uncategorizedOnly.map(t => t.id)).toEqual(['2']);

    bShowPending.next(false);
    bShowStartingBalances.next(true);
    bOnlyUncategorized.next(false);
    categoryFilter.next('');
    const includeStartingBalances = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(includeStartingBalances.map(t => t.id)).toEqual(['2', '1']);

    categoryFilter.next('Income');
    filter.next('');
    const byCategory = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(byCategory.map(t => t.id)).toEqual(['4']);

    bShowPending.next(true);
    bShowStartingBalances.next(true);
    filter.next('cof');
    categoryFilter.next('');
    const byText = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(byText.map(t => t.id)).toEqual(['3']);
  });

  it('sorts by amount and description', async () => {
    const paginator = createPaginatorStub();
    paginator.pageSize = 10;
    const sort = createSortStub();
    const filter = new BehaviorSubject<string>('');
    const bShowPending = new BehaviorSubject(false);
    const bShowStartingBalances = new BehaviorSubject(true);
    const bOnlyUncategorized = new BehaviorSubject(false);
    const categoryFilter = new BehaviorSubject('');
    const service = createService('02/2026');
    const ds = new TransactionTableDataSource(
      paginator,
      sort,
      service,
      filter,
      bShowPending,
      bShowStartingBalances,
      bOnlyUncategorized,
      categoryFilter
    );

    service.transactions.next(makeTransactions());

    sort.active = 'amount';
    sort.direction = 'asc';
    bShowPending.next(true);
    bShowStartingBalances.next(true);
    sort.direction = 'asc';
    const byAmount = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(byAmount.map(t => t.id)).toEqual(['1', '3', '2', '4']);

    sort.direction = 'desc';
    const byAmountDesc = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(byAmountDesc.map(t => t.id)).toEqual(['4', '2', '3', '1']);

    sort.active = 'description';
    sort.direction = 'asc';
    const byDescription = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(byDescription.map(t => t.id)).toEqual(['3', '1', '4', '2']);
  });

  it('paginates and updates total from filtered rows', async () => {
    const paginator = createPaginatorStub();
    paginator.pageSize = 2;
    paginator.pageIndex = 1;
    const sort = createSortStub();
    const filter = new BehaviorSubject<string>('');
    const service = createService();
    const ds = new TransactionTableDataSource(
      paginator,
      sort,
      service,
      filter,
      new BehaviorSubject(true),
      new BehaviorSubject(true),
      new BehaviorSubject(false),
      new BehaviorSubject('')
    );

    service.transactions.next([ ...makeTransactions() ,
      { id: '5', date: '04/01/2026', description: 'Bonus', amount: 900, notes: '', category: 'Income', status: ITransactionStatus.posted }
    ]);

    const page = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(page.map(t => t.id)).toEqual(['1', '4']);
    expect(ds.total).toBe(2583.41);
  });

  it('marks modified and added rows when month context matches', async () => {
    const paginator = createPaginatorStub();
    paginator.pageSize = 10;
    const sort = createSortStub();
    const filter = new BehaviorSubject<string>('');
    const service = createService('02/2026');
    const ds = new TransactionTableDataSource(
      paginator,
      sort,
      service,
      filter,
      new BehaviorSubject(true),
      new BehaviorSubject(true),
      new BehaviorSubject(false),
      new BehaviorSubject('')
    );

    service.transactions.next([
      { id: '1', date: '02/01/2026', description: 'Grocery', amount: 10, notes: '', category: 'Food', status: ITransactionStatus.posted },
      { id: '2', date: '02/02/2026', description: 'Salary', amount: 100, notes: '', category: 'Income', status: ITransactionStatus.posted }
    ]);

    const first = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(first.length).toBe(2);

    service.transactions.next([
      { id: '1', date: '02/01/2026', description: 'Grocery', amount: 15, notes: '', category: 'Food', status: ITransactionStatus.posted },
      { id: '2', date: '02/02/2026', description: 'Salary', amount: 100, notes: '', category: 'Income', status: ITransactionStatus.posted },
      { id: '3', date: '02/03/2026', description: 'Split', amount: 5, notes: '', category: 'Income', status: ITransactionStatus.posted }
    ]);

    const updated = await firstValueFrom(ds.connect().pipe(take(1)));
    const changed = updated.find(x => x.id === '1');
    const added = updated.find(x => x.id === '3');

    expect(changed?.changeAction).toBe('modified');
    expect(added?.changeAction).toBe('added');
  });
});
