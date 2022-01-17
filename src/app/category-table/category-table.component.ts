import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CategoryTableDataSource } from './category-table-datasource';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { BehaviorSubject } from 'rxjs';

import { DbService } from '../core/db.service';
import { CopyCategoriesComponent } from '../copy-categories/copy-categories.component'

import * as firebase from 'firebase/app';
import { collectionType, ICategory } from '../core/dataTypes';

@Component({
  selector: 'app-category-table',
  templateUrl: './category-table.component.html',
  styleUrls: ['./category-table.component.scss']
})
export class CategoryTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;
  dataSource: CategoryTableDataSource;

  displayedColumns = ['id', 'category', 'budgeted', 'keywords'];
  filter = new BehaviorSubject<string>("");

  totalBudgeted: number

  //CHIPS
  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  //CHIPS

  BudgetChart: Chart;
  BudgetConfig: Chart.ChartConfiguration = {};

  constructor(public CATsvc: DbService, public dialog: MatDialog) {}

  ngAfterViewInit() {
    this.dataSource = new CategoryTableDataSource(this.paginator, 
                                                  this.sort, 
                                                  this.CATsvc.categories,
                                                  this.filter);
    this.sort.direction = "asc";
    this.sort.active = "category";
  }

  addCategory() {
    let c = <ICategory>{name: "", keywords: [], budgeted: null}
    this.CATsvc.addDocument(c, collectionType.categories);
  }

  deleteCategory(category:ICategory) {
    if (confirm(`Are you sure you want to delete Category: ${category.name}`)) {
      this.CATsvc.deleteDocument(category, collectionType.categories);
      this.updateRelatedTransactions(category.name, '')
    }
  }

  async updateRelatedTransactions(oldName:string, newName:string) {
    if (oldName == "") { return }
    var querySnap = await this.CATsvc.getQuerySnapshot(collectionType.transactions, "category", "==", oldName);
    querySnap.docs?.forEach(doc => {
      this.CATsvc.updateDocument(doc.id, collectionType.transactions, {category: newName});
    });
  }

  async updateValueOnChange(newValue: string, id: string, columnName: string) {
    let t = <ICategory>this.CATsvc.categories.getValue().filter(t => t.id === id)[0];
    if (newValue === t[columnName]) { return; }
    let update = {};
    update[columnName] = newValue;
    await this.CATsvc.updateDocument(id, collectionType.categories, update);
    if (columnName.toLowerCase() == 'name') {
      // feels a bit hacky...
      this.updateRelatedTransactions(this.CATsvc.actionStack[0].previousData['name'], newValue);
    }
  }

  // valueChanged(event, id, colName) {
  //   let keyRef =  this.CATsvc.categoriesCollection.doc(id);
  //   let colUpdate = {};
  //   colUpdate[`${colName}`] = event.target.value;
  //   if (colName.toLowerCase() == 'name') {
  //     keyRef.ref.get().then(d => {
  //       //We have to do this after the get promise returns here to make sure we get the oldvalue
  //       this.updateRelatedTransactions(d.data().name, event.target.value) 
  //       if (keyRef) keyRef.update(colUpdate)
  //     })
  //   }
  //   else {
  //     if (keyRef) keyRef.update(colUpdate)
  //   }
  // }

  addKeyword(event: MatChipInputEvent, id: string) {
    const input = event.input;
    const value = event.value;

    if ((value || '').trim()) {
      this.CATsvc.updateDocument(
        id, 
        collectionType.categories, 
        {keywords: firebase.firestore.FieldValue.arrayUnion(value.trim())}
      );
    }

    if (input) {
      input.value = '';
    }
  }

  removeKeyword(kw: string, id: string) {
    this.CATsvc.updateDocument(
      id, 
      collectionType.categories, 
      {keywords: firebase.firestore.FieldValue.arrayRemove(kw.trim())}
    );
  }

  openCopyCategoryDialog() {
    const dialogRef = this.dialog.open(CopyCategoriesComponent, {width: '400px'})
  }

  applyFilter(filterValue: string) {
    this.filter.next(filterValue.trim().toLowerCase())
  }

}
