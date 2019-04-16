import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { MatPaginator, MatSort, MatDialog, MatDialogRef, MAT_DIALOG_DATA, Sort } from '@angular/material';
// import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import { TransactionTableDataSource } from './transaction-table-datasource';
import { DbService } from '../core/db.service';
import { Observable, BehaviorSubject } from '../../../node_modules/rxjs';
import { ICategory, ITransaction } from '../core/dataTypes';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component'

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss']
})
export class TransactionTableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: TransactionTableDataSource;
  displayedColumns = ['id', 'date', 'amount', 'description', 'notes', 'category'];
  filter = new BehaviorSubject<string>("")

  // firstDay, lastDay;

  constructor(public Tsvc: DbService,
              public dialog: MatDialog) {

  }

  ngOnInit() {
    this.dataSource = new TransactionTableDataSource(this.paginator, 
                                                      this.sort, 
                                                      this.Tsvc,
                                                      this.filter);
    this.sort.direction = "desc";
    this.sort.active = "date";
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
    let t = <ITransaction>{date:"", description:"", amount:"", category:"", notes: "", status:""}
    const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1200px', data: [t]})
  }

  deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.Tsvc.transactionCollection.doc(id).delete();
    }
  }

  editTransaction(id) {
    let t:ITransaction
    this.Tsvc.transactionCollection.doc(id).ref.get().then(d => {
      const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1600px', data: [<ITransaction>{id: d.id, ...d.data()}]})
    })
  }

  applyFilter(filterValue: string) {
    this.filter.next(filterValue.trim().toLowerCase())
  }
}
