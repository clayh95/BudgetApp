import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AddTransactionComponent } from './add-transaction.component';
import { DbService } from '../core/db.service';

const lines = [
  {
    id: 'a',
    date: '10/01/2026',
    amount: -30,
    description: 'Shop',
    category: 'Groceries',
    notes: '',
    xId: 'a',
    xIndex: 0,
  },
  {
    id: 'b',
    date: '10/02/2026',
    amount: -20,
    description: 'Shop',
    category: 'Household',
    notes: '',
    xId: 'a',
    xIndex: 1,
  },
];

describe('Shared transaction editor', () => {
  let editor: AddTransactionComponent;
  let db: any, ref: any, dialog: any;
  beforeEach(() => {
    db = {
      getMonthPKValue: () => '102026',
      getMonthPKFromMoment: (d) => d.format('MMYYYY'),
      updateDocument: vi.fn().mockResolvedValue(true),
      addDocument: vi.fn().mockResolvedValue(true),
      deleteDocument: vi.fn().mockResolvedValue(true),
      moveTransaction: vi.fn().mockResolvedValue(true),
      createDocumentId: () => 'new-line',
    };
    ref = { close: vi.fn() };
    dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: db },
        { provide: MAT_DIALOG_DATA, useValue: lines },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    editor = new AddTransactionComponent(db, dialog);
    editor.initialData = lines;
    ref.close = vi.spyOn(editor.saved, 'emit');
  });
  it('balances split amounts and restores a staged line with its original date/order', () => {
    editor.amountDisplay[0] = '-35';
    editor.commitAmount(0);
    expect(editor.data.map((t) => t.amount)).toEqual([-35, -15]);
    expect(editor.totalsMatch).toBe(true);
    editor.deleteTransaction(editor.data[1], 1);
    expect(editor.data[0].amount).toBe(-50);
    editor.undoDelete(editor.pendingDeletes[0], 0);
    expect(editor.data.map((t) => t.id)).toEqual(['a', 'b']);
    expect(editor.tmpDate.map((d) => d.format('MM/DD/YYYY'))).toEqual(['10/01/2026', '10/02/2026']);
    expect(editor.data.map((t) => t.amount)).toEqual([-35, -15]);
    expect(editor.data.every((t) => t.xId === 'a')).toBe(true);
  });
  it('restores a fully deleted group in any order without reallocating the wrong sibling', () => {
    editor.initialData = [...lines, { ...lines[1], id: 'c', amount: -10, xIndex: 2 }];
    editor.deleteTransaction(editor.data[2], 2);
    editor.deleteTransaction(editor.data[1], 1);
    editor.deleteTransaction(editor.data[0], 0);
    for (const id of ['c', 'a', 'b']) {
      const index = editor.pendingDeletes.findIndex((line) => line.id === id);
      editor.undoDelete(editor.pendingDeletes[index], index);
    }
    expect(editor.data.map((line) => [line.id, line.amount])).toEqual([
      ['a', -30],
      ['b', -20],
      ['c', -10],
    ]);
    expect(editor.newTotal).toBe(-60);
  });
  it('keeps all new split lines on the original group', () => {
    editor.split();
    expect(editor.data.map((t) => t.xId)).toEqual(['a', 'a', 'a']);
  });
  it('keeps drafts open when persistence fails', async () => {
    db.updateDocument.mockResolvedValue(false);
    await editor.update();
    expect(ref.close).not.toHaveBeenCalled();
    expect(editor.error).toContain('could not');
    expect(editor.data).toHaveLength(2);
    expect(lines[0].amount).toBe(-30);
  });
  it('confirms a year-only move before writing and uses an atomic move for existing records', async () => {
    editor.tmpDate[0].year(2027);
    await editor.update();
    expect(dialog.open).toHaveBeenCalled();
    expect(db.moveTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', date: '10/01/2027' }),
      '102026',
      '102027',
    );
    expect(ref.close).toHaveBeenCalled();
  });
  it('writes nothing if a cross-month move is declined', async () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    editor.tmpDate[1].month(10);
    await editor.update();
    expect(db.updateDocument).not.toHaveBeenCalled();
    expect(db.moveTransaction).not.toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
  });
});
