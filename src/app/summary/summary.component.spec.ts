import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';
import { SummaryComponent } from './summary.component';
import { DbService } from '../core/db.service';
import { ICategory, ITransaction } from '../core/dataTypes';

const multiClick = (ctrlKey = false) => ({ preventDefault() {}, metaKey: !ctrlKey, ctrlKey }) as MouseEvent;

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
      getSaveState: vi.fn().mockReturnValue('done'),
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

  it('opens up to four views in opening order, evicts the oldest and never duplicates a view', () => {
    component.maxOpenViews = 4;
    component.views.forEach((view) => component.selectView(view, { preventDefault() {}, metaKey: true } as MouseEvent));
    expect(component.visibleViews).toHaveLength(4);
    const keys = [...component.openKeys];
    component.selectView(component.views[0], multiClick());
    expect(component.openKeys).toEqual(keys.filter((key) => key !== component.views[0].key));
    component.selectView(component.views[0], multiClick());
    expect(new Set(component.openKeys).size).toBe(4);
    component.maxOpenViews = 2;
    const extra = { ...component.views[0], key: 'extra' };
    component.views.push(extra);
    component.selectView(extra, multiClick());
    expect(component.openKeys).toEqual([component.views[0].key, 'extra']);
    db.monthYear.next('11/2026');
    expect(component.openKeys).toEqual([]);
  });

  it('uses a regular click for one category and Ctrl/Cmd-click to add or remove categories', () => {
    component.maxOpenViews = 4;
    const [first, second, third] = component.views;
    component.selectView(first);
    component.selectView(second, multiClick(true));
    expect(component.openKeys).toEqual([first.key, second.key]);
    component.selectView(third, multiClick());
    expect(component.openKeys).toEqual([first.key, second.key, third.key]);
    component.selectView(first, multiClick());
    expect(component.openKeys).toEqual([second.key, third.key]);
    component.selectView(second);
    expect(component.openKeys).toEqual([second.key]);
    component.selectView(second);
    expect(component.openKeys).toEqual([second.key]);
  });

  it('opens Uncategorized on desktop initially, but leaves phones at the list', () => {
    component.updateLayout();
    expect(component.visibleViews[0]?.kind).toBe('uncategorized');
    expect(component.views.slice(0, 2).map((view) => view.kind)).toEqual(['pending', 'uncategorized']);
  });

  it('keeps disabled transaction handles present during saves', () => {
    component.dragEnabled = true;
    db.getSaveState.mockReturnValue('saving');
    const queue = component.views.find((view) => view.kind === 'uncategorized');
    expect(component.showTransactionHandle(queue, transaction)).toBe(true);
    expect(component.canDragTransaction(queue, transaction)).toBe(false);
    expect(db.updateDocument).not.toHaveBeenCalled();
  });

  it('filters panes, restores pre-search selections, and preserves budget figures', () => {
    component.maxOpenViews = 4;
    const groceries = component.views.find((view) => view.category.id === 'g');
    const household = component.views.find((view) => view.category.id === 'h');
    component.selectView(groceries);
    component.selectView(household, multiClick());
    const previous = [...component.openKeys];
    const budget = component.totalBudgeted;
    component.changeSearch({ query: 'shop', category: null, vendor: null });
    expect(component.categoryViews.map((view) => view.kind)).toEqual(['uncategorized']);
    expect(component.visibleViews[0].kind).toBe('uncategorized');
    expect(component.totalBudgeted).toBe(budget);
    component.closeView(component.visibleViews[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Select a category');
    expect(fixture.nativeElement.textContent).not.toContain('No matching transactions');
    component.changeSearch({ query: 'no such shop', category: null, vendor: null });
    expect(component.visibleViews).toEqual([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching transactions');
    component.changeSearch({ query: '', category: null, vendor: null });
    expect(component.openKeys).toEqual(previous);
  });

  it('retains search across months but discards old selection snapshots and responds to live edits', () => {
    component.selectView(component.views.find((view) => view.category.id === 'h'));
    component.changeSearch({ query: 'shop', category: null, vendor: null });
    db.monthYear.next('11/2026');
    db.transactions.next([{ ...transaction, category: 'Groceries' }]);
    expect(component.search.query).toBe('shop');
    expect(component.visibleViews[0].category.name).toBe('Groceries');
    db.transactions.next([{ ...transaction, description: 'Different description' }]);
    expect(component.categoryViews).toEqual([]);
    component.changeSearch({ query: '', category: null, vendor: null });
    expect(component.openKeys).toEqual([]);
  });

  it('reapplies vendor mappings and locates a pending result without opening the editor', () => {
    db.transactions.next([{ ...transaction, description: 'Mapped shop', category: 'Groceries', status: 'Pending' }]);
    component.changeSearch({ query: '', category: null, vendor: 'Vendor' });
    expect(component.categoryViews).toEqual([]);
    db.vendorMappings.next([{ vendorName: 'Vendor', pattern: 'mapped', logoUrl: '' }]);
    const view = component.categoryViews[0];
    expect(view.kind).toBe('pending');
    component.workspaceRoot = { nativeElement: fixture.nativeElement.querySelector('.summary-root') };
    vi.spyOn(component, 'updateLayout').mockImplementation(() => {});
    component.isMobile = true;
    component.locateTransaction({ view, transaction: view.transactions[0] });
    fixture.detectChanges();
    expect(component.mobileDetail).toBe(true);
    expect(fixture.nativeElement.querySelector('.search-located')).not.toBeNull();
    expect(db.getTransactionsForEdit).not.toHaveBeenCalled();
  });

  it('previews pane reordering without committing and cancels inside the starting threshold', () => {
    component.openKeys = [];
    component.maxOpenViews = 4;
    component.views.forEach((view) => component.selectView(view, multiClick()));
    fixture.detectChanges();
    component.workspaceRoot = { nativeElement: fixture.nativeElement.querySelector('.summary-root') };
    component.workspaceRoot.nativeElement.querySelectorAll('[data-pane-key]').forEach((el, index) => {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: index * 120, right: index * 120 + 100 } as DOMRect);
    });
    const original = [...component.openKeys];
    const event = (x: number) =>
      ({
        clientX: x,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() },
      }) as any;
    const dragStart = event(25);
    component.startPaneDrag(dragStart, component.visibleViews[0]);
    expect(dragStart.dataTransfer.setDragImage).toHaveBeenCalledWith(
      component.workspaceRoot.nativeElement.querySelector('[data-pane-key]'),
      expect.any(Number),
      expect.any(Number),
    );
    component.allowPaneDrop(event(160));
    expect(component.openKeys).toEqual(original);
    expect(component.panePreviewKeys.slice(0, 2)).toEqual([original[1], original[0]]);
    expect(component.panePreviewOffset(original[0])).toBe('translateX(120px)');
    component.allowPaneDrop(event(30));
    expect(component.panePreviewKeys).toBeNull();
    component.dropPane(event(30), component.visibleViews[0]);
    expect(component.openKeys).toEqual(original);
    component.startPaneDrag(event(25), component.visibleViews[0]);
    component.allowPaneDrop(event(160));
    component.dropPane(event(160), component.visibleViews[1]);
    expect(component.openKeys.slice(0, 2)).toEqual([original[1], original[0]]);
    expect(component.panePreviewKeys).toBeNull();
    expect(component.paneDropSettling).toBe(true);
    component.workspaceRoot.nativeElement.querySelectorAll<HTMLElement>('[data-pane-key]').forEach((pane) => {
      expect(pane.style.transition).toBe('none');
    });
  });

  it('routes four connectors in separate lanes and at separate heights', () => {
    component.openKeys = [];
    component.isMobile = false;
    component.maxOpenViews = 4;
    component.views.forEach((view) => component.selectView(view, multiClick()));
    fixture.detectChanges();
    const bounds = (left: number, top: number, width = 250, height = 50) =>
      ({ left, top, right: left + width, bottom: top + height, width, height }) as DOMRect;
    const root = fixture.nativeElement;
    vi.spyOn(root.querySelector('.workspace'), 'getBoundingClientRect').mockReturnValue(bounds(0, 0, 1800, 800));
    vi.spyOn(root.querySelector('.category-list'), 'getBoundingClientRect').mockReturnValue(bounds(0, 0, 250, 800));
    vi.spyOn(root.querySelector('.category-scroll'), 'getBoundingClientRect').mockReturnValue(bounds(0, 0, 250, 800));
    root.querySelectorAll('[data-category-key]').forEach((el: HTMLElement, index: number) => {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(bounds(0, 150 + index * 60));
    });
    root.querySelectorAll('[data-pane-key]').forEach((el: HTMLElement, index: number) => {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(bounds(280 + index * 350, 12, 330, 780));
    });
    component.workspaceRoot = { nativeElement: root.querySelector('.summary-root') };
    component.drawConnections();
    expect(component.connectors).toHaveLength(4);
    expect(new Set(component.connectors.map((line) => line.y2)).size).toBe(4);
    expect(new Set(component.connectors.map((line) => line.path.match(/H ([\d.]+)/)[1])).size).toBe(4);
    component.isMobile = true;
    component.drawConnections();
    expect(component.connectors).toEqual([]);
  });

  it('writes only the dragged line category through the existing update engine and preserves a failed source', async () => {
    component.dragEnabled = true;
    const event = { preventDefault: vi.fn(), dataTransfer: { setData: vi.fn() } } as any;
    component.startDrag(
      event,
      component.views.find((view) => view.kind === 'uncategorized'),
      transaction,
    );
    await component.dropTransaction(
      event,
      component.views.find((v) => v.category.id === 'g'),
    );
    expect(db.updateDocument).toHaveBeenCalledWith('t', 'transactions', { category: 'Groceries' }, '102026');
    expect(transaction.category).toBe('');
    db.updateDocument.mockResolvedValue(false);
    component.startDrag(
      event,
      component.views.find((view) => view.kind === 'uncategorized'),
      transaction,
    );
    await component.dropTransaction(
      event,
      component.views.find((v) => v.category.id === 'h'),
    );
    expect(transaction.category).toBe('');
  });

  it('blocks dragging pending charges and dropping into Pending', async () => {
    component.dragEnabled = true;
    const event = { preventDefault: vi.fn(), dataTransfer: { setData: vi.fn() } } as any;
    const pending = { ...transaction, status: 'Pending' };
    expect(component.canDragTransaction(component.views[0], pending)).toBe(false);
    component.startDrag(
      event,
      component.views.find((view) => view.kind === 'uncategorized'),
      transaction,
    );
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
