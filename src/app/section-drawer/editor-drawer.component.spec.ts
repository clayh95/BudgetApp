import { of } from 'rxjs';
import { EditorDrawerComponent } from './editor-drawer.component';
import { EditorDrawerService } from './editor-drawer.service';

describe('Shared editor drawer', () => {
  it('keeps dirty drafts when closing or switching is declined, then restores the month guard on disposal', async () => {
    const service = new EditorDrawerService();
    const previous = vi.fn().mockResolvedValue(true);
    const db = { beforeEditorMonthChange: previous };
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(false) })) };
    const host = new EditorDrawerComponent(service, dialog as any, db as any);
    await service.openCategory({ id: 'cat', name: 'Groceries', budgeted: 10, keywords: [] } as any);
    host.categoryEditor = { dirty: true, saving: false } as any;
    expect(await db.beforeEditorMonthChange()).toBe(false);
    expect(previous).not.toHaveBeenCalled();
    await service.openTransactions([]);
    expect(service.category.name).toBe('Groceries');
    expect(service.transactions).toBeNull();
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    expect(await host.close()).toBe(true);
    expect(service.opened).toBe(false);
    host.ngOnDestroy();
    expect(db.beforeEditorMonthChange).toBe(previous);
  });

  it('isolates drawer drafts and prevents dismissal during a save', async () => {
    const service = new EditorDrawerService();
    const host = new EditorDrawerComponent(service, {} as any, { beforeEditorMonthChange: null } as any);
    const data = [{ id: 't', description: 'Shop', amount: -20 }];
    await service.openTransactions(data as any);
    service.transactions[0].amount = -30;
    expect(data[0].amount).toBe(-20);
    host.transactionEditor = { saving: true } as any;
    expect(await host.close()).toBe(false);
    expect(service.opened).toBe(true);
    host.ngOnDestroy();
  });
  it('retains content during closing and ignores a late close event after reopening', async () => {
    const service = new EditorDrawerService();
    await service.openTransactions([{ id: 'first', amount: -20 }] as any);
    service.finish();
    expect(service.opened).toBe(false);
    expect(service.transactions[0].id).toBe('first');
    await service.openTransactions([{ id: 'second', amount: -30 }] as any);
    service.clearClosedDraft();
    expect(service.opened).toBe(true);
    expect(service.transactions[0].id).toBe('second');
    service.finish();
    service.clearClosedDraft();
    expect(service.transactions).toBeNull();
  });
});
