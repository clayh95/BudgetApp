import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort } from '@angular/material';
import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import { TransactionTableDataSource } from './transaction-table-datasource';
import { DbService } from '../core/db.service';
import { Observable, BehaviorSubject } from '../../../node_modules/rxjs';
import { ICategory, ITransaction } from '../core/dataTypes';

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss']
})
export class TransactionTableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: TransactionTableDataSource;
  // firstDay;
  // lastDay;
  transactions = new BehaviorSubject<ITransaction[]>([{id:"", amount: "", category: "", date: "", description: ""}]);
  categories;

  displayedColumns = ['date', 'amount', 'description', 'category'];

  constructor(private service: DbService) {
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
        this.transactions.next( tmp );
      })
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

  // updateBeginDate(event: MatDatepickerInputEvent<Date>) {
  //   this.dataSource.updateBeginDate(`${event.value}`)
  // }

  // updateEndDate(event: MatDatepickerInputEvent<Date>) {
  //   this.dataSource.updateEndDate(`${event.value}`)
  // }

  TransactionCategoryChanged(id, value) {
    let tRef =  this.service.transactionCollection.doc(id);
    if (tRef) tRef.update({category: value});
  }

}
