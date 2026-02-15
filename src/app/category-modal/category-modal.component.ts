import { Component, Inject, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { DbService } from '../core/db.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { collectionType, ConfirmModalButtons, ConfirmModalConfig, ICategory } from '../core/dataTypes';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { SharedModule } from '../shared/shared.module';
import { parseMoney } from '../core/utilities';

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
  data = inject<ICategory>(MAT_DIALOG_DATA);
  budgetedDisplay: string = '';
  budgetedNegative: boolean = false;

  constructor(public CATsvc: DbService, 
              public dialogRef: MatDialogRef<CategoryModalComponent>,
              public dialog: MatDialog) {
                this.origName = this.data.name;
                this.budgetedDisplay = this.formatMoneyDisplay(this.data.budgeted);
                this.budgetedNegative = (parseMoney(this.data.budgeted) ?? 0) < 0;
                history.pushState(null, null, location.href);
               }

  add() {
    const budgeted = parseMoney(this.data.budgeted);
    if (budgeted === null) {
      window.alert('Please enter a valid budgeted amount.');
      return;
    }
    let doc = {
      name: this.data.name, 
      notes: this.data.notes ?? '',
      keywords: this.data.keywords, 
      budgeted: budgeted
    }
    this.CATsvc.addDocument(doc, collectionType.categories);
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
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.CATsvc.deleteDocument(this.data, collectionType.categories);
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


}
