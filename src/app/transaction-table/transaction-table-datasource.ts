import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { map, startWith } from 'rxjs/operators';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { ITransaction, ITransactionStatus } from '../core/dataTypes';
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
              private filter: BehaviorSubject<string>,
              private bShowPending: BehaviorSubject<boolean>,
              private bShowStartingBalances: BehaviorSubject<boolean>,
              private bOnlyUncategorized: BehaviorSubject<boolean>
              ) {
    super();
  }

  connect(): Observable<ITransaction[]> {
    return combineLatest([
      this.service.transactions,
      this.paginator.page.pipe(startWith(1)),
      this.sort.sortChange.pipe(startWith('0')),
      this.filter.asObservable(),
      this.bShowPending.asObservable(),
      this.bShowStartingBalances.asObservable(),
      this.bOnlyUncategorized.asObservable()
    ]).pipe(map((d) => {
      let val = d[0] as unknown as ITransaction[];
      if (this.lastIDs.length > 0) { val = this.highlightUpserts(val); }
      this.lastIDs = val;
      this.lastMY = this.service.getMonthYearValue();
      let ret = this.getFilteredData(this.getSortedData([...val]), <string>d[3], <boolean>d[4], <boolean>d[5], <boolean>d[6]);
      this.paginator.length = ret.length;
      this.total = ret.map(tr => tr.amount).reduce((pv, v) => +pv + +v, 0);
      ret = this.getPagedData(ret);
      return ret;
    }));
  }

  disconnect() {}

  private highlightUpserts(ret: ITransaction[]): ITransaction[] {
    //start with just checking if exists
    if (this.lastMY !== this.service.getMonthYearValue()) { return ret; }
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

  private getFilteredData(data: ITransaction[], 
                          filter:string, 
                          bShowPending:boolean,
                          bShowStartingBalances:boolean,
                          bOnlyUncategorized:boolean
                          ) {
    return data.filter(t => {
      return Object.values(t).map(v => v?.toString().toLowerCase().indexOf(filter)>=0).indexOf(true) >= 0
        && (bShowPending || t.status == ITransactionStatus.posted)
        && (bShowStartingBalances || !t.description.endsWith('Starting Balance'))
        && (bOnlyUncategorized ? (t.category == '') : 1==1)
    })
  }
}


/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a, b, isAsc) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

