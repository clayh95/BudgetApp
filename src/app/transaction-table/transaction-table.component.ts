import { Component, OnInit, ViewChild, Inject, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
// import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import { TransactionTableDataSource } from './transaction-table-datasource';
import { DbService } from '../core/db.service';
import { Observable, BehaviorSubject } from '../../../node_modules/rxjs';
import { collectionType, ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { getIcon } from '../core/utilities';
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
  displayedColumns = ['id', 'date', 'info', 'amount', 'description', 'notes', 'category'];
  filter = new BehaviorSubject<string>("");
  bShowPending = new BehaviorSubject<boolean>(false);
  bShowStartingBalances = new BehaviorSubject<boolean>(false);
  bOnlyUncategorized = new BehaviorSubject<boolean>(false);
  bToggleFilter = new BehaviorSubject<boolean>(false);

  constructor(public Tsvc: DbService,
              public dialog: MatDialog) {

  }
  ngAfterViewInit(): void {
    this.dataSource = new TransactionTableDataSource(this.paginator, 
      this.sort, 
      this.Tsvc,
      this.filter,
      this.bShowPending,
      this.bShowStartingBalances,
      this.bOnlyUncategorized);
    this.sort.direction = "desc";
    this.sort.active = "date";
  }

  updateValueOnChange(newValue: string, id: string, columnName: string) {
    let t = <ITransaction>this.Tsvc.transactions.getValue().filter(t => t.id === id)[0];
    if (newValue === t[columnName]) { return; }
    let update = {};
    update[columnName] = newValue;
    this.Tsvc.updateDocument(id, collectionType.transactions, update);
  }

  addTransaction() {
    let t = <ITransaction>{date:"", description:"", amount:"", category:"", notes: "", status:ITransactionStatus.posted}
    const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1600px', maxWidth:'90vw', data: [t], autoFocus: false})
  }

  deleteTransaction(t:ITransaction) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.Tsvc.deleteDocument(t, collectionType.transactions);
    }
  }

  editTransaction(t:ITransaction) {
    this.Tsvc.getTransactionsForEdit(t).then(modalData => {
      const dialogRef = this.dialog.open(
        AddTransactionComponent, 
        {width:'1600px', maxWidth:'90vw', data: modalData, autoFocus: false}
      );
    });
  }

  applyFilter(filterValue: string) {
    this.filter.next(filterValue.trim().toLowerCase())
  }

  togglePendingVisibility() {
    this.bShowPending.next(!this.bShowPending.getValue());
  }

  toggleStartingBalanceVisibility() {
    this.bShowStartingBalances.next(!this.bShowStartingBalances.getValue());
  }

  toggleUncategorizedFilter() {
    this.bOnlyUncategorized.next(!this.bOnlyUncategorized.getValue());
  }

  toggleFilterMenu() {
    this.bToggleFilter.next(!this.bToggleFilter.getValue());
  }

  trackById(index, item) {
    return item.id;
  }

  rowsColorDone(row) {
    if (row.changeAction) {
      row.changeAction = '';
    }
  }

  getTotal():number {
    if (this.dataSource) {
      return this.dataSource.total;
    }
    return null;
  }

  getTotalColor():string {
    if (this.dataSource) {
      return this.dataSource.total > -1 ? 'mediumseagreen' : 'orangered';
    }
    return null;
  }

  getIconFromUtils(description:string):string {
    return getIcon(description);
  }

}
