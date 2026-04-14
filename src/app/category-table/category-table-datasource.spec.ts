import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { ICategory } from '../core/dataTypes';
import { CategoryTableDataSource } from './category-table-datasource';

describe('CategoryTableDataSource', () => {
  function createPaginatorStub(pageSize = 2, pageIndex = 0) {
    return {
      pageIndex,
      pageSize,
      length: 0,
      page: new BehaviorSubject({ pageIndex, pageSize, length: 0 }).asObservable()
    } as any;
  }

  function createSortStub() {
    return {
      active: 'category',
      direction: 'asc',
      sortChange: new BehaviorSubject({ active: 'category', direction: 'asc' }).asObservable()
    } as any;
  }

  const categories: ICategory[] = [
    { id: '1', name: 'Groceries', keywords: [], budgeted: 120, spent: 0, notes: '' },
    { id: '2', name: 'income', keywords: [], budgeted: 500, spent: 0, notes: '' },
    { id: '3', name: 'Utilities', keywords: [], budgeted: 75, spent: 0, notes: '' }
  ];

  it('filters case-insensitively by category name', async () => {
    const paginator = createPaginatorStub(10);
    const sort = createSortStub();
    const filter = new BehaviorSubject('');
    const data = new BehaviorSubject<ICategory[]>(categories);

    const ds = new CategoryTableDataSource(paginator, sort, data, filter);

    filter.next('gro');
    const filtered = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(filtered.map(x => x.name)).toEqual(['Groceries']);
  });

  it('sorts by category and budgeted', async () => {
    const paginator = createPaginatorStub(10);
    const sort = createSortStub();
    const filter = new BehaviorSubject('');
    const data = new BehaviorSubject<ICategory[]>(categories);
    const ds = new CategoryTableDataSource(paginator, sort, data, filter);

    sort.active = 'category';
    sort.direction = 'asc';
    const byName = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(byName.map(x => x.name)).toEqual(['Groceries', 'income', 'Utilities']);

    sort.active = 'budgeted';
    sort.direction = 'desc';
    const byBudget = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(byBudget.map(x => x.name)).toEqual(['income', 'Groceries', 'Utilities']);
  });

  it('paginates based on current page', async () => {
    const paginator = createPaginatorStub(2, 1);
    const sort = createSortStub();
    const filter = new BehaviorSubject('');
    const data = new BehaviorSubject<ICategory[]>(categories);
    const ds = new CategoryTableDataSource(paginator, sort, data, filter);

    const page = await firstValueFrom(ds.connect().pipe(take(1)));
    expect(page.map(x => x.name)).toEqual(['Utilities']);
  });
});
