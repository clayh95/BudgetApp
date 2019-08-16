import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { DbService } from '../core/db.service';
import { MatDialogRef, MAT_DIALOG_DATA, MatChipInputEvent } from '@angular/material';
import { ICategory } from '../core/dataTypes';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { HasElementRef } from '@angular/material/core/typings/common-behaviors/color';

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
              @Inject(MAT_DIALOG_DATA) public data: ICategory) {

                this.origName = this.data.name;
                
                history.pushState(null, null, location.href);
               }

  Add() {
    let newCategoryRef = this.CATsvc.categoriesCollection.ref.doc();
    newCategoryRef.set({
      name: this.data.name, 
      keywords: this.data.keywords, 
      budgeted: this.data.budgeted
    });
    this.dialogRef.close();
  }

  Update() {
    let keyRef =  this.CATsvc.categoriesCollection.doc(this.data.id);
    if (keyRef) keyRef.update({
      "name": this.data.name,
      "budgeted": this.data.budgeted,
      "keywords": this.data.keywords
    }).then(() => {
      this.updateRelatedTransactions() //We have to do this after the get promise returns here to make sure we get the oldvalue
    });
    this.dialogRef.close();
  }

  Delete() {
    if (confirm('Are you sure you want to delete this category?')) {
      this.CATsvc.categoriesCollection.doc(this.data.id).delete();
      this.dialogRef.close();
    }
  }

  updateRelatedTransactions() {
    this.CATsvc.transactionCollection.ref.where("category","==",this.origName)
      .get()
      .then(d => {
        if (d.docs.length > 0) {
          d.docs.forEach(doc =>{
            this.CATsvc.transactionCollection.ref.doc(doc.id).update({category: this.data.name})
          })
        }
      })
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


}
