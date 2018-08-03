import { DataSource } from '@angular/cdk/collections';
import { MatPaginator, MatSort } from '@angular/material';
import { map, startWith } from 'rxjs/operators';
import { Observable, of as observableOf, merge, combineLatest } from 'rxjs';
import {DbService} from '../core/db.service';
import { ITransaction } from '../core/dataTypes';
import { start } from 'repl';

/**
 * Data source for the TransactionTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class TransactionTableDataSource extends DataSource<ITransaction> {

  transactionData: Observable<ITransaction[]> //Ideally we can set this from wherever we need to - so we could pass a list of transactions before import
  total:number;

  constructor(private paginator: MatPaginator, private sort: MatSort, private service: DbService) {
    super();
    this.transactionData = this.service.transactionCollection.valueChanges();
  }

  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<ITransaction[]> {
    // Combine everything that affects the rendered data into one update
    // stream for the data-table to consume.
    const dataMutations = [
      this.transactionData,
      this.paginator.page.pipe(startWith(1)),
      this.sort.sortChange.pipe(startWith(0))
    ];

    return combineLatest(...dataMutations).pipe(map((d) => {
      let val = <ITransaction[]>d[0];
      this.paginator.length = val.length;
      let ret = this.getPagedData(this.getSortedData([...val]));
      this.total = ret.map(tr => tr.amount).reduce((pv, v) => +pv + +v, 0);
      return ret;
    }));
  }

  /**
   *  Called when the table is being destroyed. Use this function, to clean up
   * any open connections or free any held resources that were set up during connect.
   */
  disconnect() {}

  /**
   * Paginate the data (client-side). If you're using server-side pagination,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getPagedData(data: ITransaction[]) {
    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    return data.splice(startIndex, this.paginator.pageSize);
  }

  /**
   * Sort the data (client-side). If you're using server-side sorting,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getSortedData(data: ITransaction[]) {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort.direction === 'asc';
      switch (this.sort.active) {
        case 'date': return compare(a.date, b.date, isAsc);
        case 'amount': return compare(+a.amount, +b.amount, isAsc);
        case 'category': return compare(a.category, b.category, isAsc);
        // case 'id': return compare(+a.id, +b.id, isAsc);
        default: return 0;
      }
    });
  }
}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a, b, isAsc) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

