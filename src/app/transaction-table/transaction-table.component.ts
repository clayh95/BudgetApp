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
  filter = new BehaviorSubject<string>("")

  // firstDay, lastDay;


  constructor(private service: DbService,
              public dialog: MatDialog) {

    this.categories = this.service.categories;

    // var date = new Date();
    // this.firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // this.lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    //TODO: seems like we should just the the transactions for the selected monthYear
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
                                                      this.service,
                                                      this.filter);
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
    let t = <ITransaction>{date:"", description:"", amount:"", category:"", notes: ""}
    const dialogRef = this.dialog.open(AddTransactionComponent, {width:'800px', data: t})
  }

  deleteTransaction(id) {
    this.service.transactionCollection.doc(id).delete();
  }

  editTransaction(id) {
    let t:ITransaction
    this.service.transactionCollection.doc(id).ref.get().then(d => {
      const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1000px', data: <ITransaction>{id: d.id, ...d.data()}})
    })
  }

  applyFilter(filterValue: string) {
    this.filter.next(filterValue.trim().toLowerCase())
  }

  // updateBeginDate(event: MatDatepickerInputEvent<Date>) {
  //   this.dataSource.updateBeginDate(`${event.value}`)
  // }

  // updateEndDate(event: MatDatepickerInputEvent<Date>) {
  //   this.dataSource.updateEndDate(`${event.value}`)
  // }
}
