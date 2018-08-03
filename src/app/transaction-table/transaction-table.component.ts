import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort } from '@angular/material';
import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import { TransactionTableDataSource } from './transaction-table-datasource';
import {DbService} from '../core/db.service';
import { map } from '../../../node_modules/rxjs/operators';
import { ITransaction } from '../core/dataTypes';
import { access } from 'fs';

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss']
})
export class TransactionTableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: TransactionTableDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['date', 'amount', 'description', 'category'];

  constructor(private service: DbService) {}

  ngOnInit() {
    this.dataSource = new TransactionTableDataSource(this.paginator, this.sort, this.service);
  }

  filterTable(event: MatDatepickerInputEvent<Date>) {
    console.log(`${event.value}`);
  }


  //val.map(tr => tr.amount).reduce((pv, v) => +pv + +v, 0)


}
