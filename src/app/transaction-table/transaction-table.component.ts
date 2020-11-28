import { Component, OnInit, ViewChild, Inject, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
// import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import { TransactionTableDataSource } from './transaction-table-datasource';
import { DbService } from '../core/db.service';
import { Observable, BehaviorSubject } from '../../../node_modules/rxjs';
import { ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component'
import { rowsEnterLeave, rowsColor } from '../animations/template.animations';

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss'],
  animations: [rowsEnterLeave, rowsColor]
})
export class TransactionTableComponent implements AfterViewInit  {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;
  dataSource: TransactionTableDataSource;
  displayedColumns = ['id', 'status', 'date', 'amount', 'description', 'notes', 'category'];
  filter = new BehaviorSubject<string>("");

  constructor(public Tsvc: DbService,
              public dialog: MatDialog) {

  }
  ngAfterViewInit(): void {
    this.dataSource = new TransactionTableDataSource(this.paginator, 
      this.sort, 
      this.Tsvc,
      this.filter);
    this.sort.direction = "desc";
    this.sort.active = "date";
  }

  ngOnInit() {
    
  }

  TransactionCategoryChanged(id, value) {
    let tRef =  this.Tsvc.transactionCollection.doc(id);
    if (tRef) tRef.update({category: value});
  }

  valueChanged(event, id, colName) {
    let keyRef =  this.Tsvc.transactionCollection.doc(id);
    let colUpdate = {};
    colUpdate[`${colName}`] = event.target.value;
    if (keyRef) keyRef.update(colUpdate);
  }

  addTransaction() {
    let t = <ITransaction>{date:"", description:"", amount:"", category:"", notes: "", status:ITransactionStatus.posted}
    const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1600px', maxWidth:'90vw', data: [t], autoFocus: false})
  }

  deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.Tsvc.transactionCollection.doc(id).delete();
    }
  }

  editTransaction(id) {
    let t:ITransaction
    this.Tsvc.transactionCollection.doc(id).ref.get().then(d => {
      const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1600px', maxWidth:'90vw', data: [<ITransaction>{id: d.id, ...d.data()}], autoFocus: false})
    })
  }

  applyFilter(filterValue: string) {
    this.filter.next(filterValue.trim().toLowerCase())
  }

  trackById(index, item) {
    return item.id;
  }

  rowsColorDone(row) {
    if (row.changeAction) {
      row.changeAction = '';
    }
  }

}
