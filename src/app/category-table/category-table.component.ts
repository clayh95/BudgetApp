import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { CategoryTableDataSource } from './category-table-datasource';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
import { BehaviorSubject } from 'rxjs';

import { DbService } from '../core/db.service';
import { CopyCategoriesComponent } from '../copy-categories/copy-categories.component'

import * as firebase from 'firebase/app';

@Component({
  selector: 'app-category-table',
  templateUrl: './category-table.component.html',
  styleUrls: ['./category-table.component.scss']
})
export class CategoryTableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: CategoryTableDataSource;

  displayedColumns = ['id', 'category', 'budgeted', 'keywords'];
  filter = new BehaviorSubject<string>("")

  //CHIPS - TODO - Colorful chips?
  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  //CHIPS

  constructor(private service: DbService, public dialog: MatDialog) {}

  ngOnInit() {
    this.dataSource = new CategoryTableDataSource(this.paginator, 
                                                  this.sort, 
                                                  this.service.categories,
                                                  this.filter);
    this.sort.direction = "asc";
    this.sort.active = "category";
  }

  addCategory() {
    let newCategoryRef = this.service.categoriesCollection.ref.doc();
    newCategoryRef.set({name: "", keywords: [], budgeted: null});
  }

  deleteCategory(id, name) {
    //TODO: Prompt here...
    this.service.categoriesCollection.doc(id).delete();
    this.service.transactionCollection.ref.where("category","==",name)
      .get()
      .then(d => {
        if (d.docs.length > 0) {
          d.docs.forEach(doc =>{
            this.service.transactionCollection.ref.doc(doc.id).update({category: ''})
          })
        }
      })
  }

  valueChanged(event, id, colName) {
    let keyRef =  this.service.categoriesCollection.doc(id);
    let colUpdate = {};
    colUpdate[`${colName}`] = event.target.value;
    if (keyRef) keyRef.update(colUpdate);
  }

  addKeyword(event: MatChipInputEvent, id): void {
    const input = event.input;
    const value = event.value;

    if ((value || '').trim()) {
      let keyRef =  this.service.categoriesCollection.doc(id);
      if (keyRef) keyRef.update({keywords: firebase.firestore.FieldValue.arrayUnion(value.trim())})
    }

    if (input) {
      input.value = '';
    }
  }

  removeKeyword(kw: string, id): void {
    let keyRef =  this.service.categoriesCollection.doc(id);
    if (keyRef) keyRef.update({keywords: firebase.firestore.FieldValue.arrayRemove(kw.trim())})
  }

  openCopyCategoryDialog() {
    const dialogRef = this.dialog.open(CopyCategoriesComponent, {width: '400px'})
  }

  applyFilter(filterValue: string) {
    this.filter.next(filterValue.trim().toLowerCase())
  }

}
