import { Component, OnInit, OnDestroy } from '@angular/core';
import { DbService, tAction } from '../core/db.service';
import { combineLatest, Subscription } from 'rxjs';
import { ICategory, ITransaction } from '../core/dataTypes';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment

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
  reportCats: {"categories": ICategory[], "transactions": ITransaction[]};
  incomeData: ICategory;

  ngOnInit() {
    
    this.catsTrans = combineLatest(this.service.categories, this.service.transactions).subscribe(([cats, trans]) => {

          this.income = 0;
          this.spent = 0

          this.reportCats.categories = new Array(...cats)
          this.reportCats.categories.map(c => c.spent = 0)
          this.reportCats.categories.push({id:'', name:'Uncategorized', budgeted:0, spent:0, keywords:[]})

          trans.map(t => {
            if (t.category == '') {t.category = 'Uncategorized'}
            if (this.reportCats.categories.find(x => x.name == t.category)) {
              //Reverse the sign. That way negative charges are added to the total spent, and positive are subtracted
              //This accounts for returns, etc. within a category that you might not classify as income
              let tmp:number = this.reportCats.categories.find(x => x.name == t.category).spent;
              tmp += (-1 * +t.amount);
              this.reportCats.categories.find(x => x.name == t.category).spent = +tmp.toFixed(2);
            } else {
              console.log(`${t.category} not found`)
            }

            if (t.category.toUpperCase() == 'INCOME') {
              let tmp:number = this.income;
              tmp += +t.amount;
              this.income = +tmp.toFixed(2);
            }

          });
          
          //Pull out the income category
          this.incomeData = this.reportCats.categories.find(x => x.name.toUpperCase() == 'INCOME');
          this.reportCats.categories.splice(this.reportCats.categories.indexOf(this.incomeData), 1)

          this.spent = this.reportCats.categories.map(c => c.spent).reduce((pv, v) => +pv + +v, 0); //Everything remaining is SPENT
          this.spent = +this.spent.toFixed(2)

          let tmp: number = this.reportCats.categories.map(c => c.budgeted).reduce((pv, v) => +pv + +v, 0);
          this.totalBudgeted = +tmp.toFixed(2);


          this.reportCats.transactions = this.reportCats.(c => trans.filter(t => t.category == c.name))
          
          // this.ExpensesChart.config.options.tooltips.callbacks =  {
          //   afterBody: function(data) {
          //     let text = [];
          //     data.map(d => {
          //       trans.filter(t => t.category == d.xLabel[0]).map(t => {
          //         text.push(t.amount + ' ' + t.description)
          //       })
          //     })
          //     return text;
          //   }
          // }

          
          // if (this.incomeData) {
          //   this.IncomeChart.data.datasets.push({label: 'Expected', data:[this.incomeData.budgeted], backgroundColor: colors.GRAY})
          // }
          // this.IncomeChart.data.datasets.push({label: 'Total Budgeted', data:[this.totalBudgeted],  backgroundColor: colors.LIGHTBLUE})
          // this.IncomeChart.data.datasets.push({label: 'Actual', data:[this.income],  backgroundColor: this.getBarColor(this.totalBudgeted, this.income)})
          // this.IncomeChart.data.datasets.push({label: 'Spent', data:[this.spent],  backgroundColor: this.getBarColor(this.spent, this.income)})
          // this.IncomeChart.config.options.tooltips.callbacks =  {
          //   afterBody: function(data) {
          //     let text = [];
          //     data.map(d => {
          //       if (d.datasetIndex == 1) {
          //         cats.map(c => {
          //           text.push(c.budgeted + ' ' + c.name)
          //         })
          //       }
          //       else if (d.datasetIndex == 2) {
          //         trans.filter(t => t.category.toUpperCase() == 'INCOME').map(t => {
          //           text.push(t.amount + ' ' + t.description)
          //         })
          //       }
          //     })
          //     return text;
          //   }
          // }
      }
    )
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
      this.reportCats.categories.filter(c => (c.budgeted - c.spent) != 0).map(c => {
        let m = this.service.monthYear.getValue();
        let d = new Date(`${m.split('/')[0]}/01/${m.split('/')[1]}`)
        let dPlus = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        let t = <ITransaction>{
            description: `${c.name} Starting Balance`, 
            amount: (c.budgeted-c.spent).toFixed(2), 
            category: c.name, 
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
