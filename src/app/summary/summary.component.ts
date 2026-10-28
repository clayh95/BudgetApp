import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  NgZone,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { DbService } from '../core/db.service';
import { combineLatest, Subscription, firstValueFrom } from 'rxjs';
import { collectionType, ICategory, ITransaction } from '../core/dataTypes';
import { default as _rollupMoment } from 'moment';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { formatCurrency, getLocaleId } from '@angular/common';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
import { getIcon, getPosNegColor } from '../core/utilities';
import { CarryBalancesModalComponent } from '../carry-balances-modal/carry-balances-modal.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ConfirmModalButtons, ConfirmModalConfig } from '../core/dataTypes';
const moment = _rollupMoment;
import { SharedModule } from '../shared/shared.module';
import { ActivatedRoute } from '@angular/router';
import { SectionDrawerComponent } from '../section-drawer/section-drawer.component';
import { buildSummary, SummaryView, isPending } from './summary-model';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [SharedModule, SectionDrawerComponent, CategoryModalComponent, AddTransactionComponent],
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
})
export class SummaryComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(
    public service: DbService,
    public dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private route: ActivatedRoute,
  ) {}

  catsTrans: Subscription;
  actualIncome: number;
  spent: number;
  totalBudgeted: number;
  reportCats: IReportCategory[];
  incomeData: IReportCategory;
  pendingTransactions: ITransaction[];
  totalPending: number;
  private focusCategoryId: string | null = null;
  private focusCategoryName: string | null = null;
  private focusSection: 'pending' | 'uncategorized' | null = null;
  private focusApplied = false;

  views: SummaryView[] = [];
  selectedKey: string | null = null;
  pinnedKey: string | null = null;
  activeKey: string | null = null;
  mobileDetail = false;
  isMobile = false;
  canCompare = false;
  dragEnabled = false;
  viewportHeight: number | null = null;
  notice = '';
  moving = false;
  dropKey: string | null = null;
  private dragged: ITransaction | null = null;
  private draggedMonth = '';
  private dragEnded = 0;
  private currentMonth = '';
  private subscriptions = new Subscription();
  private resizeObserver?: ResizeObserver;
  private initialLayoutTimer: ReturnType<typeof setTimeout>;
  private layoutTimer: ReturnType<typeof setTimeout>;
  private scrollPositions = new Map<string, number>();
  @ViewChild('workspaceRoot', { static: true }) workspaceRoot: ElementRef<HTMLElement>;

  private monthGuard = () => this.canDeactivate();

  ngOnInit() {
    this.service.beforeMonthChange = this.monthGuard;
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        this.focusCategoryId = params.get('focusCategoryId');
        this.focusCategoryName = params.get('focusCategoryName');
        const section = params.get('focusSection');
        this.focusSection = section === 'pending' || section === 'uncategorized' ? section : null;
        this.focusApplied = false;
        this.applyFocusCategoryIfNeeded();
      }),
    );
    this.subscriptions.add(
      this.service.monthYear.subscribe((month) => {
        if (this.currentMonth && month !== this.currentMonth) {
          this.selectedKey = this.pinnedKey = this.activeKey = null;
          this.mobileDetail = false;
          this.scrollPositions.clear();
          this.focusApplied = true;
          this.notice = '';
        }
        this.currentMonth = month;
      }),
    );
    this.subscriptions.add(
      this.service.monthSummary.subscribe((value) => {
        if (this.drawerKind === 'notes' && !this.notesDirty && !this.notesSaving) this.notesDraft = value || '';
      }),
    );
    this.catsTrans = combineLatest([this.service.categories, this.service.transactions]).subscribe(([cats, trans]) => {
      this.zone.run(() => {
        const model = buildSummary(cats, trans);
        this.views = model.views;
        this.reportCats = model.reportCats;
        this.incomeData = model.income;
        this.pendingTransactions = model.views.find((v) => v.kind === 'pending').transactions;
        this.actualIncome = model.actualIncome;
        this.totalBudgeted = model.totalBudgeted;
        this.spent = model.spent;
        this.totalPending = model.totalPending;
        if (this.selectedKey && !this.views.some((v) => v.key === this.selectedKey)) this.selectedKey = null;
        if (this.pinnedKey && !this.views.some((v) => v.key === this.pinnedKey)) this.pinnedKey = null;
        this.applyFocusCategoryIfNeeded();
        this.queueLayout();
        this.cdr.markForCheck();
      });
    });
  }

  ngAfterViewInit() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.zone.run(() => this.updateLayout()));
      this.resizeObserver.observe(this.workspaceRoot.nativeElement);
    }
    this.initialLayoutTimer = setTimeout(() => this.updateLayout());
  }

  @HostListener('window:resize') updateLayout() {
    const width = this.workspaceRoot?.nativeElement.clientWidth || window.innerWidth;
    const top = this.workspaceRoot?.nativeElement.getBoundingClientRect().top || 0;
    this.viewportHeight = Math.max(320, window.innerHeight - top - (width < 700 ? 44 : 24));
    this.isMobile = width < 700;
    this.canCompare = width >= 1100;
    this.dragEnabled = width >= 850 && !!window.matchMedia?.('(pointer: fine)').matches;
    this.queueLayout();
    this.cdr.markForCheck();
  }

  get visibleViews(): SummaryView[] {
    const find = (key: string) => this.views.find((v) => v.key === key);
    if (this.canCompare && this.selectedKey && this.pinnedKey && this.selectedKey !== this.pinnedKey) {
      return [find(this.selectedKey), find(this.pinnedKey)].filter(Boolean);
    }
    const view = find((!this.canCompare && this.activeKey) || this.selectedKey || this.pinnedKey);
    return view ? [view] : [];
  }

  selectView(view: SummaryView) {
    this.activeKey = view.key;
    if (view.key !== this.pinnedKey) this.selectedKey = view.key;
    this.mobileDetail = true;
    this.queueLayout(view.key);
    this.cdr.markForCheck();
  }

  pinView(view: SummaryView) {
    if (this.pinnedKey === view.key) {
      this.pinnedKey = null;
      this.selectedKey = this.activeKey || this.selectedKey || view.key;
    } else {
      this.pinnedKey = view.key;
      if (this.selectedKey === view.key) this.selectedKey = null;
      this.activeKey = view.key;
    }
    this.queueLayout(view.key);
    this.cdr.markForCheck();
  }

  backToCategories() {
    this.mobileDetail = false;
    this.queueLayout('__categories');
    this.cdr.markForCheck();
  }

  rememberScroll(key: string, event: Event) {
    const target = event.target as HTMLElement;
    if (!target.getClientRects().length) return;
    this.scrollPositions.set(key, target.scrollTop);
    this.drawConnections();
  }

  private queueLayout(focusKey?: string) {
    clearTimeout(this.layoutTimer);
    this.layoutTimer = setTimeout(() => {
      const root = this.workspaceRoot?.nativeElement;
      if (!root) return;
      root.querySelectorAll<HTMLElement>('[data-scroll-key]').forEach((el) => {
        if (!el.getClientRects().length) return;
        el.scrollTop = this.scrollPositions.get(el.dataset.scrollKey) || 0;
      });
      this.drawConnections();
      if (focusKey) {
        const target =
          focusKey === '__categories'
            ? root.querySelector<HTMLElement>('[data-category-key].is-active, [data-category-key]')
            : root.querySelector<HTMLElement>(`[data-pane-key="${focusKey}"] .pane-heading`);
        target?.focus({ preventScroll: true });
      }
    });
  }

  @ViewChild(CategoryModalComponent) categoryEditor?: CategoryModalComponent;
  @ViewChild(AddTransactionComponent) transactionEditor?: AddTransactionComponent;
  categoryDraft: ICategory | null = null;
  transactionDraft: ITransaction[] | null = null;
  private drawerTrigger: HTMLElement | null = null;
  drawerKind: 'notes' | 'category' | 'transaction' | null = null;
  drawerOrigin: SummaryView | null = null;
  notesDraft = '';
  notesDirty = false;
  notesSaving = false;
  notesError = '';
  private notesMonth = '';
  private notesSave: Promise<boolean> | null = null;
  get drawerTitle() {
    return this.drawerKind === 'notes'
      ? 'Month notes'
      : this.drawerKind === 'category'
        ? 'Edit category'
        : 'Edit transaction';
  }
  get drawerAccent() {
    return !this.drawerOrigin ? '#bdbdbd' : this.drawerOrigin.key === this.pinnedKey ? '#7b1fa2' : '#3b8d5f';
  }
  async openNotes() {
    if (!(await this.requestCloseDrawer())) return;
    this.drawerTrigger = document.activeElement as HTMLElement;
    this.notesMonth = this.service.getMonthPKValue();
    this.notesDraft = this.service.monthSummary.getValue() || '';
    this.notesDirty = false;
    this.notesError = '';
    this.drawerOrigin = null;
    this.drawerKind = 'notes';
  }
  async saveNotes(): Promise<boolean> {
    if (this.notesSave) {
      if (!(await this.notesSave)) return false;
      return this.saveNotes();
    }
    if (!this.notesDirty) return true;
    const text = this.notesDraft,
      month = this.notesMonth;
    this.notesSaving = true;
    this.notesError = '';
    this.notesSave = (async () => {
      try {
        const saved = await this.service.updateDocument(month, collectionType.monthsPK, { summary: text });
        if (saved === false) throw new Error('Notes save failed');
        if (text === this.notesDraft) this.notesDirty = false;
        return true;
      } catch {
        this.notesError = 'Notes could not be saved. Your text is still here.';
        return false;
      } finally {
        this.notesSaving = false;
        this.notesSave = null;
        this.cdr.markForCheck();
      }
    })();
    return this.notesSave;
  }
  async requestCloseDrawer(): Promise<boolean> {
    if (!this.drawerKind) return true;
    const editor =
      this.drawerKind === 'category'
        ? this.categoryEditor
        : this.drawerKind === 'transaction'
          ? this.transactionEditor
          : null;
    if (editor?.saving) return false;
    if (editor?.dirty) {
      const ref = this.dialog.open(ConfirmModalComponent, {
        width: '400px',
        maxWidth: '90vw',
        disableClose: true,
        data: {
          title: 'Discard unsaved changes?',
          message: 'Your edits have not been saved. Discard them?',
          buttons: [ConfirmModalButtons.yes, ConfirmModalButtons.no],
          matIconName: 'edit_off',
        },
      });
      if (!(await firstValueFrom(ref.afterClosed()))) return false;
    }
    if (this.drawerKind === 'notes' && !(await this.saveNotes())) return false;
    this.editorFinished();
    return true;
  }
  editorFinished() {
    this.drawerKind = null;
    this.drawerOrigin = null;
    this.categoryDraft = null;
    this.transactionDraft = null;
    const trigger = this.drawerTrigger;
    setTimeout(() => {
      if (this.drawerKind) return;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      else
        this.workspaceRoot?.nativeElement.querySelector<HTMLElement>('.pane-heading')?.focus({ preventScroll: true });
    });
  }
  async canDeactivate(): Promise<boolean> {
    return this.requestCloseDrawer();
  }
  @HostListener('window:beforeunload', ['$event']) guardBrowserExit(event: BeforeUnloadEvent) {
    if (
      this.notesDirty ||
      this.categoryEditor?.dirty ||
      this.transactionEditor?.dirty ||
      this.categoryEditor?.saving ||
      this.transactionEditor?.saving
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  connectors: { path: string; color: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  connectionViewBox = '0 0 1 1';
  drawConnections() {
    const root = this.workspaceRoot?.nativeElement;
    const workspace = root?.querySelector<HTMLElement>('.workspace');
    const rail = root?.querySelector<HTMLElement>('.category-list');
    const list = root?.querySelector<HTMLElement>('.category-scroll');
    if (!workspace || !rail || !list || this.isMobile) {
      this.connectors = [];
      return;
    }
    const bounds = workspace.getBoundingClientRect(),
      edge = rail.getBoundingClientRect(),
      clip = list.getBoundingClientRect();
    this.connectionViewBox = `0 0 ${Math.max(bounds.width, 1)} ${Math.max(bounds.height, 1)}`;
    const paths: { path: string; color: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    root.querySelectorAll<HTMLElement>('[data-pane-key]').forEach((pane) => {
      const key = pane.dataset.paneKey;
      const source = Array.from(root.querySelectorAll<HTMLElement>('[data-category-key]')).find(
        (el) => el.dataset.categoryKey === key,
      );
      if (!source) return;
      const from = source.getBoundingClientRect(),
        to = pane.getBoundingClientRect();
      const center = from.top + from.height / 2;
      if (!to.width || center < clip.top || center > clip.bottom) return;
      const x1 = edge.right - bounds.left,
        y1 = center - bounds.top;
      const x2 = to.left - bounds.left,
        y2 = to.top - bounds.top + 30;
      const pinned = key === this.pinnedKey,
        lane = x1 + (pinned ? 10 : 20);
      paths.push({
        x1,
        y1,
        x2,
        y2,
        color: pinned ? '#7b1fa2' : '#3b8d5f',
        path: `M ${x1} ${y1} H ${lane} V ${y2} H ${x2}`,
      });
    });
    this.connectors = paths;
    this.cdr.markForCheck();
  }
  trackView(index: number, view: SummaryView) {
    return view.key;
  }
  trackTransaction(index: number, transaction: ITransaction) {
    return transaction.id;
  }
  isSelected(view: SummaryView) {
    return this.visibleViews.some((v) => v.key === view.key);
  }
  isPendingTransaction = isPending;
  canDragTransaction(view: SummaryView, transaction: ITransaction) {
    return this.dragEnabled && !this.moving && view.kind !== 'pending' && !isPending(transaction);
  }
  startDrag(event: DragEvent, view: SummaryView, transaction: ITransaction) {
    if (!this.canDragTransaction(view, transaction)) {
      event.preventDefault();
      return;
    }
    this.dragged = transaction;
    this.draggedMonth = this.service.getMonthPKValue();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', transaction.id);
  }
  endDrag() {
    this.dragged = null;
    this.dropKey = null;
    this.dragEnded = Date.now();
  }
  allowDrop(event: DragEvent, view: SummaryView) {
    if (!this.validDrop(view)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    this.dropKey = view.key;
    const target = event.currentTarget as HTMLElement;
    const list = target.closest<HTMLElement>('[data-scroll-key="__categories"]');
    if (list) {
      const bounds = list.getBoundingClientRect();
      if (event.clientY < bounds.top + 40) list.scrollTop -= 12;
      if (event.clientY > bounds.bottom - 40) list.scrollTop += 12;
    }
  }
  private validDrop(view: SummaryView) {
    const latest = this.dragged && this.service.transactions.getValue().find((t) => t.id === this.dragged.id);
    return (
      latest &&
      !isPending(latest) &&
      view.kind !== 'pending' &&
      this.draggedMonth === this.service.getMonthPKValue() &&
      latest.category !== (view.kind === 'uncategorized' ? '' : view.category.name)
    );
  }

  async dropTransaction(event: DragEvent, view: SummaryView) {
    event.preventDefault();
    if (!this.validDrop(view)) {
      this.endDrag();
      return;
    }
    const transaction = this.dragged;
    const month = this.draggedMonth;
    this.endDrag();
    this.moving = true;
    this.notice = '';
    try {
      const saved = await this.service.updateDocument(
        transaction.id,
        collectionType.transactions,
        { category: view.kind === 'uncategorized' ? '' : view.category.name },
        month,
      );
      this.notice =
        saved === false ? 'Could not move the transaction. Please try again.' : `Moved to ${view.category.name}.`;
    } catch {
      this.notice = 'Could not move the transaction. Please try again.';
    } finally {
      this.moving = false;
      this.cdr.markForCheck();
    }
  }

  getColor(item: IReportCategory) {
    return getPosNegColor(item.category.budgeted, item.category.spent);
  }

  getIncomeColor() {
    if (this.actualIncome - (this.incomeData?.category.budgeted || 0) < 0) {
      return 'red';
    } else {
      return 'green';
    }
  }

  getEmoji(): string[] {
    if (this.actualIncome === this.totalBudgeted) {
      return ['Everything is balanced!', '🙌'];
    } else if (this.actualIncome > this.totalBudgeted) {
      return [
        `We have ${formatCurrency(this.actualIncome - this.totalBudgeted, getLocaleId('en-US'), '', 'USD')}  we can still budget!`,
        '😃',
      ];
    } else if (this.actualIncome < this.totalBudgeted) {
      return [
        `We are overbudgeted by ${formatCurrency(this.totalBudgeted - this.actualIncome, getLocaleId('en-US'), '', 'USD')}`,
        '😬',
      ];
    } else {
      return ['', ''];
    }
  }

  getIconFromUtils(description: string): string {
    return getIcon(description, this.service.vendorMappings.getValue() || []);
  }

  private applyFocusCategoryIfNeeded() {
    if (this.focusApplied || !this.views.length) return;
    if (!this.focusCategoryId && !this.focusCategoryName && !this.focusSection) {
      this.focusApplied = true;
      return;
    }
    const match = this.views.find((v) =>
      this.focusSection
        ? v.kind === this.focusSection
        : this.focusCategoryId
          ? v.category.id === this.focusCategoryId
          : v.category.name.trim().toLowerCase() === this.focusCategoryName.trim().toLowerCase(),
    );
    if (!match) return;
    this.focusApplied = true;
    this.selectView(match);
  }

  async editTransaction(transaction: ITransaction, origin?: SummaryView) {
    if (Date.now() - this.dragEnded < 250 || !(await this.requestCloseDrawer())) return;
    const month = this.service.getMonthPKValue();
    this.drawerTrigger = document.activeElement as HTMLElement;
    try {
      const data = await this.service.getTransactionsForEdit(transaction);
      if (month !== this.service.getMonthPKValue()) return;
      this.transactionDraft = data;
      this.drawerOrigin = origin || null;
      this.drawerKind = 'transaction';
      this.cdr.markForCheck();
    } catch {
      this.notice = 'Could not open this transaction. Please try again.';
    }
  }

  async editCategory(event: Event, category: ICategory) {
    event.stopPropagation();
    if (!(await this.requestCloseDrawer())) return;
    this.drawerTrigger = document.activeElement as HTMLElement;
    this.categoryDraft = structuredClone(category);
    this.drawerOrigin = this.views.find((v) => v.category.id === category.id) || null;
    this.drawerKind = 'category';
  }

  balanceFromUnbudgeted(event, item: IReportCategory) {
    event.stopPropagation();
    if (!item?.category?.id) {
      return;
    }
    const available = this.getUnbudgetedAmount();
    const needed = +(item.category.spent - item.category.budgeted).toFixed(2);
    if (available <= 0 || needed <= 0 || available < needed) {
      return;
    }

    const message = `Balance this category with ${formatCurrency(needed, getLocaleId('en-US'), '', 'USD')} from unbudgeted?`;
    const controlConfig: ConfirmModalConfig = {
      title: 'Balance from Unbudgeted',
      message,
      buttons: [ConfirmModalButtons.yes, ConfirmModalButtons.no],
      matIconName: 'chevron_left',
    };
    const dialogConfig: MatDialogConfig = {
      data: controlConfig,
      width: '400px',
      maxWidth: '90vw',
      autoFocus: false,
      disableClose: true,
    };
    const dialogRef = this.dialog.open(ConfirmModalComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      const newBudgeted = +(Number(item.category.budgeted) + needed).toFixed(2);
      this.service.updateDocument(item.category.id, collectionType.categories, { budgeted: newBudgeted });
    });
  }

  carryAmounts() {
    const list: Array<ITransaction> = [];
    this.reportCats
      .filter((c) => c.category.budgeted - c.category.spent != 0)
      .map((c) => {
        const m = this.service.monthYear.getValue();
        const d = new Date(`${m.split('/')[0]}/01/${m.split('/')[1]}`);
        const dPlus = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const t = <ITransaction>{
          description: `${c.category.name} Starting Balance`,
          amount: +(c.category.budgeted - c.category.spent).toFixed(2),
          category: c.category.name,
          date: moment(dPlus).format('MM/DD/YYYY'),
          notes: '',
          status: 'Posted',
        };
        list.push(t);
      });
    const carryBalancesRef = this.dialog.open(CarryBalancesModalComponent, {
      width: '1600px',
      maxWidth: '90vw',
      data: list,
      autoFocus: false,
    });
  }

  getPercentage(budgeted: number): number {
    return budgeted / this.totalBudgeted;
  }

  getUnbudgetedAmount(): number {
    if (this.actualIncome === undefined || this.totalBudgeted === undefined) {
      return 0;
    }
    return +(this.actualIncome - this.totalBudgeted).toFixed(2);
  }

  canBalanceCategory(item: IReportCategory): boolean {
    if (!item?.category?.id) {
      return false;
    }
    const available = this.getUnbudgetedAmount();
    const needed = +(item.category.spent - item.category.budgeted).toFixed(2);
    return !(available <= 0 || needed <= 0 || available < needed);
  }

  ngOnDestroy() {
    if (this.service.beforeMonthChange === this.monthGuard) this.service.beforeMonthChange = null;
    this.catsTrans?.unsubscribe();
    this.subscriptions.unsubscribe();
    this.resizeObserver?.disconnect();
    clearTimeout(this.layoutTimer);
    clearTimeout(this.initialLayoutTimer);
  }
}

type IReportCategory = SummaryView;
