import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { DbService } from './db.service';
import { collectionType, ICategory, ITransaction, saveState as SaveState } from './dataTypes';

describe('DbService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createService(): DbService {
    const service = Object.create(DbService.prototype) as DbService;
    (service as any).transactions = new BehaviorSubject<ITransaction[]>([]);
    (service as any).categories = new BehaviorSubject<ICategory[]>([]);
    (service as any).monthYear = new BehaviorSubject<string>('03/2026');
    (service as any).saveState = new BehaviorSubject<SaveState>(SaveState.done);
    (service as any).dashboardPreferences = new BehaviorSubject({ watchedCategoryKeys: [] });
    (service as any).auth = { currentUser: null };
    (service as any).firestore = {};
    return service;
  }

  it('normalizes transaction amounts in processTransactions', () => {
    const service = createService();

    service.processTransactions([
      { id: '1', amount: '$1,234.50' },
      { id: '2', amount: 'bad-value' },
      { id: '3', amount: -99.25 }
    ] as any);

    const transactions = service.transactions.getValue();
    expect(transactions[0].amount).toBe(1234.5);
    expect(transactions[1].amount).toBe(0);
    expect(transactions[2].amount).toBe(-99.25);
  });

  it('normalizes, sorts, and clears categories in processCategories', () => {
    const service = createService();

    service.processCategories([
      { id: '1', name: 'Zeta', budgeted: '$15.00' },
      { id: '2', name: 'alpha', budgeted: 'oops' }
    ] as any);

    const categories = service.categories.getValue();
    expect(categories.map(c => c.name)).toEqual(['Zeta', 'alpha']);
    expect(categories[0].budgeted).toBe(15);
    expect(categories[1].budgeted).toBe(0);

    service.processCategories([] as any);
    expect(service.categories.getValue()).toEqual([]);
  });

  it('returns month/year helpers and collection paths', () => {
    const service = createService();

    expect(service.getMonthYearValue()).toBe('03/2026');
    expect(service.getMonthPKValue()).toBe('032026');

    service.addNextMonthYear('04/2026');
    expect(service.getMonthYearValue()).toBe('04/2026');
    expect(service.getMonthPKValue()).toBe('042026');

    expect(service.getMonthPKFromMoment(moment('2026-12-05'))).toBe('122026');

    expect(service.getCollectionPath(collectionType.transactions)).toBe('monthsPK/042026/transactions');
    expect(service.getCollectionPath(collectionType.categories, '012026')).toBe('monthsPK/012026/categories');
    expect(service.getCollectionPath(collectionType.additionalData)).toBe('additionalData');
  });

  it('reports save state and descriptions', () => {
    const service = createService();

    expect(service.getSaveState()).toBe('done');
    expect(service.getSaveStatusDescription()).toBe('All changes saved');

    service.saveState.next(SaveState.saving);
    expect(service.getSaveState()).toBe('saving');
    expect(service.getSaveStatusDescription()).toBe('Saving changes...');

    service.saveState.next(SaveState.error);
    expect(service.getSaveState()).toBe('error');
    expect(service.getSaveStatusDescription()).toBe('Error Saving!');
  });

  it('resets streams and unsubscribes on signOut', () => {
    const service = createService();
    const tranUnsub = vi.fn();
    const catUnsub = vi.fn();
    const prefUnsub = vi.fn();

    (service as any).tranSub = { unsubscribe: tranUnsub };
    (service as any).catSub = { unsubscribe: catUnsub };
    (service as any).dashboardPreferencesSub = { unsubscribe: prefUnsub };

    service.transactions.next([{ id: '1' } as any]);
    service.categories.next([{ id: '1' } as any]);
    service.dashboardPreferences.next({ watchedCategoryKeys: ['rent'] });

    service.signOut();

    expect(tranUnsub).toHaveBeenCalled();
    expect(catUnsub).toHaveBeenCalled();
    expect(prefUnsub).toHaveBeenCalled();
    expect(service.transactions.getValue()).toEqual([]);
    expect(service.categories.getValue()).toEqual([]);
    expect(service.dashboardPreferences.getValue()).toEqual({ watchedCategoryKeys: [] });
  });

});
