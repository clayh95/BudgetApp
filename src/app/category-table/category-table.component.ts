import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort } from '@angular/material';
import { CategoryTableDataSource } from './category-table-datasource';
import { DbService } from '../core/db.service';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ICategory } from '../core/dataTypes';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material';
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
  // categories = new BehaviorSubject<ICategory[]>([{id: "", name: "", keywords: [], budgeted: null}])

  displayedColumns = ['id', 'category', 'budgeted', 'keywords'];

  //CHIPS - TODO - Colorful chips?
  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  //CHIPS

  constructor(private service: DbService) {

  }

  ngOnInit() {
    this.dataSource = new CategoryTableDataSource(this.paginator, 
                                                  this.sort, 
                                                  this.service.categories);
  }

  addRow() {
    let newCategoryRef = this.service.categoriesCollection.ref.doc();
    newCategoryRef.set({name: "", keywords: [], budgeted: null});
  }

  deleteRow(id) {
    //TODO: Prompt here...
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

}
