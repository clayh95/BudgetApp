import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<any>();
  return { ...actual,
    collection: vi.fn((_db, path) => ({ path })),
    doc: vi.fn((collection, id = 'generated') => ({ path: `${collection.path}/${id}`, id })),
    getDoc: vi.fn(), updateDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(), writeBatch: vi.fn()
  };
});
import { getDoc, updateDoc, writeBatch } from 'firebase/firestore';
let DbService: typeof import('./db.service').DbService;
beforeAll(async () => { vi.resetModules(); ({ DbService } = await import('./db.service')); });
import { collectionType, saveState } from './dataTypes';

function service() {
  const db = Object.create(DbService.prototype) as import('./db.service').DbService;
  Object.assign(db, { firestore: {}, monthYear: new BehaviorSubject('10/2026'), saveState: new BehaviorSubject(saveState.done), actionStack: [], actionStackIndex: 0 });
  return db;
}

describe('Persistence and existing action history', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => vi.restoreAllMocks());
  it('reports failed writes without adding history or mutating the caller', async () => {
    const db = service(), input = { id: 't', category: 'Groceries' };
    vi.mocked(getDoc).mockResolvedValue({ data: () => ({ category: '' }) } as any);
    vi.mocked(updateDoc).mockRejectedValue(new Error('offline'));
    expect(await db.updateDocument('t', collectionType.transactions, input)).toBe(false);
    expect(updateDoc).toHaveBeenCalled();
    expect(input.id).toBe('t');
    expect(db.actionStack).toHaveLength(0);
    expect(db.saveState.value).toBe(saveState.error);
  });
  it('records a successful category assignment in the original history engine', async () => {
    const db = service();
    vi.mocked(getDoc).mockResolvedValue({ data: () => ({ category: '' }) } as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
    expect(await db.updateDocument('t', collectionType.transactions, { category: 'Groceries' })).toBe(true);
    expect(db.actionStack[0].previousData).toEqual({ category: '' });
    expect(db.actionStack[0].newData).toEqual({ category: 'Groceries' });
  });
  it('moves both documents atomically and adds the same two document history steps only on success', async () => {
    const db = service(), batch = { set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(writeBatch).mockReturnValue(batch as any);
    vi.mocked(getDoc).mockImplementation(async ref => ({ exists: () => (ref as any).path.includes('/102026/'), data: () => ({ amount: -20 }) } as any));
    const transaction = { id: 't', amount: -20, category: 'Groceries', date: '11/01/2026', description: 'Shop' };
    expect(await db.moveTransaction(transaction, '102026', '112026')).toBe(true);
    expect(batch.set).toHaveBeenCalledWith(expect.objectContaining({ path: 'monthsPK/112026/transactions/t' }), expect.objectContaining({ amount: -20 }));
    expect(batch.delete).toHaveBeenCalledWith(expect.objectContaining({ path: 'monthsPK/102026/transactions/t' }));
    expect(db.actionStack).toHaveLength(2);
    const failed = service(); batch.commit.mockRejectedValue(new Error('offline'));
    expect(await failed.moveTransaction(transaction, '102026', '112026')).toBe(false);
    expect(failed.actionStack).toHaveLength(0);
    expect(failed.saveState.value).toBe(saveState.error);
  });
});
