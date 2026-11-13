import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { A11yModule } from '@angular/cdk/a11y';
import { SharedModule } from '../shared/shared.module';
import { IVendorLogoRule } from '../core/utilities';
import { SummaryView } from './summary-model';
import {
  SummarySearch,
  SummaryTransactionResult,
  emptySummarySearch,
  hasSummarySearch,
  summaryTransactionResults,
} from './summary-search';
import { SearchHighlightPipe } from './search-highlight.pipe';

@Component({
  selector: 'app-summary-search',
  standalone: true,
  imports: [SharedModule, OverlayModule, A11yModule, SearchHighlightPipe],
  templateUrl: './summary-search.component.html',
  styleUrls: ['./summary-search.component.scss'],
})
export class SummarySearchComponent implements OnChanges, OnDestroy {
  @Input() mobile = false;

  @Input() search: SummarySearch = emptySummarySearch();

  @Input() views: SummaryView[] = [];

  @Input() results: SummaryView[] = [];

  @Input() mappings: IVendorLogoRule[] = [];

  @Output() searchChange = new EventEmitter<SummarySearch>();

  @Output() showAll = new EventEmitter<void>();

  @Output() categorySelected = new EventEmitter<SummaryView>();

  @Output() transactionSelected = new EventEmitter<SummaryTransactionResult>();

  @ViewChild('desktopInput') desktopInput?: ElementRef<HTMLInputElement>;

  @ViewChild('mobileTrigger') mobileTrigger?: ElementRef<HTMLButtonElement>;

  @ViewChild('panel') panel?: ElementRef<HTMLElement>;

  @ViewChild('searchPanel', { static: true }) searchPanel!: TemplateRef<unknown>;

  private readonly overlay = inject(Overlay);

  private readonly viewContainer = inject(ViewContainerRef);

  private mobileOverlay: OverlayRef | null = null;

  private isOpen = false;

  get open() {
    return this.isOpen;
  }

  set open(value: boolean) {
    if (value === this.isOpen) return;
    this.isOpen = value;
    if (!value) {
      this.mobileOverlay?.dispose();
      this.mobileOverlay = null;
    } else if (this.mobile) {
      // A global strategy centers against the viewport, independent of the button
      // and the connected overlay's computed bounding box or transforms.
      this.mobileOverlay = this.overlay.create({
        positionStrategy: this.overlay.position().global().centerHorizontally().top('80px'),
        width: 'calc(100% - 24px)',
        maxWidth: '460px',
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-transparent-backdrop',
        scrollStrategy: this.overlay.scrollStrategies.block(),
      });
      this.mobileOverlay.backdropClick().subscribe(() => this.close());
      this.mobileOverlay.attach(new TemplatePortal(this.searchPanel, this.viewContainer));
    }
  }

  ngOnDestroy() {
    this.mobileOverlay?.dispose();
  }

  readonly positions = [
    {
      originX: 'center' as const,
      originY: 'bottom' as const,
      overlayX: 'center' as const,
      overlayY: 'top' as const,
      offsetY: 8,
    },
    {
      originX: 'center' as const,
      originY: 'top' as const,
      overlayX: 'center' as const,
      overlayY: 'bottom' as const,
      offsetY: -8,
    },
  ];

  get active() {
    return hasSummarySearch(this.search);
  }

  get activeFilterCount() {
    return (this.search.query.trim() ? 1 : 0) + (this.search.category !== null ? 1 : 0) + (this.search.vendor ? 1 : 0);
  }

  get count() {
    return this.results.reduce((count, view) => count + view.transactions.length, 0);
  }

  get transactions() {
    return this.active ? summaryTransactionResults(this.results).slice(0, 5) : [];
  }

  get categories() {
    const query = this.search.query.trim().toLowerCase();
    return this.views.filter((view) => view.kind !== 'pending' && view.category.name.toLowerCase().includes(query));
  }

  get vendors() {
    const query = this.search.query.trim().toLowerCase();
    const unique = new Map<string, { name: string; logo: string }>();
    for (const mapping of this.mappings) {
      const name = (mapping.vendorName || '').trim();
      if (name && name.toLowerCase().includes(query) && !unique.has(name.toLowerCase())) {
        unique.set(name.toLowerCase(), { name, logo: mapping.logoUrl });
      }
    }
    return [...unique.values()];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.mobile) this.open = false;
  }

  change(query: string) {
    this.searchChange.emit({ ...this.search, query });
  }

  clearAll() {
    this.searchChange.emit(emptySummarySearch());
  }

  remove(kind: 'category' | 'vendor') {
    this.searchChange.emit({ ...this.search, [kind]: null });
  }

  selectCategory(view: SummaryView) {
    this.searchChange.emit({
      ...this.search,
      category: view.kind === 'uncategorized' ? '' : view.category.name,
      query: '',
    });
    this.close(false);
    this.categorySelected.emit(view);
  }

  selectVendor(name: string) {
    this.searchChange.emit({ ...this.search, vendor: name, query: '' });
    this.close();
  }

  selectTransaction(result: SummaryTransactionResult) {
    this.close(false);
    this.transactionSelected.emit(result);
  }

  all() {
    this.close(false);
    this.showAll.emit();
  }

  close(restoreFocus = true) {
    this.open = false;
    if (restoreFocus) (this.mobile ? this.mobileTrigger : this.desktopInput)?.nativeElement.focus();
  }

  inputKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open = true;
      setTimeout(() => this.panel?.nativeElement.querySelector<HTMLButtonElement>('.suggestion')?.focus());
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.all();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  panelKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || (event.target as HTMLElement).tagName === 'INPUT') return;
    const buttons = Array.from(this.panel.nativeElement.querySelectorAll<HTMLButtonElement>('.suggestion'));
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
  }
}
