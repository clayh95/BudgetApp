import { DataSource } from '@angular/cdk/collections';
import { MatPaginator, MatSort } from '@angular/material';
import { map, startWith } from 'rxjs/operators';
import { Observable, combineLatest } from 'rxjs';
import { ICategory } from '../core/dataTypes';

export class CategoryTableDataSource extends DataSource<ICategory> {

  constructor(private paginator: MatPaginator, 
              private sort: MatSort, 
              private categories: Observable<ICategory[]>) {
    super();
  }

  connect(): Observable<ICategory[]> {
    const dataMutations = [
      this.categories,
      this.paginator.page.pipe(startWith(1)),
      this.sort.sortChange.pipe(startWith(0))
    ];

    return combineLatest(...dataMutations).pipe(map((d) => {
      let val = <ICategory[]>d[0];
      return this.getPagedData(this.getSortedData([...val]));
    }));
  }

  disconnect() {}

  private getPagedData(data: ICategory[]) {
    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    return data.splice(startIndex, this.paginator.pageSize);
  }

  private getSortedData(data: ICategory[]) {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort.direction === 'asc';
      switch (this.sort.active) {
        case 'category': return compare(a.category, b.category, isAsc);
        case 'keyword': return compare(a.keyword, b.keyword, isAsc);
        default: return 0;
      }
    });
  }
}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a, b, isAsc) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
