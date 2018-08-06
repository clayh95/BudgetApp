import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort } from '@angular/material';
import { CategoryTableDataSource } from './category-table-datasource';
import { DbService } from '../core/db.service';
import { BehaviorSubject } from 'rxjs';
import { ICategory } from '../core/dataTypes';

@Component({
  selector: 'app-category-table',
  templateUrl: './category-table.component.html',
  styleUrls: ['./category-table.component.scss']
})
export class CategoryTableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: CategoryTableDataSource;
  categories = new BehaviorSubject<ICategory[]>([{id: "", category:"", keyword:""}])

  displayedColumns = ['id', 'category', 'keyword'];

  constructor(private service: DbService) {
    this.service.categoryCollection.snapshotChanges().subscribe(actions => {
      let tmp = new Array();
       actions.map(a => {
        let data = <ICategory>a.payload.doc.data();
        let id = a.payload.doc.id;
        tmp.push({ id, ...data })
        this.categories.next( tmp );
      })
    })
  }

  ngOnInit() {
    this.dataSource = new CategoryTableDataSource(this.paginator, 
                                                  this.sort, 
                                                  this.categories);
  }

  addRow() {
    let newCategoryRef = this.service.categoryCollection.ref.doc();
    newCategoryRef.set({category:"", keyword: ""});
  }

  deleteRow(id) {
    this.service.categoryCollection.doc(id).delete();
  }

  categoryChanged(event) {
    let catRef =  this.service.categoryCollection.doc(event.target.name);
    if (catRef) catRef.update({category: event.target.value});
  }

  keywordChanged(event) {
    let keyRef =  this.service.categoryCollection.doc(event.target.name);
    if (keyRef) keyRef.update({keyword: event.target.value});

  }
}
