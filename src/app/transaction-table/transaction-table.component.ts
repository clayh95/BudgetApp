import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort } from '@angular/material';
import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import { TransactionTableDataSource } from './transaction-table-datasource';
import { DbService } from '../core/db.service';

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss']
})
export class TransactionTableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: TransactionTableDataSource;
  firstDay;
  lastDay;

  displayedColumns = ['date', 'amount', 'description', 'category'];

  constructor(private service: DbService) {
    var date = new Date();
    this.firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    this.lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  ngOnInit() {
    this.dataSource = new TransactionTableDataSource(this.paginator, 
                                                      this.sort, 
                                                      this.service.transactionCollection.valueChanges());
    this.dataSource.updateBeginDate(this.firstDay);
    this.dataSource.updateEndDate(this.lastDay);
  }

  updateBeginDate(event: MatDatepickerInputEvent<Date>) {
    this.dataSource.updateBeginDate(`${event.value}`)
  }

  updateEndDate(event: MatDatepickerInputEvent<Date>) {
    this.dataSource.updateEndDate(`${event.value}`)
  }

}
