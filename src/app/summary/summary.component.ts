import { Component, OnInit, OnDestroy } from '@angular/core';
import { DbService, tAction } from '../core/db.service';
import { combineLatest, Subscription } from 'rxjs';
import { ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment

interface reportCat {
  category: ICategory;
  transactions: ITransaction[];
}

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit, OnDestroy {

  constructor(private service: DbService) { }

  catsTrans: Subscription;
  income: number;
  spent: number;
  totalBudgeted: number;
  reportCats: reportCat[];
  incomeData: reportCat;

  ngOnInit() {
    
    this.catsTrans = combineLatest(this.service.categories, this.service.transactions).subscribe(([cats, trans]) => {

          if (cats.length === 0 || trans.length === 0) return;

          this.income = 0;
          this.spent = 0;

          this.reportCats = new Array();

          cats.map(c => {
            c.spent = 0;
            let cat: ICategory = c;
            let t: ITransaction[] = trans
                                      .filter(t => t.category === c.name)
                                      .map(t => {
                                        if (c.name === 'INCOME') {
                                          c.spent += (1 * +t.amount);
                                        }
                                        else {
                                          c.spent += (-1 * +t.amount);
                                        }
                                        return t;
                                      })
                                      .sort((a, b) => {
                                        return a.date > b.date ? 1 : -1;
                                      })
            cat.spent = +cat.spent.toFixed(2)
            this.reportCats.push({
              category: cat, 
              transactions: t
            });
          });

          //Pull out the income category
          this.incomeData = this.reportCats.find(x => x.category.name.toUpperCase() === 'INCOME');
          let tmpIncome = this.incomeData.transactions.map(t => t.amount).reduce((pv, v) => +pv + +v, 0);
          this.income = +tmpIncome.toFixed(2);
          this.reportCats.splice(this.reportCats.indexOf(this.incomeData), 1);

          this.spent = this.reportCats.map(c => c.category.spent).reduce((pv, v) => +pv + +v, 0); //Everything remaining is SPENT
          this.spent = +this.spent.toFixed(2);

          let tmp: number = this.reportCats.map(c => c.category.budgeted).reduce((pv, v) => +pv + +v, 0);
          this.totalBudgeted = +tmp.toFixed(2);
      }
    );

  }

  // getBarColor(spent, budgeted) {
  //   if (spent <= budgeted) {
  //     return colors.GREEN
  //   } else {
  //     return colors.RED
  //   }
  // }

  carryAmounts() {
    if (confirm("Are you sure?")) {
      let tmp:number = 0
      this.reportCats.filter(c => (c.category.budgeted - c.category.spent) != 0).map(c => {
        let m = this.service.monthYear.getValue();
        let d = new Date(`${m.split('/')[0]}/01/${m.split('/')[1]}`)
        let dPlus = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        let t = <ITransaction>{
            description: `${c.category.name} Starting Balance`, 
            amount: (c.category.budgeted-c.category.spent).toFixed(2), 
            category: c.category.name, 
            date: moment(dPlus).format('MM/DD/YYYY'),
            notes: "",
            status: ""
          }
        tmp += +t.amount;
        this.service.AddOrUpdateTransaction(t, tAction.add);
      })
    }
  }

  
  ngOnDestroy() {
    this.catsTrans.unsubscribe();
  }




}
