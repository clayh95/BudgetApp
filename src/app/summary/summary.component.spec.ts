import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';
import { SummaryComponent } from './summary.component';
import { DbService } from '../core/db.service';
import { ICategory, ITransaction } from '../core/dataTypes';

const category = (id: string, name: string): ICategory => ({
  id,
  name,
  budgeted: 100,
  spent: 0,
  notes: '',
  keywords: [],
});
const transaction: ITransaction = {
  id: 't',
  category: '',
  amount: -20,
  description: 'Test shop',
  date: '10/01/2026',
  status: 'Posted',
};

describe('Summary browser', () => {
  let fixture: ComponentFixture<SummaryComponent>;
  let component: SummaryComponent;
  let db: any;
  let dialog: any;
  beforeEach(async () => {
    db = {
      categories: new BehaviorSubject([category('g', 'Groceries'), category('h', 'Household')]),
      transactions: new BehaviorSubject([transaction]),
      monthYear: new BehaviorSubject('10/2026'),
      monthSummary: new BehaviorSubject('Original notes'),
      vendorMappings: new BehaviorSubject([]),
      getMonthPKValue: () => db.monthYear.value.replace('/', ''),
      updateDocument: vi.fn().mockResolvedValue(true),
      getTransactionsForEdit: vi.fn().mockResolvedValue([transaction]),
      beforeMonthChange: null,
    };
    dialog = { open: vi.fn(() => ({ afterClosed: () => of(false) })) };
    await TestBed.configureTestingModule({
      imports: [SummaryComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DbService, useValue: db },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('renders an unselected browser, then opens a category without expanding the list', () => {
    expect(fixture.nativeElement.textContent).toContain('Select a category');
    component.selectView(component.views.find((v) => v.kind === 'uncategorized'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.transaction-pane').textContent).toContain('Test shop');
    expect(fixture.nativeElement.querySelector('.category-scroll').textContent).not.toContain('Test shop');
  });

  it('keeps a pin without duplicate panes, collapses on narrow screens and resets on month change', () => {
    const queue = component.views[0],
      groceries = component.views.find((v) => v.category.id === 'g');
    component.canCompare = true;
    component.selectView(queue);
    component.pinView(queue);
    component.selectView(groceries);
    expect(component.visibleViews.map((v) => v.key)).toEqual(['category:g', 'uncategorized']);
    component.selectView(queue);
    expect(component.visibleViews).toHaveLength(2);
    component.canCompare = false;
    expect(component.visibleViews.map((v) => v.key)).toEqual(['uncategorized']);
    component.canCompare = true;
    expect(component.visibleViews).toHaveLength(2);
    db.monthYear.next('11/2026');
    expect(component.pinnedKey).toBeNull();
    expect(component.visibleViews).toHaveLength(0);
  });

  it('writes only the dragged line category through the existing update engine and preserves a failed source', async () => {
    component.dragEnabled = true;
    const event = { preventDefault: vi.fn(), dataTransfer: { setData: vi.fn() } } as any;
    component.startDrag(event, component.views[0], transaction);
    await component.dropTransaction(
      event,
      component.views.find((v) => v.category.id === 'g'),
    );
    expect(db.updateDocument).toHaveBeenCalledWith('t', 'transactions', { category: 'Groceries' }, '102026');
    expect(transaction.category).toBe('');
    expect(component.notice).toContain('Moved');
    db.updateDocument.mockResolvedValue(false);
    component.startDrag(event, component.views[0], transaction);
    await component.dropTransaction(
      event,
      component.views.find((v) => v.category.id === 'h'),
    );
    expect(component.notice).toContain('Could not move');
    expect(transaction.category).toBe('');
  });

  it('blocks dragging pending charges and dropping into Pending', async () => {
    component.dragEnabled = true;
    const event = { preventDefault: vi.fn(), dataTransfer: { setData: vi.fn() } } as any;
    const pending = { ...transaction, status: 'Pending' };
    expect(component.canDragTransaction(component.views[0], pending)).toBe(false);
    component.startDrag(event, component.views[0], transaction);
    await component.dropTransaction(
      event,
      component.views.find((v) => v.kind === 'pending'),
    );
    expect(db.updateDocument).not.toHaveBeenCalled();
  });

  it('retains failed note saves and prevents closing, using the original month for retry', async () => {
    await component.openNotes();
    component.notesDraft = 'Changed';
    component.notesDirty = true;
    db.updateDocument.mockResolvedValue(false);
    expect(await component.requestCloseDrawer()).toBe(false);
    expect(component.drawerKind).toBe('notes');
    expect(component.notesDraft).toBe('Changed');
    expect(component.notesError).not.toBe('');
    db.updateDocument.mockResolvedValue(true);
    expect(await component.requestCloseDrawer()).toBe(true);
    expect(db.updateDocument).toHaveBeenLastCalledWith('102026', 'monthsPK', { summary: 'Changed' });
  });

  it('asks before leaving a changed editor and keeps the draft when declined', async () => {
    component.drawerKind = 'category';
    component.categoryEditor = { dirty: true, saving: false } as any;
    expect(await component.canDeactivate()).toBe(false);
    expect(component.drawerKind).toBe('category');
    expect(dialog.open).toHaveBeenCalled();
  });
});
