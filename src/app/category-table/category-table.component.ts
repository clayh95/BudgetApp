import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { CategoryTableDataSource } from './category-table-datasource';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
import { BehaviorSubject } from 'rxjs';
import { Chart } from 'Chart.js'


import { DbService } from '../core/db.service';
import { CopyCategoriesComponent } from '../copy-categories/copy-categories.component'

import * as firebase from 'firebase/app';
import { colors } from '../reports/reports.component';

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

  ngOnInit() {
    this.dataSource = new CategoryTableDataSource(this.paginator, 
                                                  this.sort, 
                                                  this.CATsvc.categories,
                                                  this.filter);
    this.sort.direction = "asc";
    this.sort.active = "category";

    this.CATsvc.categories.subscribe(cats => {
      if (this.BudgetChart) {this.BudgetChart.destroy()}
      cats = cats.filter(c => c.name.toLowerCase() != 'income')
      this.BudgetChart = new Chart('canvasBudget', {type: 'doughnut', options: {legend: {display: true}}})
      this.BudgetChart.data = {
        datasets: [{
          data: cats.map(c => c.budgeted),
          backgroundColor: cats.map((c, index) => colors[Object.keys(colors)[index]])
        }],
        labels: cats.map(c => c.name)
      };
      this.totalBudgeted = cats.map(c => c.budgeted).reduce((pv, v) => +pv + +v, 0);
      this.BudgetChart.update()
    })

  }

  addCategory() {
    let newCategoryRef = this.CATsvc.categoriesCollection.ref.doc();
    newCategoryRef.set({name: "", keywords: [], budgeted: null});
  }

  deleteCategory(id, name) {
    //TODO: Prompt here...
    this.CATsvc.categoriesCollection.doc(id).delete();
    this.updateRelatedTransactions(name, '')
  }

  updateRelatedTransactions(catName, value) {
    this.CATsvc.transactionCollection.ref.where("category","==",catName)
      .get()
      .then(d => {
        if (d.docs.length > 0) {
          d.docs.forEach(doc =>{
            this.CATsvc.transactionCollection.ref.doc(doc.id).update({category: value})
          })
        }
      })
  }

  valueChanged(event, id, colName) {
    let keyRef =  this.CATsvc.categoriesCollection.doc(id);
    let colUpdate = {};
    colUpdate[`${colName}`] = event.target.value;
    if (colName.toLowerCase() == 'name') {
      keyRef.ref.get().then(d => {
        this.updateRelatedTransactions(d.data().name, event.target.value) //We have to do this after the get promise returns here to make sure we get the oldvalue
        if (keyRef) keyRef.update(colUpdate)
      })
    }
    else {
      if (keyRef) keyRef.update(colUpdate)
    }
  }

  addKeyword(event: MatChipInputEvent, id): void {
    const input = event.input;
    const value = event.value;

    if ((value || '').trim()) {
      let keyRef =  this.CATsvc.categoriesCollection.doc(id);
      if (keyRef) keyRef.update({keywords: firebase.firestore.FieldValue.arrayUnion(value.trim())})
    }

    if (input) {
      input.value = '';
    }
  }

  removeKeyword(kw: string, id): void {
    let keyRef =  this.CATsvc.categoriesCollection.doc(id);
    if (keyRef) keyRef.update({keywords: firebase.firestore.FieldValue.arrayRemove(kw.trim())})
  }

  openCopyCategoryDialog() {
    const dialogRef = this.dialog.open(CopyCategoriesComponent, {width: '400px'})
  }

  applyFilter(filterValue: string) {
    this.filter.next(filterValue.trim().toLowerCase())
  }

}
