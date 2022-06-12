import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
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
  //CHIPS

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
      notes: this.data.notes,
      keywords: this.data.keywords, 
      budgeted: this.data.budgeted
    }
    this.CATsvc.addDocument(doc, collectionType.categories);
    this.dialogRef.close();
  }

  async update() {
    let doc = {
      name: this.data.name, 
      notes: this.data.notes,
      keywords: this.data.keywords ?? [], 
      budgeted: this.data.budgeted
    }
    await this.CATsvc.updateDocument(this.data.id, collectionType.categories, doc);
    this.updateRelatedTransactions(this.data.name);
    this.dialogRef.close();
  }

  delete() {
    let controlConfig: ConfirmModalConfig = {
      title: "Delete Category?", 
      message: "Are you sure you want to delete this category?", 
      buttons:[ConfirmModalButtons.yes, ConfirmModalButtons.no]
    };
    let dialogConfig: MatDialogConfig = {
      width: '500px',
      height: '200px',
      position: {
        left: '',
        top: ''
      },
      data: controlConfig,
      autoFocus: false
    }
    let dialogRef = this.dialog.open(ConfirmModalComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        alert('here');
        // this.CATsvc.deleteDocument(this.data, collectionType.categories);
        // this.updateRelatedTransactions('');
        // this.dialogRef.close();
      }
    })
    // if (confirm('Are you sure you want to delete this category?')) {
    //   this.CATsvc.deleteDocument(this.data, collectionType.categories);
    //   this.updateRelatedTransactions('');
    //   this.dialogRef.close();
    // }
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

  close() {
    this.dialogRef.close();
  }


}
