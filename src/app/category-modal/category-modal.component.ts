import { Component, Inject, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { DbService } from '../core/db.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  styleUrls: ['./category-modal.component.scss']
})
export class CategoryModalComponent {
  //Store the original cat name so we can update the 
  //name for transactions tied to this category if we change it
  origName: string = ''; 

  //CHIPS
  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  @ViewChild("chipInput") chipInput: ElementRef;

  showPicker: boolean;
  data = inject<ICategoryModalData>(MAT_DIALOG_DATA);
  budgetedDisplay: string = '';
  budgetedNegative: boolean = false;
  watched = false;

  constructor(public CATsvc: DbService, 
              public dialogRef: MatDialogRef<CategoryModalComponent>,
              public dialog: MatDialog) {
                this.origName = this.data.name;
                this.budgetedDisplay = this.formatMoneyDisplay(this.data.budgeted);
                this.budgetedNegative = (parseMoney(this.data.budgeted) ?? 0) < 0;
                this.watched = typeof this.data?.watched === 'boolean'
                  ? this.data.watched
                  : this.getCurrentWatchedKeys().includes(this.normalizeCategoryKey(this.data?.name || ''));
                history.pushState(null, null, location.href);
               }

  async add() {
    const budgeted = parseMoney(this.data.budgeted);
    if (budgeted === null) {
      window.alert('Please enter a valid budgeted amount.');
      return;
    }
    let doc = {
      name: this.data.name, 
      notes: this.data.notes ?? '',
      keywords: this.data.keywords, 
      budgeted: budgeted,
      emoji: this.data.emoji ?? ''
    }
    await this.CATsvc.addDocument(doc, collectionType.categories);
    await this.persistWatchedState('', this.data.name, this.watched);
    this.dialogRef.close();
  }

  async update() {
    const budgeted = parseMoney(this.data.budgeted);
    if (budgeted === null) {
      window.alert('Please enter a valid budgeted amount.');
      return;
    }
    let doc = {
      name: this.data.name, 
      notes: this.data.notes ?? '',
      keywords: this.data.keywords ?? [], 
      budgeted: budgeted,
      emoji: this.data.emoji ?? ''
    }
    await this.CATsvc.updateDocument(this.data.id, collectionType.categories, doc);
    this.updateRelatedTransactions(this.data.name);
    await this.persistWatchedState(this.origName, this.data.name, this.watched);
    this.dialogRef.close();
  }

  delete() {
    const elem = document.getElementById("deleteButton");
    const rect = elem.getBoundingClientRect();
    const x:number = rect.right;
    const y:number = rect.top;
    let controlConfig: ConfirmModalConfig = {
      title: "Delete Category?",
      matIconName: "chevron_left",
      message: "Delete this category?", 
      buttons:[ConfirmModalButtons.yes, ConfirmModalButtons.no]
    };
    let dialogConfig: MatDialogConfig = {
      position: {
        left: `${x.toString()}px`,
        top: `${y.toString()}px`,
      },
      data: controlConfig,
      autoFocus: false,
      disableClose: true
    }
    let dialogRef = this.dialog.open(ConfirmModalComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        await this.CATsvc.deleteDocument(this.data, collectionType.categories);
        await this.persistWatchedState(this.origName, '', false);
        this.updateRelatedTransactions('');
        this.dialogRef.close();
      }
    });
  }

  async updateRelatedTransactions(newName:string) {
    if (this.origName == "") { return }
    var querySnap = await this.CATsvc.getQuerySnapshot(collectionType.transactions, "category", "==", this.origName);
    querySnap.docs?.forEach(doc => {
      this.CATsvc.updateDocument(doc.id, collectionType.transactions, {category: newName});
    });
  }
  
  addKeyword(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;
    if ((value || '').trim()) this.data.keywords.push(value.trim());
    if (input) input.value = '';
    this.chipInput.nativeElement.focus();
  }
  
  removeKeyword(kw: string): void {
    this.data.keywords.splice(this.data.keywords.indexOf(kw));
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
    }
    else {
      return 'image-picker-unselected';
    }
  }

  close() {
    this.dialogRef.close();
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
      return;
    }
    const signed = this.budgetedNegative ? -Math.abs(parsed) : Math.abs(parsed);
    this.data.budgeted = signed;
    const abs = Math.abs(parsed).toFixed(2);
    this.budgetedDisplay = this.budgetedNegative ? `-${abs}` : abs;
  }

  private formatMoneyDisplay(value: unknown): string {
    const parsed = parseMoney(value);
    if (parsed === null) { return ''; }
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
    const currentPreferences = this.CATsvc.dashboardPreferences.getValue() || { watchedCategoryKeys: [], watchedVendorKeys: [] };
    const nextWatchedKeys = currentPreferences.watchedCategoryKeys
      .filter(key => key !== previousKey && key !== currentKey);

    if (watched && currentKey) {
      nextWatchedKeys.push(currentKey);
    }

    await this.CATsvc.saveDashboardPreferences({
      watchedCategoryKeys: Array.from(new Set(nextWatchedKeys)),
      watchedVendorKeys: currentPreferences.watchedVendorKeys || []
    });
  }


}
