import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { MatPaginator, MatSort, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
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
  transactions = new BehaviorSubject<ITransaction[]>([{id:"", amount: "", category: "", date: "", description: "", notes: ""}]);
  categories;
  displayedColumns = ['id', 'date', 'amount', 'description', 'notes', 'category'];
  // firstDay, lastDay;


  constructor(private service: DbService,
              public dialog: MatDialog) {

    this.categories = this.service.categories;

    // var date = new Date();
    // this.firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // this.lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    this.service.transactionCollection.snapshotChanges().subscribe(actions => {
      let tmp = new Array();
       actions.map(a => {
        let data = <ITransaction>a.payload.doc.data();
        let id = a.payload.doc.id;
        tmp.push({ id, ...data })
      })
      this.transactions.next( tmp );
    })

  }

  ngOnInit() {
    this.dataSource = new TransactionTableDataSource(this.paginator, 
                                                      this.sort, 
                                                      this.transactions,
                                                      this.service);
    // this.dataSource.updateBeginDate(this.firstDay);
    // this.dataSource.updateEndDate(this.lastDay);
  }

  TransactionCategoryChanged(id, value) {
    let tRef =  this.service.transactionCollection.doc(id);
    if (tRef) tRef.update({category: value});
  }

  valueChanged(event, id, colName) {
    let keyRef =  this.service.transactionCollection.doc(id);
    let colUpdate = {};
    colUpdate[`${colName}`] = event.target.value;
    if (keyRef) keyRef.update(colUpdate);
  }


  
  addTransaction() {
    const dialogRef = this.dialog.open(AddTransactionComponent, {width:'800px'})
  }

  deleteTransaction(id) {
    this.service.transactionCollection.doc(id).delete();
  }

  // updateBeginDate(event: MatDatepickerInputEvent<Date>) {
  //   this.dataSource.updateBeginDate(`${event.value}`)
  // }

  // updateEndDate(event: MatDatepickerInputEvent<Date>) {
  //   this.dataSource.updateEndDate(`${event.value}`)
  // }
}
