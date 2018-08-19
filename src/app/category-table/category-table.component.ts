import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { CategoryTableDataSource } from './category-table-datasource';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';

import { DbService } from '../core/db.service';
import { CopyCategoriesComponent } from '../copy-categories/copy-categories.component'

// import { BehaviorSubject } from 'rxjs';
// import { map } from 'rxjs/operators';
// import { ICategory } from '../core/dataTypes';
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
                                                  this.service.categories);
  }

  addCategory() {
    let newCategoryRef = this.service.categoriesCollection.ref.doc();
    newCategoryRef.set({name: "", keywords: [], budgeted: null});
  }

  deleteCategory(id) {
    //TODO: Prompt here...
    //TODO: Clear categories for any transactions that had this category
    this.service.categoriesCollection.doc(id).delete();
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

}
