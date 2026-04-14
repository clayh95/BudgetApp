import { BehaviorSubject, Subject } from 'rxjs';
import { TransactionTableDataSource } from './transaction-table-datasource';
import { ITransaction } from '../core/dataTypes';

describe('TransactionTableDataSource vendor filtering', () => {
  const createDataSource = () => {
    const paginator = { page: new Subject<any>(), pageIndex: 0, pageSize: 10, length: 0 } as any;
    const sort = { sortChange: new Subject<any>(), active: '', direction: '' } as any;
    const service = {
      transactions: new BehaviorSubject<ITransaction[]>([]),
      vendorMappings: new BehaviorSubject<any[]>([]),
      getMonthYearValue: () => '01/2026'
    } as any;

    return new TransactionTableDataSource(
      paginator,
      sort,
      service,
      new BehaviorSubject<string>(''),
      new BehaviorSubject<boolean>(true),
      new BehaviorSubject<boolean>(true),
      new BehaviorSubject<boolean>(false),
      new BehaviorSubject<string>(''),
      new BehaviorSubject<string>('')
    );
  };

  const transactions: ITransaction[] = [
    { id: '1', date: '01/01/2026', amount: -10, description: 'WAL-MART #1200', category: 'Groceries', notes: '', status: 'Posted' },
    { id: '2', date: '01/02/2026', amount: -20, description: 'TARGET T-123', category: 'Groceries', notes: '', status: 'Posted' },
    { id: '3', date: '01/03/2026', amount: -30, description: 'Random Store', category: 'Dining', notes: '', status: 'Posted' }
  ];

  const vendorMappings = [
    { pattern: 'wal-?mart', vendorName: 'Walmart', logoUrl: 'assets/images/walmart-logo.png' },
    { pattern: 'target t\\-', vendorName: 'Target', logoUrl: 'assets/images/target-logo.png' }
  ];

  it('applies vendor regex to description only', () => {
    const ds = createDataSource() as any;
    const filtered = ds.getFilteredData(transactions, '', true, true, false, '', 'Walmart', vendorMappings);

    expect(filtered.map((t: ITransaction) => t.id)).toEqual(['1']);
  });

  it('uses AND logic for category and vendor filters', () => {
    const ds = createDataSource() as any;
    const filtered = ds.getFilteredData(transactions, '', true, true, false, 'Groceries', 'Target', vendorMappings);

    expect(filtered.map((t: ITransaction) => t.id)).toEqual(['2']);
  });

  it('supports combined text + vendor filtering with AND logic', () => {
    const ds = createDataSource() as any;
    const filtered = ds.getFilteredData(transactions, '1200', true, true, false, '', 'Walmart', vendorMappings);

    expect(filtered.map((t: ITransaction) => t.id)).toEqual(['1']);
  });

  it('returns no rows when vendor chip has no matching mapping rules', () => {
    const ds = createDataSource() as any;
    const filtered = ds.getFilteredData(transactions, '', true, true, false, '', 'Unknown Vendor', vendorMappings);

    expect(filtered).toEqual([]);
  });
});
