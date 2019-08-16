import { Component, OnInit, OnDestroy } from '@angular/core';
import { DbService, tAction } from '../core/db.service';
import { combineLatest, Subscription } from 'rxjs';
import { ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import {default as _rollupMoment, Moment} from 'moment';
import { MatDialog } from '@angular/material';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { formatCurrency, getLocaleId } from '@angular/common';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
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

  constructor(private service: DbService, public dialog: MatDialog) { }

  catsTrans: Subscription;
  actualIncome: number;
  spent: number;
  totalBudgeted: number;
  reportCats: reportCat[];
  incomeData: reportCat;
  expandedPanel: string;

  ngOnInit() {
    
    this.catsTrans = combineLatest(this.service.categories, this.service.transactions).subscribe(([cats, trans]) => {

          if (cats.length === 0 || trans.length === 0) return;

          this.actualIncome = 0;
          this.spent = 0;

          this.reportCats = new Array();

          cats.map(c => {
            this.createReportCat(c, trans);
          });

          const uncategorized: ICategory = {id: '', name: '', budgeted: 0, spent: 0, keywords: []}

          this.createReportCat(uncategorized, trans);

          //Pull out the income category
          this.incomeData = this.reportCats.find(x => x.category.name.toUpperCase() === 'INCOME');
          if (this.incomeData) {
            let tmpIncome = this.incomeData.transactions.map(t => t.amount).reduce((pv, v) => +pv + +v, 0);
            this.actualIncome = +tmpIncome.toFixed(2);
            this.reportCats.splice(this.reportCats.indexOf(this.incomeData), 1);
          }

          this.spent = this.reportCats.map(c => c.category.spent).reduce((pv, v) => +pv + +v, 0); //Everything remaining is SPENT
          this.spent = +this.spent.toFixed(2);

          let tmp: number = this.reportCats.map(c => c.category.budgeted).reduce((pv, v) => +pv + +v, 0);
          this.totalBudgeted = +tmp.toFixed(2);
      }
    );

  }

  private createReportCat(c: ICategory, trans: ITransaction[]) {
    c.spent = 0;
    let cat: ICategory = c;
    let t: ITransaction[] = this.getTransactionsForCategory(trans, c);
    cat.spent = +cat.spent.toFixed(2);
    if (cat.name === '') { cat.name = 'Uncategorized'; }
    this.reportCats.push({
      category: cat,
      transactions: t
    });
  }

  private getTransactionsForCategory(trans: ITransaction[], c: ICategory): ITransaction[] {
    return trans
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
      });
  }

  getColor(item) {
    if (item.category.budgeted - item.category.spent < 0) {
      return 'red'
    } else {
      return 'green'
    }
  }

  getIncomeColor() {
    if (this.actualIncome - this.incomeData.category.budgeted < 0) {
      return 'red'
    } else {
      return 'green'
    }
  }

  getEmoji():string[] {
    if (this.actualIncome === this.totalBudgeted) {
      return ['Everything is balanced!','🙌'];
    } else if (this.actualIncome > this.totalBudgeted) {
      return [`We have ${formatCurrency(this.actualIncome - this.totalBudgeted, getLocaleId('en-US'), '','USD')}  we can still budget!`,'😃'];
    } else if (this.actualIncome < this.totalBudgeted){
      return [`We are overbudgeted by ${formatCurrency(this.totalBudgeted - this.actualIncome, getLocaleId('en-US'), '','USD')}`,'😬'];
    } else {
      return ['', ''];
    }
  }

  SetExpandedPanel(id: string) {
    this.expandedPanel = id;
  }
  
  editTransaction(t) {
    const dialogRef = this.dialog.open(AddTransactionComponent, {width:'1600px', data: [Object.assign({}, t)], autoFocus: false})
  }

  editCategory(event, c) {
    event.stopPropagation();
    const catDialogRef = this.dialog.open(CategoryModalComponent, {width:'1600px', data: Object.assign({}, c), autoFocus: false})
  }
  
  trackById(index, item) {
    return item.category.id;
  }

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
            status: "Posted"
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
