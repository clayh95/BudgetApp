import { Component, ViewChild, ElementRef, HostListener, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { DbService } from '../core/db.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { collectionType, ConfirmModalButtons, ConfirmModalConfig, ICategory } from '../core/dataTypes';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { SharedModule } from '../shared/shared.module';
import { parseMoney } from '../core/utilities';

interface ICategoryModalData extends ICategory {
  watched?: boolean;
}

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './category-modal.component.html',
  styleUrls: ['./category-modal.component.scss'],
})
export class CategoryModalComponent {
  @ViewChild('editorActions', { static: true }) actionsTemplate: TemplateRef<unknown>;
  //Store the original cat name so we can update the
  //name for transactions tied to this category if we change it
  origName: string = '';

  //CHIPS
  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  @ViewChild('chipInput') chipInput: ElementRef;

  showPicker: boolean;
  data = { name: '', keywords: [], notes: '', budgeted: 0 } as ICategoryModalData;
  @Input() set initialData(value: ICategoryModalData) {
    if (value) {
      this.data = structuredClone(value);
      this.initialize();
    }
  }
  @Output() saved = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  saving = false;
  error = '';
  private baseline = '';
  private sourceMonth = '';
  private signature() {
    return JSON.stringify([this.data, this.budgetedDisplay, this.watched]);
  }
  get dirty() {
    return this.signature() !== this.baseline;
  }
  private initialize() {
    this.data = structuredClone(this.data);
    this.data.keywords ||= [];
    this.origName = this.data.name;
    this.budgetedDisplay = this.formatMoneyDisplay(this.data.budgeted);
    this.budgetedNegative = (parseMoney(this.data.budgeted) ?? 0) < 0;
    this.watched =
      typeof this.data.watched === 'boolean'
        ? this.data.watched
        : this.getCurrentWatchedKeys().includes(this.normalizeCategoryKey(this.data.name || ''));
    this.sourceMonth = this.CATsvc.getMonthPKValue?.() || '';
    this.baseline = this.signature();
  }
  private finish() {
    this.baseline = this.signature();
    this.saved.emit();
  }
  private async persist(operation: () => Promise<void>) {
    if (this.saving) return;
    if (!this.commitBudgeted()) return;
    this.saving = true;
    this.error = '';
    try {
      await operation();
      this.finish();
    } catch {
      this.error = 'Changes could not be saved. Your edits are still here. Please try again.';
    } finally {
      this.saving = false;
    }
  }
  private requireSaved(result: boolean | void) {
    if (result === false) throw new Error('Save failed');
  }
  budgetedDisplay: string = '';
  budgetedNegative: boolean = false;
  watched = false;

  constructor(
    public CATsvc: DbService,
    public dialog: MatDialog,
  ) {
    this.initialize();
  }

  async add() {
    return this.persist(async () => {
      const { name, notes = '', keywords = [], budgeted, emoji = '' } = this.data;
      this.requireSaved(
        await this.CATsvc.addDocument(
          { name, notes, keywords, budgeted, emoji },
          collectionType.categories,
          this.sourceMonth,
        ),
      );
      await this.persistWatchedState('', name, this.watched);
    });
  }

  async update() {
    return this.persist(async () => {
      const { name, notes = '', keywords = [], budgeted, emoji = '' } = this.data;
      this.requireSaved(
        await this.CATsvc.updateDocument(
          this.data.id,
          collectionType.categories,
          { name, notes, keywords, budgeted, emoji },
          this.sourceMonth,
        ),
      );
      if (name !== this.origName) await this.updateRelatedTransactions(name);
      await this.persistWatchedState(this.origName, name, this.watched);
    });
  }

