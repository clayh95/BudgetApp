import { Component, Inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { DbService } from '../core/db.service';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { collectionType, ConfirmModalButtons, ConfirmModalConfig, ICategory } from '../core/dataTypes';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-category-modal',
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

  constructor(public CATsvc: DbService, 
              public dialogRef: MatDialogRef<CategoryModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ICategory,
              public dialog: MatDialog) {
                this.origName = this.data.name;
                history.pushState(null, null, location.href);
               }

  add() {
    let doc = {
      name: this.data.name, 
      notes: this.data.notes ?? '',
      keywords: this.data.keywords, 
      budgeted: this.data.budgeted
    }
    this.CATsvc.addDocument(doc, collectionType.categories);
    this.dialogRef.close();
  }

  async update() {
    let doc = {
      name: this.data.name, 
      notes: this.data.notes ?? '',
      keywords: this.data.keywords ?? [], 
      budgeted: this.data.budgeted,
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
      matIconName: "arrow_left",
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


}
