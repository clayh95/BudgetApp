import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map, startWith } from 'rxjs/operators';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { ICategory } from '../core/dataTypes';

export class CategoryTableDataSource extends DataSource<ICategory> {

  constructor(private paginator: MatPaginator, 
              private sort: MatSort, 
              private categories: Observable<ICategory[]>,
              private filter: BehaviorSubject<string>) {
    super();
  }

  connect(): Observable<ICategory[]> {
    const dataMutations = [
      this.categories,
      this.paginator.page.pipe(startWith(1)),
      this.sort.sortChange.pipe(startWith(0)),
      this.filter
    ];

    return combineLatest(...dataMutations).pipe(map((d) => {
      let val = <ICategory[]>d[0];
      let ret = this.getFilteredData(this.getSortedData([...val]), <string>d[3])
      this.paginator.length = val.length;
      return this.getPagedData(ret);
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
        case 'category': return compare(a.name, b.name, isAsc);
        default: return 0;
      }
    });
  }
  
  private getFilteredData(data: ICategory[], filter:string) {
    return data.filter(t => {
      return Object.values(t).filter(z => typeof z === 'string').map(v => v.toLowerCase().indexOf(filter)>=0).indexOf(true) >= 0
    })
  }
}



/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a, b, isAsc) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
