import { DataSource } from '@angular/cdk/collections';
import { MatPaginator, MatSort, Sort } from '@angular/material';
import { map, startWith } from 'rxjs/operators';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { ITransaction } from '../core/dataTypes';
import { DbService } from '../core/db.service';
import * as _ from "lodash";

/**
 * Data source for the TransactionTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class TransactionTableDataSource extends DataSource<ITransaction> {

  total:number;
  chargeCount:number;
  lastIDs:ITransaction[] = [];
  lastMY:string = '';
  // private beginDateChange = new BehaviorSubject<Date>(new Date('1/1/1900'))
  // private endDateChange = new BehaviorSubject<Date>(new Date('1/1/1900'))

  constructor(private paginator: MatPaginator, 
              private sort: MatSort, 
              // private transactions: Observable<ITransaction[]>,
              private service: DbService,
              private filter: BehaviorSubject<string>) {
    super();
  }

  connect(): Observable<ITransaction[]> {
    const dataMutations = [
      this.service.transactions,
      this.paginator.page.pipe(startWith(1)),
      this.sort.sortChange.pipe(startWith('0')),
      this.filter
    ];

    return combineLatest(...dataMutations).pipe(map((d) => {
      let val = <ITransaction[]>d[0];
      if (this.lastIDs.length > 0) { val = this.highlightUpserts(val); }
      this.lastIDs = val;
      this.lastMY = this.service.monthYear.getValue();
      let ret = this.getFilteredData(this.getSortedData([...val]), <string>d[3])
      this.paginator.length = ret.length;
      this.total = ret.map(tr => tr.amount).reduce((pv, v) => +pv + +v, 0);
      ret = this.getPagedData(ret);
      return ret;
    }));
  }

  disconnect() {}

  private highlightUpserts(ret: ITransaction[]): ITransaction[] {
    //start with just checking if exists
    if (this.lastMY !== this.service.monthYear.getValue()) { return ret; }
    return ret.map(t => {
      const compT = this.lastIDs.find(x => x.id === t.id);
      if (compT === undefined) {
        t.changeAction = 'added'
      } else if ( !_.isEqual( _.omit(compT, ['changeAction']), _.omit(t, ['changeAction'])) ) {
        t.changeAction = 'modified';
      }
      return t;
    })
  }

  private getPagedData(data: ITransaction[]) {
    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    return data.splice(startIndex, this.paginator.pageSize);
  }

  private getSortedData(data: ITransaction[]) {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort.direction === 'asc';
      switch (this.sort.active) {
        case 'date': return compare(a.date, b.date, isAsc);
        case 'amount': return compare(+a.amount, +b.amount, isAsc);
        case 'description': return compare(a.description, b.description, isAsc);
        case 'category': return compare(a.category, b.category, isAsc);
        case 'notes': return compare(a.notes, b.notes, isAsc);
        default: return 0;
      }
    });
  }

  private getFilteredData(data: ITransaction[], filter:string) {
    return data.filter(t => {
      return Object.values(t).map(v => v.toLowerCase().indexOf(filter)>=0).indexOf(true) >= 0
    })
  }
  
  // updateBeginDate(val) {
  //   this.beginDateChange.next(val);
  // }

  // updateEndDate(val) {
  //   this.endDateChange.next(val);
  // }
}


/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a, b, isAsc) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