  delete() {
    const controlConfig: ConfirmModalConfig = {
      title: 'Delete Category?',
      matIconName: 'chevron_left',
      message: 'Delete this category?',
      buttons: [ConfirmModalButtons.yes, ConfirmModalButtons.no],
    };
    const dialogConfig: MatDialogConfig = {
      maxWidth: '90vw',
      data: controlConfig,
      autoFocus: false,
      disableClose: true,
    };
    const dialogRef = this.dialog.open(ConfirmModalComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.persist(async () => {
          this.requireSaved(await this.CATsvc.deleteDocument(this.data, collectionType.categories, this.sourceMonth));
          await this.persistWatchedState(this.origName, '', false);
          await this.updateRelatedTransactions('');
        });
      }
    });
  }

  async updateRelatedTransactions(newName: string) {
    if (this.origName == '') {
      return;
    }
    const querySnap = await this.CATsvc.getQuerySnapshot(
      collectionType.transactions,
      'category',
      '==',
      this.origName,
      this.sourceMonth,
    );
    for (const doc of querySnap.docs || []) {
      this.requireSaved(
        await this.CATsvc.updateDocument(doc.id, collectionType.transactions, { category: newName }, this.sourceMonth),
      );
    }
  }

  addKeyword(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;
    if ((value || '').trim()) this.data.keywords.push(value.trim());
    if (input) input.value = '';
    this.chipInput.nativeElement.focus();
  }

  removeKeyword(kw: string): void {
    this.data.keywords.splice(this.data.keywords.indexOf(kw), 1);
  }

  addEmoji(event) {
    this.data.emoji = event.emoji.native;
  }

  toggleEmojiPicker(event) {
    event.stopPropagation();
    this.showPicker = !this.showPicker;
  }

  @HostListener('document:click', ['$event']) onDocumentClick(event) {
    this.showPicker = false;
  }

  getPickerFieldClass() {
    if (this.showPicker) {
      return 'image-picker-selected';
    } else {
      return 'image-picker-unselected';
    }
  }

  close() {
    this.dismiss.emit();
  }

  toggleWatched() {
    this.watched = !this.watched;
  }

  onBudgetedInput(value: string) {
    this.budgetedDisplay = value;
  }

  commitBudgeted() {
    const parsed = parseMoney(this.budgetedDisplay);
    if (parsed === null) {
      window.alert('Please enter a valid budgeted amount.');
      return false;
    }
    const signed = this.budgetedNegative ? -Math.abs(parsed) : Math.abs(parsed);
    this.data.budgeted = signed;
    const abs = Math.abs(parsed).toFixed(2);
    this.budgetedDisplay = this.budgetedNegative ? `-${abs}` : abs;
    return true;
  }

  private formatMoneyDisplay(value: unknown): string {
    const parsed = parseMoney(value);
    if (parsed === null) {
      return '';
    }
    const abs = Math.abs(parsed).toFixed(2);
    return parsed < 0 ? `-${abs}` : abs;
  }

  onBudgetedSignChange(value: 'neg' | 'pos') {
    this.budgetedNegative = value === 'neg';
    const current = parseMoney(this.budgetedDisplay);
    if (current === null) {
      this.budgetedDisplay = this.budgetedNegative ? '-0.00' : '0.00';
    } else {
      const abs = Math.abs(current).toFixed(2);
      this.budgetedDisplay = this.budgetedNegative ? `-${abs}` : abs;
    }
    this.commitBudgeted();
  }

  private normalizeCategoryKey(value: string): string {
    return (value || '').trim().toLowerCase();
  }

  private getCurrentWatchedKeys(): string[] {
    return this.CATsvc.dashboardPreferences.getValue()?.watchedCategoryKeys || [];
  }

  private async persistWatchedState(previousName: string, currentName: string, watched: boolean) {
    const previousKey = this.normalizeCategoryKey(previousName);
    const currentKey = this.normalizeCategoryKey(currentName);
    const currentPreferences = this.CATsvc.dashboardPreferences.getValue() || {
      watchedCategoryKeys: [],
      watchedVendorKeys: [],
    };
    const nextWatchedKeys = currentPreferences.watchedCategoryKeys.filter(
      (key) => key !== previousKey && key !== currentKey,
    );

    if (watched && currentKey) {
      nextWatchedKeys.push(currentKey);
    }

    await this.CATsvc.saveDashboardPreferences({
      watchedCategoryKeys: Array.from(new Set(nextWatchedKeys)),
      watchedVendorKeys: currentPreferences.watchedVendorKeys || [],
    });
  }
}
